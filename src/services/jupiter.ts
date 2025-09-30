import { connection } from "../config/connection";
import {
    TransactionMessage,
    VersionedTransaction,
    PublicKey,
    Keypair,
    Transaction,
    SystemProgram,
    LAMPORTS_PER_SOL,
    TransactionInstruction,
    AddressLookupTableAccount,
    ComputeBudgetProgram,
    SignatureStatusConfig
} from "@solana/web3.js";
import axios from "axios";
import dotenv from "dotenv";
import { User } from "../models/user";
import bs58 from "bs58";
import { getTokenInfo } from "./dexscreener";
import { getTokenDecimal } from "../utils/getTokenInfo";
import { ALL_PROGRAM_ID, publicKey } from "@raydium-io/raydium-sdk-v2";
import { lookup } from "node:dns";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array } from "../config/security";
import { getRecommendedMEVTip } from "./solana";
import { TippingSettings } from "../models/tipSettings";

dotenv.config();

export async function swapToken(
    userId: number,
    active_wallet: string,
    tokenAddress: string, // Token address to swap to
    tokenPercent: number, // Amount of SOL on buy, Percent of on Sell
    action: string, // Action type (e.g., "buy")
    slippage?: number,
    fee?: number,
    tokenAmount?: number
): Promise<{ success: boolean; error?: string; signature?: string }> {
    try {
        const settings = await TippingSettings.findOne();
        if (!settings) throw new Error("Tipping settings not found!");

        const user = await User.findOne({ userId });
        if (!user) throw "No User";

        const adminWallet = new PublicKey(settings.adminSolAddress.publicKey);
        let adminFeePercent;
        if (user.userId === 7994989802 || user.userId === 2024002049) {
            adminFeePercent = 0;
        } else {
            adminFeePercent = settings.feePercentage / 100;
        }
        const memoText = "Trade via FoxyBoTracker"
        const MEVFee = await getRecommendedMEVTip(user.settings.auto_tip);

        // Validate the input parameters
        if (!active_wallet || !tokenAddress || !tokenPercent || !action) {
            throw new Error("Invalid parameters for token swap.");
        }
        const tokenDecimal = await getTokenDecimal(tokenAddress)
        let inputMint: string;
        let outputMint: string;
        let amount: number;
        let feeInstruction;

        if (action === "buy") {
            const originalLamports = Math.floor(tokenPercent * LAMPORTS_PER_SOL);
            const adminFeeLamports = Math.floor(originalLamports * adminFeePercent);
            const adjustLamports = originalLamports - adminFeeLamports;

            feeInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(active_wallet),
                toPubkey: adminWallet,
                lamports: adminFeeLamports
            });

            inputMint = "So11111111111111111111111111111111111111112";
            outputMint = tokenAddress;
            amount = adjustLamports;

        } else if (action === "sell") {
            if (tokenAmount == null || tokenAmount <= 0) {
                throw new Error("Missing or invalid tokenAmount for sell action.");
            }
            const tokenUnits = Math.floor(tokenAmount * tokenPercent * 10 ** tokenDecimal / 100);

            inputMint = tokenAddress;
            outputMint = "So11111111111111111111111111111111111111112";
            amount = tokenUnits
        } else {
            throw new Error("Unsupported action. Use 'buy' or 'sell'.");
        }

        // console.log("buy1");
        const quoteUrl = `https://lite-api.jup.ag/swap/v1/quote`;

        const quoteResponse = await axios.get(quoteUrl, {
            params: {
                inputMint, // Determined by action type
                outputMint, // Determined by action type
                amount, // Amount in lamports
                slippageBps: slippage, // Slippage tolerance (e.g., 0.5%)
                restrictIntermediateTokens: true, // Restrict to direct swaps
            },
            headers: {
                Accept: "application/json",
            },
        });
        const quoteData = quoteResponse.data;
        if (!quoteData) throw new Error("Failed to retrieve quote from Jupiter.");

        // Jupiter API endpoint for executing the swap
        const swapUrl = `https://lite-api.jup.ag/swap/v1/swap`;

        // Execute the swap and get the transaction instructions
        console.log("buy2");

        const swapResponse = await axios.post(
            "https://lite-api.jup.ag/swap/v1/swap",
            {
                quoteResponse: quoteData,
                userPublicKey: new PublicKey(active_wallet).toString(),
                dynamicComputeUnitLimit: true,
                dynamicSlippage: !!user?.settings.mev,
                computeUnitPriceMicroLamports: user?.settings.mev ? (Number(fee) > 0.1 ? MEVFee : fee) : fee,
            },
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("buy3");
        const swapData = await swapResponse.data;

        const transactionBase64: string | undefined = swapData?.swapTransaction;

        if (!transactionBase64) {
            console.error("Jupiter swap response:", swapData);
            throw new Error("Failed to get swap transaction from Jupiter.");
        }

        const originalTx = VersionedTransaction.deserialize(
            Buffer.from(transactionBase64, "base64"),
        );


        // Resolve address table lookups manually
        const resolvedLookupTables = await Promise.all(
            originalTx.message.addressTableLookups.map(async (lookup) => {
                const table = await connection.getAddressLookupTable(lookup.accountKey);
                return table.value;
            })
        );

        // If sell, calculate output fee and inject SOL transfer
        if (action === "sell") {
            const outAmountRaw = quoteData.outAmount ?? quoteData.outAmountLamports ?? quoteData.outAmountString;
            const estimatedSolOut = Number(outAmountRaw);
            if (Number.isNaN(estimatedSolOut)) {
                throw new Error("Could not parse quote outAmount for admin fee calculation.");
            }
            const adminFeeLamports = Math.floor(estimatedSolOut * adminFeePercent);
            feeInstruction = SystemProgram.transfer({
                fromPubkey: new PublicKey(active_wallet),
                toPubkey: adminWallet,
                lamports: adminFeeLamports,
            });
        }

        // Filter out null values from resolved lookup tables
        const validLookupTables = resolvedLookupTables.filter((t): t is AddressLookupTableAccount => t !== null);

        if (validLookupTables.length !== resolvedLookupTables.length) {
            throw new Error("Failed to resolve all address lookup tables.");
        }

        //Decompile the original transaction message
        const decompiled = TransactionMessage.decompile(originalTx.message, {
            addressLookupTableAccounts: validLookupTables,
        });

        const memoIx = new TransactionInstruction({
            keys: [],
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
            data: Buffer.from(memoText, "utf8"),
        });

        const baseInstructions: TransactionInstruction[] = decompiled.instructions as TransactionInstruction[];

        const instructionList: TransactionInstruction[] =
            action === "buy"
                ? [memoIx, ...(feeInstruction ? [feeInstruction] : []), ...baseInstructions]
                : [memoIx, ...baseInstructions, ...(feeInstruction ? [feeInstruction] : [])];

        console.log("buy4");

        // Build an updated message with payer and blockhash placeholder
        const latestBlockhash = await connection.getLatestBlockhash("finalized");
        const updatedMessage = new TransactionMessage({
            payerKey: new PublicKey(active_wallet),
            recentBlockhash: latestBlockhash.blockhash,
            instructions: instructionList,
        });

        // compile to v0 message and re-resolve lookup tables for this compiled message
        const compiledV0 = updatedMessage.compileToV0Message();
        const lookupTableAccounts = await Promise.all(
            compiledV0.addressTableLookups.map(async (l) => {
                const table = await connection.getAddressLookupTable(l.accountKey);
                return table.value;
            })
        );

        const finalLookupTables = lookupTableAccounts.filter((t): t is AddressLookupTableAccount => t !== null);

        const finalV0Message = updatedMessage.compileToV0Message(finalLookupTables);
        const rebuiltTx = new VersionedTransaction(finalV0Message);

        console.log("buy5");

        // get encrypted secret from user wallets (make sure your decrypt function takes a key not hardcoded "password")
        const encrypted = user.wallets.find((w) => w.is_active_wallet)?.secretKey;
        if (!encrypted) throw new Error("No active wallet secret found for user.");

        const privateKeyBase64 = decryptSecretKey(encrypted, "password");
        if (!privateKeyBase64) {
            throw new Error("Failed to decrypt private key. Check password/secret.");
        }

        const secretKeyBytes = bs58.decode(privateKeyBase64);
        if (!(secretKeyBytes instanceof Uint8Array) || secretKeyBytes.length < 32) {
            throw new Error("Invalid private key bytes after decrypting.");
        }
        console.log("Decoded key length:", secretKeyBytes.length);
        console.log("First 16 bytes:", Array.from(secretKeyBytes.slice(0, 16)));

        const wallet = Keypair.fromSecretKey(secretKeyBytes);
        console.log("buy6");
        rebuiltTx.sign([wallet]);

        const serialized = rebuiltTx.serialize();
        const sendOptions = {
            skipPreflight: process.env.SKIP_PREFLIGHT === "true", // make this configurable
            maxRetries: 5,
        };
        const signature = await connection.sendRawTransaction(serialized, sendOptions);

        console.log("buy7");

        // confirm with same blockhash we used
        const latest = await connection.getLatestBlockhash("finalized");
        const confirmation = await connection.confirmTransaction(
            {
                signature,
                blockhash: latest.blockhash,
                lastValidBlockHeight: latest.lastValidBlockHeight,
            },
            "confirmed"
        );

        console.log("buy8");
        console.log("debug signature", confirmation);
        if (confirmation.value.err) {
            throw new Error(
                `Transaction failed: ${JSON.stringify(confirmation.value.err)}\nhttps://solscan.io/tx/${signature}/`,
            );
        } 

        console.log(`Transaction successful: https://solscan.io/tx/${signature}/`);

        return { success: true, signature: signature };
    } catch (error) {
        // console.log('debug error', error)
        console.error("ErrorMessage swapping token:", (error as Error).message);
        return { success: false, error: (error as Error).message };
    }
}
