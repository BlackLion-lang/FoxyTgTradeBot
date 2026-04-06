import { getPairByAddress } from "./dexscreener";

export type CopyTradeSizingMode = "fixed" | "percent_wallet" | "proportional_source";

function normMint(m: string): string {
    return (m || "").trim().toLowerCase();
}

/** Dexscreener search pair shape (partial). */
function pickPairMetrics(pair: Record<string, unknown> | undefined | null): {
    mcap: number;
    liqUsd: number;
    vol24: number;
    createdMs: number | null;
} {
    if (!pair || typeof pair !== "object") {
        return { mcap: 0, liqUsd: 0, vol24: 0, createdMs: null };
    }
    const mcap = Number((pair as any).marketCap ?? (pair as any).fdv ?? 0) || 0;
    const liq = (pair as any).liquidity;
    const liqUsd = typeof liq === "object" && liq ? Number((liq as any).usd ?? 0) || 0 : Number(liq ?? 0) || 0;
    const vol = (pair as any).volume;
    const vol24 =
        typeof vol === "object" && vol
            ? Number((vol as any).h24 ?? (vol as any).h24Usd ?? 0) || 0
            : Number((pair as any).volume24h ?? 0) || 0;
    let createdMs: number | null = null;
    const pc = (pair as any).pairCreatedAt;
    if (typeof pc === "number" && pc > 1e12) createdMs = pc;
    else if (typeof pc === "number" && pc > 1e9) createdMs = pc * 1000;
    else if (typeof pc === "string") {
        const p = Date.parse(pc);
        if (!isNaN(p)) createdMs = p;
    }
    return { mcap, liqUsd, vol24, createdMs };
}

/**
 * Per–monitored-wallet config merged with legacy parent `copyTrade` fields (wallet wins when set).
 */
export function mergeWalletCopyConfig(
    ct: Record<string, unknown> | null | undefined,
    wallet: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
    const p = (ct ?? {}) as Record<string, unknown>;
    const w = (wallet ?? {}) as Record<string, unknown>;
    const pick = <T>(key: string, def: T): T => {
        const v = w[key];
        if (v !== undefined && v !== null) return v as T;
        const pv = p[key];
        if (pv !== undefined && pv !== null) return pv as T;
        return def;
    };
    const pickArr = (key: string): string[] => {
        if (Object.prototype.hasOwnProperty.call(w, key) && Array.isArray(w[key])) {
            return (w[key] as unknown[]).map((x) => String(x).trim()).filter(Boolean);
        }
        if (Array.isArray(p[key])) return (p[key] as unknown[]).map((x) => String(x).trim()).filter(Boolean);
        return [];
    };
    return {
        sizingMode: pick("sizingMode", "fixed"),
        sizingPercentWallet: pick("sizingPercentWallet", 5),
        proportionalRatio: pick("proportionalRatio", 1),
        maxAmountPerTradeSol: pick("maxAmountPerTradeSol", 10),
        filterMinMcapUsd: pick("filterMinMcapUsd", 0),
        filterMaxMcapUsd: pick("filterMaxMcapUsd", 0),
        filterMinLiquidityUsd: pick("filterMinLiquidityUsd", 0),
        filterMinTokenAgeMinutes: pick("filterMinTokenAgeMinutes", 0),
        filterMinVolumeUsd: pick("filterMinVolumeUsd", 0),
        filterTokenBlacklist: pickArr("filterTokenBlacklist"),
        filterTokenWhitelist: pickArr("filterTokenWhitelist"),
    };
}

/**
 * Copy-trade filters (merged wallet + parent config). Returns false if trade should be skipped.
 */
export async function passesCopyTradeFilters(mint: string, ct: Record<string, unknown> | null | undefined): Promise<boolean> {
    if (!ct) return true;
    const m = normMint(mint);

    const bl = (ct.filterTokenBlacklist as string[] | undefined) ?? [];
    if (bl.some((x) => normMint(String(x)) === m)) return false;

    const wl = (ct.filterTokenWhitelist as string[] | undefined) ?? [];
    if (wl.length > 0 && !wl.some((x) => normMint(String(x)) === m)) return false;

    const minMcap = Number(ct.filterMinMcapUsd ?? 0) || 0;
    const maxMcap = Number(ct.filterMaxMcapUsd ?? 0) || 0;
    const minLiq = Number(ct.filterMinLiquidityUsd ?? 0) || 0;
    const minVol = Number(ct.filterMinVolumeUsd ?? 0) || 0;
    const minAgeMin = Number(ct.filterMinTokenAgeMinutes ?? 0) || 0;

    const needsPair = minMcap > 0 || maxMcap > 0 || minLiq > 0 || minVol > 0 || minAgeMin > 0;
    if (!needsPair) return true;

    const pairs = (await getPairByAddress(mint).catch(() => [])) as Record<string, unknown>[] | null;
    const pair = Array.isArray(pairs) && pairs.length ? pairs[0] : null;
    const { mcap, liqUsd, vol24, createdMs } = pickPairMetrics(pair);

    if (minMcap > 0 && (!pair || mcap < minMcap)) return false;
    if (maxMcap > 0 && mcap > maxMcap) return false;
    if (minLiq > 0 && (!pair || liqUsd < minLiq)) return false;
    if (minVol > 0 && (!pair || vol24 < minVol)) return false;
    if (minAgeMin > 0) {
        if (createdMs == null) return false;
        const ageMin = (Date.now() - createdMs) / 60_000;
        if (ageMin < minAgeMin) return false;
    }
    return true;
}

/**
 * Per-wallet filter: when target buys, only copy if their SOL size is within [min, max].
 */
export function passesTargetBuySizeFilter(
    source: "create" | "buy",
    sourceSolAmount: number | undefined,
    monitored: { minAmountSol?: number; maxAmountSol?: number },
): boolean {
    if (source !== "buy" || sourceSolAmount == null || !Number.isFinite(sourceSolAmount)) return true;
    const minT = Number(monitored.minAmountSol ?? 0) || 0;
    const maxT = Number(monitored.maxAmountSol ?? 0) || 0;
    if (minT > 0 && sourceSolAmount < minT) return false;
    if (maxT > 0 && sourceSolAmount > maxT) return false;
    return true;
}

export function computeCopyTradeBuyAmountSol(params: {
    copyTrade: Record<string, unknown> | null | undefined;
    monitoredBuyAmountSol: number;
    userBalanceSol: number;
    sourceSolAmount?: number;
}): number {
    const ct = params.copyTrade ?? {};
    const mode = (String(ct.sizingMode || "fixed") as CopyTradeSizingMode) || "fixed";
    const fixed = Math.max(0.0001, Number(params.monitoredBuyAmountSol) || 0.01);
    const maxCap = Number(ct.maxAmountPerTradeSol ?? 0) || 0;
    const cap = maxCap > 0 ? maxCap : 1e9;

    let out = fixed;
    if (mode === "percent_wallet") {
        const pct = Number(ct.sizingPercentWallet ?? 5);
        out = (Math.max(0, params.userBalanceSol) * pct) / 100;
    } else if (mode === "proportional_source") {
        const ratio = Number(ct.proportionalRatio ?? 1);
        const src = params.sourceSolAmount ?? 0;
        out = src > 0 ? src * (Number.isFinite(ratio) && ratio > 0 ? ratio : 1) : fixed;
    }

    out = Math.min(out, cap);
    if (!Number.isFinite(out) || out < 0.0001) out = Math.min(fixed, cap);
    return out;
}
