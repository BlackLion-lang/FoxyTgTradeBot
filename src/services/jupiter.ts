import { connection } from "../config/connection";
import {
    TransactionMessage,
    VersionedTransaction,
    PublicKey,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
    AddressLookupTableAccount,
} from "@solana/web3.js";
import axios from "axios";
import dotenv from "dotenv";
import { User } from "../models/user";
import bs58 from "bs58";
import { getTokenDecimal } from "../utils/getTokenInfo";
import { decryptSecretKey } from "../config/security";
import { getRecommendedMEVTip } from "./solana";
import { TippingSettings } from "../models/tipSettings";

dotenv.config();

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
const SWAP_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

function keypairFromDecryptedSecret(privateKeyBase64: string): Keypair {
    const secretKeyBytes = bs58.decode(privateKeyBase64);
    if (!(secretKeyBytes instanceof Uint8Array) || secretKeyBytes.length < 32) {
        throw new Error("Invalid private key bytes after decrypting.");
    }
    if (secretKeyBytes.length >= 64) {
        return Keypair.fromSecretKey(secretKeyBytes.slice(0, 64));
    }
    return Keypair.fromSecretKey(secretKeyBytes.slice(0, 32));
}

type BuildParams = {
    transactionBase64: string;
    quoteData: Record<string, unknown>;
    action: "buy" | "sell";
    active_wallet: string;
    adminWallet: PublicKey;
    adminFeePercent: number;
    includeMemo: boolean;
    memoText: string;
};

/**
 * Rebuild Jupiter v0 tx with optional memo + fee, sign, serialize.
 * Drops memo and retries caller when "encoding overruns" / oversized tx (common with dense routes).
 */
async function buildSignSerializeSwap(
    p: BuildParams,
    feeInstructionIn: TransactionInstruction | undefined,
    wallet: Keypair,
): Promise<{ serialized: Uint8Array; blockhash: string; lastValidBlockHeight: number }> {
    let feeInstruction = feeInstructionIn;
    const originalTx = VersionedTransaction.deserialize(Buffer.from(p.transactionBase64, "base64"));

    const resolvedLookupTables = await Promise.all(
        originalTx.message.addressTableLookups.map(async (lookup) => {
            const table = await connection.getAddressLookupTable(lookup.accountKey);
            return table.value;
        }),
    );

    const validLookupTables = resolvedLookupTables.filter((t): t is AddressLookupTableAccount => t !== null);
    if (validLookupTables.length !== resolvedLookupTables.length) {
        throw new Error("Failed to resolve all address lookup tables.");
    }

    if (p.action === "sell") {
        if (!feeInstruction) {
            const outAmountRaw = p.quoteData.outAmount ?? p.quoteData.outAmountLamports ?? p.quoteData.outAmountString;
            const estimatedSolOut = Number(outAmountRaw);
            if (Number.isNaN(estimatedSolOut)) {
                throw new Error("Could not parse quote outAmount for admin fee calculation.");
            }
            const adminFeeLamports = Math.floor(estimatedSolOut * p.adminFeePercent);
            feeInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(p.active_wallet),
                toPubkey: p.adminWallet,
                lamports: adminFeeLamports,
            });
        }
    }

    const decompiled = TransactionMessage.decompile(originalTx.message, {
        addressLookupTableAccounts: validLookupTables,
    });

    const baseInstructions = decompiled.instructions as TransactionInstruction[];

    const memoIx = new TransactionInstruction({
        keys: [],
        programId: MEMO_PROGRAM,
        data: Buffer.from(p.memoText, "utf8"),
    });

    const instructionList: TransactionInstruction[] = p.includeMemo
        ? p.action === "buy"
            ? [memoIx, ...(feeInstruction ? [feeInstruction] : []), ...baseInstructions]
            : [memoIx, ...baseInstructions, ...(feeInstruction ? [feeInstruction] : [])]
        : p.action === "buy"
          ? [...(feeInstruction ? [feeInstruction] : []), ...baseInstructions]
          : [...baseInstructions, ...(feeInstruction ? [feeInstruction] : [])];

    const latestBlockhash = await connection.getLatestBlockhash("finalized");

    const updatedMessage = new TransactionMessage({
        payerKey: new PublicKey(p.active_wallet),
        recentBlockhash: latestBlockhash.blockhash,
        instructions: instructionList,
    });

    const compiledV0 = updatedMessage.compileToV0Message();
    const lookupTableAccounts = await Promise.all(
        compiledV0.addressTableLookups.map(async (l) => {
            const table = await connection.getAddressLookupTable(l.accountKey);
            return table.value;
        }),
    );

    const finalLookupTables = lookupTableAccounts.filter((t): t is AddressLookupTableAccount => t !== null);
    const finalV0Message = updatedMessage.compileToV0Message(finalLookupTables);
    const rebuiltTx = new VersionedTransaction(finalV0Message);

    rebuiltTx.sign([wallet]);

    const serialized = rebuiltTx.serialize();
    if (serialized.length > 1232) {
        throw new Error(`Transaction too large: ${serialized.length} bytes (max 1232)`);
    }

    return {
        serialized,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    };
}

export async function swapToken(
    userId: number,
    active_wallet: string,
    tokenAddress: string,
    tokenPercent: number,
    action: string,
    slippage?: number,
    fee?: number,
    tokenAmount?: number,
): Promise<{ success: boolean; error?: string; signature?: string }> {
    try {
        const settings = await TippingSettings.findOne();
        if (!settings) throw new Error("Tipping settings not found!");
        if (!settings.adminSolAddress?.publicKey) {
            throw new Error("Admin Solana address is not configured.");
        }

        const user = await User.findOne({ userId });
        if (!user) throw new Error("No User");

        const adminWallet = new PublicKey(settings.adminSolAddress.publicKey);
        let adminFeePercent: number;
        if (user.userId === 7994989802 || user.userId === 2024002049) {
            adminFeePercent = 0;
        } else {
            adminFeePercent = settings.feePercentage / 100;
        }
        const memoText = "Trade via FoxyBoTracker";
        const MEVFee = await getRecommendedMEVTip(user.settings.auto_tip);

        if (!active_wallet || !tokenAddress || !tokenPercent || !action) {
            throw new Error("Invalid parameters for token swap.");
        }

        const tokenDecimal = await getTokenDecimal(tokenAddress);
        let inputMint: string;
        let outputMint: string;
        let amount: number;
        let feeInstructionBuy: TransactionInstruction | undefined;

        if (action === "buy") {
            const originalLamports = Math.floor(tokenPercent * LAMPORTS_PER_SOL);
            const adminFeeLamports = Math.floor(originalLamports * adminFeePercent);
            const adjustLamports = originalLamports - adminFeeLamports;

            feeInstructionBuy = SystemProgram.transfer({
                fromPubkey: new PublicKey(active_wallet),
                toPubkey: adminWallet,
                lamports: adminFeeLamports,
            });

            inputMint = "So11111111111111111111111111111111111111112";
            outputMint = tokenAddress;
            amount = adjustLamports;
        } else if (action === "sell") {
            if (tokenAmount == null || tokenAmount <= 0) {
                throw new Error("Missing or invalid tokenAmount for sell action.");
            }
            const tokenUnits = Math.floor((tokenAmount * tokenPercent * 10 ** tokenDecimal) / 100);

            inputMint = tokenAddress;
            outputMint = "So11111111111111111111111111111111111111112";
            amount = tokenUnits;
        } else {
            throw new Error("Unsupported action. Use 'buy' or 'sell'.");
        }

        const encrypted = user.wallets.find((w) => w.is_active_wallet)?.secretKey;
        if (!encrypted) throw new Error("No active wallet secret found for user.");

        const privateKeyBase64 = decryptSecretKey(encrypted);
        if (!privateKeyBase64) {
            throw new Error("Failed to decrypt private key. Check password/secret.");
        }

        const wallet = keypairFromDecryptedSecret(privateKeyBase64);

        const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote`;
        let lastError = "Swap failed";

        for (let attempt = 1; attempt <= SWAP_ATTEMPTS; attempt++) {
            try {
                const quoteResponse = await axios.get(quoteUrl, {
                    params: {
                        inputMint,
                        outputMint,
                        amount,
                        slippageBps: slippage,
                        restrictIntermediateTokens: true,
                    },
                    headers: { Accept: "application/json" },
                    timeout: 25_000,
                });

                const quoteData = quoteResponse.data as Record<string, unknown>;
                if (!quoteData || typeof quoteData !== "object") {
                    throw new Error("Failed to retrieve quote from Jupiter.");
                }

                const swapResponse = await axios.post(
                    "https://lite-api.jup.ag/swap/v1/swap",
                    {
                        quoteResponse: quoteData,
                        userPublicKey: new PublicKey(active_wallet).toString(),
                        dynamicComputeUnitLimit: true,
                        dynamicSlippage: !!user?.settings.mev,
                        computeUnitPriceMicroLamports: user?.settings.mev
                            ? Number(fee) > 0.1
                                ? MEVFee
                                : fee
                            : fee,
                    },
                    { headers: { "Content-Type": "application/json" }, timeout: 30_000 },
                );

                const swapData = swapResponse.data as { swapTransaction?: string };
                const transactionBase64 = swapData?.swapTransaction;
                if (!transactionBase64) {
                    console.error("Jupiter swap response:", swapData);
                    throw new Error("Failed to get swap transaction from Jupiter.");
                }

                const buildBase = {
                    transactionBase64,
                    quoteData,
                    action: action as "buy" | "sell",
                    active_wallet,
                    adminWallet,
                    adminFeePercent,
                    memoText,
                };

                let serialized: Uint8Array;
                let bh: string;
                let lvh: number;

                try {
                    ({ serialized, blockhash: bh, lastValidBlockHeight: lvh } = await buildSignSerializeSwap(
                        { ...buildBase, includeMemo: true },
                        action === "buy" ? feeInstructionBuy : undefined,
                        wallet,
                    ));
                } catch (e1) {
                    const m1 = errMsg(e1);
                    if (
                        m1.includes("encoding overruns") ||
                        m1.includes("too large") ||
                        m1.includes("1232")
                    ) {
                        ({ serialized, blockhash: bh, lastValidBlockHeight: lvh } = await buildSignSerializeSwap(
                            { ...buildBase, includeMemo: false },
                            action === "buy" ? feeInstructionBuy : undefined,
                            wallet,
                        ));
                    } else {
                        throw e1;
                    }
                }

                const sendOptions = {
                    skipPreflight: process.env.SKIP_PREFLIGHT === "true",
                    maxRetries: 5,
                };
                const signature = await connection.sendRawTransaction(serialized, sendOptions);

                const confirmation = await connection.confirmTransaction(
                    {
                        signature,
                        blockhash: bh,
                        lastValidBlockHeight: lvh,
                    },
                    "confirmed",
                );

                if (confirmation.value.err) {
                    throw new Error(
                        `Transaction failed: ${JSON.stringify(confirmation.value.err)}\nhttps://solscan.io/tx/${signature}/`,
                    );
                }

                console.log(`Transaction successful: https://solscan.io/tx/${signature}/`);
                return { success: true, signature };
            } catch (e) {
                lastError = errMsg(e);
                console.error(`swapToken attempt ${attempt}/${SWAP_ATTEMPTS}:`, lastError);
                if (attempt >= SWAP_ATTEMPTS) {
                    return { success: false, error: lastError };
                }
                await sleep(RETRY_DELAY_MS * attempt);
            }
        }

        return { success: false, error: lastError };
    } catch (error) {
        const msg = errMsg(error);
        console.error("ErrorMessage swapping token:", msg);
        return { success: false, error: msg };
    }
}
