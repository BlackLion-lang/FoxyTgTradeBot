/**
 * Solana swaps via Jupiter Lite API:
 * 1) Prefer **versioned** (v0) quotes/swap — no `asLegacyTransaction` — so Jupiter can use ALTs and
 *    multi-hop routes (typical for new pump.fun tokens). Legacy-only routes are a strict subset.
 * 2) Fallback: legacy swap (`asLegacyTransaction`) when versioned fails or RPC rejects the tx.
 * 3) If Lite fails, **Jupiter v6** on `api.jup.ag` then `quote-api.jup.ag` (DNS fallback). Env: `JUPITER_V6_BASE`.
 * 4) After a successful swap, optional admin fee as a separate legacy `SystemProgram.transfer`,
 *    clamped so the wallet stays at/above native account minimum rent (+ small tx-fee buffer).
 */
import { connection } from "../config/connection";
import {
    Transaction,
    TransactionInstruction,
    TransactionMessage,
    PublicKey,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    VersionedTransaction,
    AddressLookupTableAccount,
} from "@solana/web3.js";
import axios, { isAxiosError } from "axios";
import dotenv from "dotenv";
import { User } from "../models/user";
import bs58 from "bs58";
import { getTokenDecimal } from "../utils/getTokenInfo";
import { decryptSecretKey } from "../config/security";
import { getRecommendedMEVTip } from "./solana";
import { TippingSettings } from "../models/tipSettings";

dotenv.config();

const JUPITER_LITE_SWAP_V1 = "https://lite-api.jup.ag/swap/v1";
/** v6: `api.jup.ag` often resolves when `quote-api.jup.ag` fails DNS (ENOTFOUND). Override with JUPITER_V6_BASE. */
function jupiterV6Bases(): string[] {
    const fromEnv = process.env.JUPITER_V6_BASE?.replace(/\/$/, "");
    const bases = [
        fromEnv || "https://api.jup.ag/v6",
        "https://api.jup.ag/v6",
        "https://quote-api.jup.ag/v6",
    ];
    return [...new Set(bases)];
}
const WSOL_MINT = "So11111111111111111111111111111111111111112";

const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");
/** Serialized legacy transaction size limit (Solana packet / default RPC). */
const MAX_LEGACY_TX_BYTES = 1232;
const SWAP_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

/**
 * Headroom so after `transfer(lamports)` the fee payer still pays this tx's network fee
 * and stays at/above rent-exempt minimum (simulation otherwise: insufficient funds for rent).
 */
const TX_FEE_BUFFER_LAMPORTS = 22_000;

/** After swap, RPC balance can lag; brief retries before giving up on the fee transfer. */
const ADMIN_FEE_BALANCE_RETRIES = 3;
const ADMIN_FEE_RETRY_DELAY_MS = 450;

let cachedRentReserveLamports: number | null = null;

async function getNativeAccountRentReserveLamports(): Promise<number> {
    if (cachedRentReserveLamports != null) return cachedRentReserveLamports;
    cachedRentReserveLamports = await connection.getMinimumBalanceForRentExemption(0);
    return cachedRentReserveLamports;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function errMsg(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
}

/** Jupiter expects basis points (e.g. 100 = 1%). */
function normalizeSlippageBps(slippage?: number): number {
    const n =
        slippage == null || Number.isNaN(Number(slippage)) ? 100 : Math.round(Number(slippage));
    return Math.max(1, Math.min(10_000, n));
}

function formatAxiosError(e: unknown): string {
    if (!isAxiosError(e)) return errMsg(e);
    const status = e.response?.status;
    const data = e.response?.data;
    const body =
        data == null
            ? ""
            : typeof data === "string"
              ? data
              : JSON.stringify(data);
    return `HTTP ${status ?? "?"} ${e.message}${body ? ` — ${body.slice(0, 500)}` : ""}`;
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

function isLikelyDnsOrNetworkFailure(e: unknown): boolean {
    const m = errMsg(e);
    return (
        m.includes("ENOTFOUND") ||
        m.includes("EAI_AGAIN") ||
        m.includes("getaddrinfo") ||
        m.includes("ECONNREFUSED") ||
        m.includes("ETIMEDOUT")
    );
}

/**
 * Same pattern as legacy bot: decompile Jupiter v0 tx, insert memo + optional admin SOL transfer, recompile & sign.
 * Returns null if ALT resolution / decompile fails — caller falls back to signing Jupiter’s tx as-is.
 */
async function tryRebuildVersionedSwapWithMemoAndFee(
    transactionBase64: string,
    action: string,
    memoText: string,
    activePk: PublicKey,
    adminWallet: PublicKey,
    adminFeeLamports: number,
    wallet: Keypair,
): Promise<Uint8Array | null> {
    try {
        const originalTx = VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));
        const resolvedLookupTables = await Promise.all(
            originalTx.message.addressTableLookups.map(async (lookup) => {
                const table = await connection.getAddressLookupTable(lookup.accountKey);
                return table.value;
            }),
        );
        const validLookupTables = resolvedLookupTables.filter((t): t is AddressLookupTableAccount => t !== null);
        if (validLookupTables.length !== resolvedLookupTables.length) {
            return null;
        }

        const decompiled = TransactionMessage.decompile(originalTx.message, {
            addressLookupTableAccounts: validLookupTables,
        });

        const memoIx = new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM,
            data: Buffer.from(memoText, "utf8"),
        });

        const feeIx =
            adminFeeLamports > 0
                ? SystemProgram.transfer({
                      fromPubkey: activePk,
                      toPubkey: adminWallet,
                      lamports: adminFeeLamports,
                  })
                : undefined;

        const baseInstructions = decompiled.instructions as TransactionInstruction[];
        const instructionList: TransactionInstruction[] =
            action === "buy"
                ? [memoIx, ...(feeIx ? [feeIx] : []), ...baseInstructions]
                : [memoIx, ...baseInstructions, ...(feeIx ? [feeIx] : [])];

        const latestBlockhash = await connection.getLatestBlockhash("finalized");
        const updatedMessage = new TransactionMessage({
            payerKey: activePk,
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
        return rebuiltTx.serialize();
    } catch (e) {
        console.warn("[jupiter] Classic v0 rebuild failed; using raw Jupiter tx:", errMsg(e));
        return null;
    }
}

/**
 * Max SOL we can send out in the follow-up fee tx while keeping the wallet rent-exempt + tx buffer.
 */
async function clampFeeLamports(balanceLamports: number, requestedFeeLamports: number): Promise<number> {
    if (requestedFeeLamports <= 0) return 0;
    const reserve = await getNativeAccountRentReserveLamports();
    const maxSend = balanceLamports - reserve - TX_FEE_BUFFER_LAMPORTS;
    if (maxSend <= 0) return 0;
    return Math.min(requestedFeeLamports, Math.floor(maxSend));
}

/**
 * Deserialize Jupiter swap as legacy (`asLegacyTransaction` on quote + swap).
 * Optional memo is **appended** after Jupiter (never prepended): prepending ran before the swap
 * and caused "insufficient funds for rent" on intermediate accounts during simulation.
 * Blockhash refreshed; signed.
 */
function signLegacyJupiterSwap(
    transactionBase64: string,
    wallet: Keypair,
    includeMemo: boolean,
    memoText: string,
    recentBlockhash: string,
): Transaction {
    const tx = Transaction.from(Buffer.from(transactionBase64, "base64"));
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = recentBlockhash;

    if (includeMemo) {
        const memoIx = new TransactionInstruction({
            keys: [],
            programId: MEMO_PROGRAM,
            data: Buffer.from(memoText, "utf8"),
        });
        tx.instructions.push(memoIx);
    }

    tx.sign(wallet);
    return tx;
}

function isLegacyTxTooLargeError(message: string): boolean {
    return (
        message.includes("encoding overruns") ||
        message.includes("too large") ||
        message.includes(String(MAX_LEGACY_TX_BYTES))
    );
}

/**
 * Second transaction: native SOL transfer to `adminWallet`. Legacy tx, no ALTs.
 * Skips or reduces fee if post-swap balance would drop below rent reserve + fee-tx buffer.
 * (Swap priority fees reduce SOL; if the wallet was tight, the follow-up may send partial or skip.)
 */
async function sendAdminFeeAfterSwap(
    wallet: Keypair,
    adminWallet: PublicKey,
    feeLamportsRequested: number,
): Promise<string | undefined> {
    if (feeLamportsRequested <= 0) return undefined;

    const reserve = await getNativeAccountRentReserveLamports();
    let balance = await connection.getBalance(wallet.publicKey, "finalized");
    let feeLamports = await clampFeeLamports(balance, feeLamportsRequested);

    for (let r = 1; r < ADMIN_FEE_BALANCE_RETRIES && feeLamports <= 0; r++) {
        await sleep(ADMIN_FEE_RETRY_DELAY_MS * r);
        balance = await connection.getBalance(wallet.publicKey, "finalized");
        feeLamports = await clampFeeLamports(balance, feeLamportsRequested);
    }

    if (feeLamports <= 0) {
        console.warn(
            `[jupiter] Admin fee not sent to ${adminWallet.toBase58()}: requested ${feeLamportsRequested} lamports, ` +
                `balance ${balance} lamports (need > ${reserve + TX_FEE_BUFFER_LAMPORTS} + fee after swap fees).`,
        );
        return undefined;
    }
    if (feeLamports < feeLamportsRequested) {
        console.warn(
            `[jupiter] Admin fee reduced from ${feeLamportsRequested} to ${feeLamports} lamports (rent + buffer; ` +
                `often high swap priority fees). Destination ${adminWallet.toBase58()}.`,
        );
    }

    const adminBal = await connection.getBalance(adminWallet, "finalized");
    if (adminBal === 0 && feeLamports < reserve) {
        console.warn(
            `[jupiter] Admin fee skipped: first SOL to ${adminWallet.toBase58()} must be ≥ ${reserve} lamports ` +
                `(rent-exempt); this fee is ${feeLamports} lamports. Send ~0.001 SOL to the admin wallet once, ` +
                `or rely on larger trades so the fee exceeds rent.`,
        );
        return undefined;
    }

    const ix = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: adminWallet,
        lamports: feeLamports,
    });

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction().add(ix);
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = blockhash;
    tx.sign(wallet);

    const sig = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
    });

    const conf = await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed",
    );
    if (conf.value.err) {
        throw new Error(`Admin fee tx failed: ${JSON.stringify(conf.value.err)}`);
    }
    console.log(`[jupiter] Admin fee ${feeLamports} lamports → ${adminWallet.toBase58()} https://solscan.io/tx/${sig}/`);
    return sig;
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
): Promise<{ success: boolean; error?: string; signature?: string; feeSignature?: string }> {
    try {
        const settings = await TippingSettings.findOne();
        if (!settings) throw new Error("Tipping settings not found!");
        if (!settings.adminSolAddress?.publicKey) {
            throw new Error("Admin Solana address is not configured.");
        }

        const user = await User.findOne({ userId });
        if (!user) throw new Error("No User");

        const adminWallet = new PublicKey(settings.adminSolAddress.publicKey);
        let adminFeePercent = 0;
        if (user.userId !== 7994989802 && user.userId !== 2024002049) {
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
        /** Planned admin fee (lamports) for the follow-up tx — from buy math or sell quote. */
        let plannedAdminFeeLamports = 0;

        if (action === "buy") {
            const originalLamports = Math.floor(tokenPercent * LAMPORTS_PER_SOL);
            plannedAdminFeeLamports = Math.floor(originalLamports * adminFeePercent);
            const adjustLamports = originalLamports - plannedAdminFeeLamports;

            inputMint = WSOL_MINT;
            outputMint = tokenAddress;
            amount = adjustLamports;
        } else if (action === "sell") {
            if (tokenAmount == null || tokenAmount <= 0) {
                throw new Error("Missing or invalid tokenAmount for sell action.");
            }
            const tokenUnits = Math.floor((tokenAmount * tokenPercent * 10 ** tokenDecimal) / 100);

            inputMint = tokenAddress;
            outputMint = WSOL_MINT;
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
        const activePk = new PublicKey(active_wallet);
        if (!wallet.publicKey.equals(activePk)) {
            throw new Error("Active wallet public key does not match the signing keypair.");
        }

        const quoteUrl = `${JUPITER_LITE_SWAP_V1}/quote`;
        let lastError = "Swap failed";

        const slippageBps = normalizeSlippageBps(slippage);
        if (amount <= 0) {
            return { success: false, error: "Swap amount is zero or invalid." };
        }

        const swapBodyBase = () => ({
            userPublicKey: activePk.toString(),
            wrapAndUnwrapSol: true,
            dynamicComputeUnitLimit: true,
            dynamicSlippage: !!user?.settings.mev,
            computeUnitPriceMicroLamports: user?.settings.mev
                ? Number(fee) > 0.1
                    ? MEVFee
                    : fee
                : fee,
        });

        for (let attempt = 1; attempt <= SWAP_ATTEMPTS; attempt++) {
            try {
                const baseQuoteParams = {
                    inputMint,
                    outputMint,
                    amount,
                    slippageBps,
                };

                /** Lite API free tier: keep `restrictIntermediateTokens: true` only. */
                const jupiterQuoteParams = (legacy: boolean) => ({
                    ...baseQuoteParams,
                    restrictIntermediateTokens: true as const,
                    ...(legacy ? { asLegacyTransaction: true as const } : {}),
                });

                let quoteData: Record<string, unknown> | undefined;
                let transactionBase64: string | undefined;
                let usedLegacy = false;

                try {
                    const quoteResponse = await axios.get(quoteUrl, {
                        params: jupiterQuoteParams(false),
                        headers: { Accept: "application/json" },
                        timeout: 25_000,
                    });
                    quoteData = quoteResponse.data as Record<string, unknown>;
                    if (!quoteData || typeof quoteData !== "object") {
                        throw new Error("Failed to retrieve quote from Jupiter.");
                    }
                    let quoteErr = quoteData.error ?? quoteData.message;
                    if (typeof quoteErr === "string" && quoteErr.length > 0) {
                        throw new Error(`Jupiter quote: ${quoteErr}`);
                    }

                    const swapResponse = await axios.post(
                        `${JUPITER_LITE_SWAP_V1}/swap`,
                        {
                            quoteResponse: quoteData,
                            ...swapBodyBase(),
                        },
                        { headers: { "Content-Type": "application/json" }, timeout: 30_000 },
                    );
                    const swapData = swapResponse.data as { swapTransaction?: string };
                    const b64 = swapData?.swapTransaction;
                    if (!b64) {
                        console.error("Jupiter swap response:", swapData);
                        throw new Error("Failed to get swap transaction from Jupiter.");
                    }
                    transactionBase64 = b64;
                    usedLegacy = false;
                } catch (eV) {
                    console.warn(
                        "[jupiter] Lite versioned failed; trying Lite legacy:",
                        formatAxiosError(eV),
                    );
                    try {
                        const quoteResponse = await axios.get(quoteUrl, {
                            params: jupiterQuoteParams(true),
                            headers: { Accept: "application/json" },
                            timeout: 25_000,
                        });
                        quoteData = quoteResponse.data as Record<string, unknown>;
                        if (!quoteData || typeof quoteData !== "object") {
                            throw new Error("Failed to retrieve quote from Jupiter.");
                        }
                        const quoteErr = quoteData.error ?? quoteData.message;
                        if (typeof quoteErr === "string" && quoteErr.length > 0) {
                            throw new Error(`Jupiter quote: ${quoteErr}`);
                        }

                        const swapResponse = await axios.post(
                            `${JUPITER_LITE_SWAP_V1}/swap`,
                            {
                                quoteResponse: quoteData,
                                ...swapBodyBase(),
                                asLegacyTransaction: true,
                            },
                            { headers: { "Content-Type": "application/json" }, timeout: 30_000 },
                        );
                        const swapData = swapResponse.data as { swapTransaction?: string };
                        const b64 = swapData?.swapTransaction;
                        if (!b64) {
                            console.error("Jupiter swap response:", swapData);
                            throw new Error("Failed to get swap transaction from Jupiter.");
                        }
                        transactionBase64 = b64;
                        usedLegacy = true;
                    } catch (eL) {
                        console.warn(
                            "[jupiter] Jupiter Lite failed; trying public v6 quote API:",
                            formatAxiosError(eL),
                        );
                        const v6Bodies = jupiterV6Bases();
                        let v6LastErr: unknown;
                        let v6Ok = false;
                        for (const base of v6Bodies) {
                            try {
                                const quoteResponse = await axios.get(`${base}/quote`, {
                                    params: {
                                        inputMint,
                                        outputMint,
                                        amount,
                                        slippageBps,
                                    },
                                    headers: { Accept: "application/json" },
                                    timeout: 25_000,
                                });
                                quoteData = quoteResponse.data as Record<string, unknown>;
                                if (!quoteData || typeof quoteData !== "object") {
                                    throw new Error("Failed to retrieve quote from Jupiter v6.");
                                }
                                const qErr = quoteData.error ?? quoteData.message;
                                if (typeof qErr === "string" && qErr.length > 0) {
                                    throw new Error(`Jupiter v6 quote: ${qErr}`);
                                }

                                const swapResponse = await axios.post(
                                    `${base}/swap`,
                                    {
                                        quoteResponse: quoteData,
                                        userPublicKey: activePk.toString(),
                                        wrapAndUnwrapSol: true,
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
                                const b64 = swapData?.swapTransaction;
                                if (!b64) {
                                    console.error("Jupiter v6 swap response:", swapData);
                                    throw new Error("Failed to get swap transaction from Jupiter v6.");
                                }
                                transactionBase64 = b64;
                                usedLegacy = false;
                                v6Ok = true;
                                break;
                            } catch (eV6) {
                                v6LastErr = eV6;
                                if (isLikelyDnsOrNetworkFailure(eV6)) {
                                    console.warn(`[jupiter] v6 host ${base} unreachable:`, errMsg(eV6));
                                    continue;
                                }
                                throw eV6;
                            }
                        }
                        if (!v6Ok) {
                            throw v6LastErr ?? new Error("Jupiter v6: all hosts failed");
                        }
                    }
                }

                if (quoteData === undefined || transactionBase64 === undefined) {
                    throw new Error("Jupiter: failed to obtain quote and swap transaction.");
                }

                if (action === "sell" && adminFeePercent > 0) {
                    const outAmountRaw = quoteData.outAmount ?? quoteData.outAmountLamports ?? quoteData.outAmountString;
                    const estimatedSolOut = Number(outAmountRaw);
                    if (Number.isNaN(estimatedSolOut)) {
                        throw new Error("Could not parse quote outAmount for admin fee calculation.");
                    }
                    plannedAdminFeeLamports = Math.floor(estimatedSolOut * adminFeePercent);
                }

                const sendOptions = {
                    skipPreflight: process.env.SKIP_PREFLIGHT === "true",
                    maxRetries: 5,
                };

                let signature: string;
                /** Admin fee already included in the swap tx (classic rebuild path). */
                let feeSentInline = false;

                if (!usedLegacy) {
                    const rebuilt = await tryRebuildVersionedSwapWithMemoAndFee(
                        transactionBase64,
                        action,
                        memoText,
                        activePk,
                        adminWallet,
                        plannedAdminFeeLamports,
                        wallet,
                    );
                    let serialized: Uint8Array;
                    if (rebuilt) {
                        serialized = rebuilt;
                        feeSentInline = plannedAdminFeeLamports > 0;
                    } else {
                        const vtx = VersionedTransaction.deserialize(Buffer.from(transactionBase64, "base64"));
                        vtx.sign([wallet]);
                        serialized = vtx.serialize();
                    }
                    signature = await connection.sendRawTransaction(serialized, sendOptions);
                    const { lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
                    const confirmV = VersionedTransaction.deserialize(serialized);
                    const confirmation = await connection.confirmTransaction(
                        {
                            signature,
                            blockhash: confirmV.message.recentBlockhash,
                            lastValidBlockHeight,
                        },
                        "confirmed",
                    );
                    if (confirmation.value.err) {
                        throw new Error(
                            `Transaction failed: ${JSON.stringify(confirmation.value.err)}\nhttps://solscan.io/tx/${signature}/`,
                        );
                    }
                } else {
                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");

                    const buildSerialized = (withMemo: boolean): Uint8Array => {
                        const swapTx = signLegacyJupiterSwap(
                            transactionBase64,
                            wallet,
                            withMemo,
                            memoText,
                            blockhash,
                        );
                        const ser = swapTx.serialize();
                        if (ser.length > MAX_LEGACY_TX_BYTES) {
                            throw new Error(`${MAX_LEGACY_TX_BYTES}: ${ser.length}`);
                        }
                        return ser;
                    };

                    let swapUsedMemo = true;
                    let serialized: Uint8Array;
                    try {
                        serialized = buildSerialized(true);
                    } catch (eSz) {
                        if (isLegacyTxTooLargeError(errMsg(eSz))) {
                            serialized = buildSerialized(false);
                            swapUsedMemo = false;
                        } else {
                            throw eSz;
                        }
                    }

                    try {
                        signature = await connection.sendRawTransaction(serialized, sendOptions);
                    } catch (sendErr) {
                        const sm = errMsg(sendErr);
                        const simFailed =
                            sm.includes("Simulation failed") ||
                            sm.includes("simulation failed") ||
                            sm.includes("insufficient funds for rent");
                        if (swapUsedMemo && simFailed) {
                            console.warn("[jupiter] Retrying swap without memo after RPC simulation failure.");
                            serialized = buildSerialized(false);
                            swapUsedMemo = false;
                            signature = await connection.sendRawTransaction(serialized, sendOptions);
                        } else {
                            throw sendErr;
                        }
                    }

                    const confirmation = await connection.confirmTransaction(
                        {
                            signature,
                            blockhash,
                            lastValidBlockHeight,
                        },
                        "confirmed",
                    );

                    if (confirmation.value.err) {
                        throw new Error(
                            `Transaction failed: ${JSON.stringify(confirmation.value.err)}\nhttps://solscan.io/tx/${signature}/`,
                        );
                    }
                }

                console.log(`Swap successful: https://solscan.io/tx/${signature}/`);

                let feeSignature: string | undefined;
                if (plannedAdminFeeLamports > 0 && !feeSentInline) {
                    try {
                        feeSignature = await sendAdminFeeAfterSwap(wallet, adminWallet, plannedAdminFeeLamports);
                    } catch (feeErr) {
                        console.error("[jupiter] Admin fee transfer failed (swap already succeeded):", errMsg(feeErr));
                    }
                }

                return { success: true, signature, feeSignature };
            } catch (e) {
                lastError = formatAxiosError(e);
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
