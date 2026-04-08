/**
 * "Sell on no activity": uses DexScreener pair snapshots (price, txns, volume windows).
 * If the fingerprint is unchanged for longer than the user's inactivity period, treat as dead market.
 */

export function fingerprintFromDexPair(pair: any): string {
    if (!pair) return "";
    const r = (n: unknown) =>
        typeof n === "number" && Number.isFinite(n) ? Math.round(n * 1e6) / 1e6 : 0;
    const tx = pair.txns || {};
    const m5 = tx.m5 || {};
    const h1 = tx.h1 || {};
    const vol = pair.volume || {};
    const pc = pair.priceChange || {};
    const parts = [
        r(pair.priceUsd),
        m5.buys ?? 0,
        m5.sells ?? 0,
        r(vol.m5),
        h1.buys ?? 0,
        h1.sells ?? 0,
        r(vol.h1),
        r(pc.m5),
        r(pc.h1),
    ];
    return parts.join("|");
}

export function clampInactivityMinutes(raw: unknown): number {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return 60;
    return Math.min(10080, Math.max(15, Math.floor(n)));
}

export function evaluateInactivityForOrder(
    order: {
        lastActivityAt?: Date | null;
        lastActivityFingerprint?: string;
        createdAt?: Date;
    },
    pair: any,
    minutes: number,
): { shouldSell: boolean; updates?: Record<string, unknown> } {
    const newFp = fingerprintFromDexPair(pair);
    if (!newFp) {
        return { shouldSell: false };
    }

    const now = Date.now();
    const prevFp = order.lastActivityFingerprint;

    if (prevFp == null || prevFp === "") {
        return {
            shouldSell: false,
            updates: { lastActivityFingerprint: newFp, lastActivityAt: new Date() },
        };
    }

    if (newFp !== prevFp) {
        return {
            shouldSell: false,
            updates: { lastActivityFingerprint: newFp, lastActivityAt: new Date() },
        };
    }

    const lastMs =
        order.lastActivityAt != null
            ? new Date(order.lastActivityAt).getTime()
            : order.createdAt
              ? new Date(order.createdAt).getTime()
              : now;

    if (now - lastMs >= minutes * 60 * 1000) {
        return { shouldSell: true };
    }

    return { shouldSell: false };
}
