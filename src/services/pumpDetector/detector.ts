import { Connection, PublicKey } from "@solana/web3.js";
import { parseTokenCreation, TokenCreationResult } from "./parser";
import { logger } from "../../utils/logger";

const TAG = "PumpDetector";
const RECENT_SIGS_MAX = 50_000;
const PRUNE_AFTER_MS = 120_000;

const processedSignatures = new Set<string>();
const signatureTimestamps = new Map<string, number>();

function pruneProcessed(): void {
    if (processedSignatures.size < RECENT_SIGS_MAX) return;
    const cutoff = Date.now() - PRUNE_AFTER_MS;
    for (const [sig, ts] of signatureTimestamps.entries()) {
        if (ts < cutoff) {
            processedSignatures.delete(sig);
            signatureTimestamps.delete(sig);
        }
    }
}

export type OnTokenCreatedCallback = (result: TokenCreationResult) => void | Promise<void>;

export function subscribeToWallet(
    conn: Connection,
    targetWallet: string,
    onTokenCreated: OnTokenCreatedCallback
): number {
    const pubkey = new PublicKey(targetWallet);
    const addressKey = targetWallet.toLowerCase();

    return conn.onLogs(
        pubkey,
        async (logs) => {
            if (logs.err) return;
            const signature = logs.signature;
            if (!signature) return;
            const sigKey = `${addressKey}:${signature}`;
            if (processedSignatures.has(sigKey)) return;

            pruneProcessed();

            let result: TokenCreationResult | null = null;
            try {
                result = await parseTokenCreation(conn, signature, targetWallet, "confirmed");
            } catch (err) {
                logger.error(TAG, "Parse error", signature, err);
                return;
            }

            if (!result) return;

            processedSignatures.add(sigKey);
            signatureTimestamps.set(sigKey, Date.now());

            logger.success(TAG, "Token created", result.mint, "by", result.creator);
            try {
                await onTokenCreated(result);
            } catch (err) {
                logger.error(TAG, "Executor error", err);
            }
        },
        "confirmed"
    );
}

export function unsubscribe(conn: Connection, subscriptionId: number): void {
    conn.removeOnLogsListener(subscriptionId).catch(() => {});
}

export function wasProcessed(addressKey: string, signature: string): boolean {
    return processedSignatures.has(`${addressKey}:${signature}`);
}
