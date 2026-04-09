/**
 * Solana-only PnL / performance stats from per-wallet `tradeHistory`
 * (same buy/sell USD rules as `messages/solana/sell`).
 */

export type PnlPeriodKey = "1d" | "7d" | "30d" | "all";

export interface TradeDoc {
    token_address?: string | null;
    transaction_type?: string;
    amount?: number;
    token_price?: number;
    token_amount?: number;
    token_balance?: number;
    mc?: number;
    date?: string | number;
    name?: string;
    tip?: number;
    pnl?: boolean;
}

export function tradeTimeMs(t: TradeDoc): number {
    const d = t.date;
    if (d == null) return 0;
    if (typeof d === "number") {
        if (d < 1e12 && d > 1e9) return d * 1000;
        return d;
    }
    const n = Number(d);
    if (Number.isFinite(n)) {
        if (n < 1e12 && n > 1e9) return n * 1000;
        if (n >= 1e12) return n;
    }
    const p = Date.parse(String(d));
    return Number.isFinite(p) ? p : 0;
}

export function periodDurationMs(p: PnlPeriodKey): number | null {
    if (p === "all") return null;
    const day = 86400000;
    if (p === "1d") return day;
    if (p === "7d") return 7 * day;
    if (p === "30d") return 30 * day;
    return day;
}

function sellProceedsUsd(trade: TradeDoc, adminFeeFrac: number): number {
    const amt = Number(trade.amount) || 0;
    const ta = Number(trade.token_amount) || 0;
    const px = Number(trade.token_price) || 0;
    return (ta * amt * px * (adminFeeFrac + 1)) / 100;
}

/** Replay trades up to cutoff (inclusive). cutoffMs = Infinity => all time. */
export function portfolioSnapshot(
    wallets: Array<{
        publicKey?: string;
        label?: string;
        tradeHistory?: TradeDoc[];
    }>,
    cutoffMs: number,
    adminFeeFrac: number,
): {
    totalPnlUsd: number;
    closedPnlUsd: number;
    openPnlUsd: number;
    closedWinners: number;
    closedLosers: number;
    byWallet: Map<string, { label: string; pnlUsd: number; tradeCount: number }>;
    byToken: Map<string, { name: string; pnlUsd: number }>;
} {
    type Group = { label: string; trades: TradeDoc[] };
    const groups = new Map<string, Group>();

    for (const w of wallets) {
        const pub = w.publicKey || "";
        const label = w.label || pub.slice(0, 8) || "Wallet";
        const hist = w.tradeHistory || [];
        for (const tr of hist) {
            if (tr.pnl === false) continue;
            const mint = tr.token_address || "";
            if (!mint) continue;
            const ts = tradeTimeMs(tr);
            if (ts <= 0 || ts > cutoffMs) continue;
            const key = `${pub}||${mint}`;
            let g = groups.get(key);
            if (!g) {
                g = { label, trades: [] };
                groups.set(key, g);
            }
            g.trades.push(tr);
        }
    }

    for (const g of groups.values()) {
        g.trades.sort((a, b) => tradeTimeMs(a) - tradeTimeMs(b));
    }

    let totalPnlUsd = 0;
    let closedPnlUsd = 0;
    let openPnlUsd = 0;
    let closedWinners = 0;
    let closedLosers = 0;
    const byWallet = new Map<string, { label: string; pnlUsd: number; tradeCount: number }>();
    const byToken = new Map<string, { name: string; pnlUsd: number }>();

    for (const [key, g] of groups) {
        const [walletPub] = key.split("||");
        const mint = key.split("||")[1] || "";
        let totalProfit = 0;
        for (const trade of g.trades) {
            if (trade.transaction_type === "buy") {
                totalProfit -= Number(trade.amount) || 0;
            } else if (trade.transaction_type === "sell") {
                totalProfit += sellProceedsUsd(trade, adminFeeFrac);
            }
        }
        const last = g.trades[g.trades.length - 1];
        const bal = Number(last?.token_balance) || 0;
        const lastPx = Number(last?.token_price) || 0;
        let pnlTotal = totalProfit;
        if (bal > 0) {
            pnlTotal += bal * lastPx * (adminFeeFrac + 1);
            openPnlUsd += pnlTotal;
        } else {
            closedPnlUsd += pnlTotal;
            if (g.trades.length > 0) {
                if (pnlTotal > 0) closedWinners += 1;
                else if (pnlTotal < 0) closedLosers += 1;
            }
        }
        totalPnlUsd += pnlTotal;

        const wk = walletPub || "unknown";
        const wv = byWallet.get(wk) || { label: g.label, pnlUsd: 0, tradeCount: 0 };
        wv.pnlUsd += pnlTotal;
        wv.tradeCount += g.trades.length;
        byWallet.set(wk, wv);

        const tv = byToken.get(mint) || { name: last?.name || mint.slice(0, 6) + "…", pnlUsd: 0 };
        tv.name = last?.name || tv.name;
        tv.pnlUsd += pnlTotal;
        byToken.set(mint, tv);
    }

    return { totalPnlUsd, closedPnlUsd, openPnlUsd, closedWinners, closedLosers, byWallet, byToken };
}

export function periodActivity(
    wallets: Array<{ tradeHistory?: TradeDoc[] }>,
    startMs: number,
    endMs: number,
    adminFeeFrac: number,
): {
    tradeCount: number;
    volumeUsd: number;
    feesUsd: number;
    bestSellUsd: number;
    worstSellUsd: number;
    bestSellLabel: string;
    worstSellLabel: string;
} {
    let tradeCount = 0;
    let volumeUsd = 0;
    let feesUsd = 0;
    let bestSellUsd = 0;
    let worstSellUsd = 0;
    let bestSellLabel = "—";
    let worstSellLabel = "—";
    let anySell = false;

    for (const w of wallets) {
        for (const tr of w.tradeHistory || []) {
            if (tr.pnl === false) continue;
            const ts = tradeTimeMs(tr);
            if (ts < startMs || ts > endMs) continue;
            tradeCount += 1;
            const tip = Number(tr.tip) || 0;
            feesUsd += tip;

            if (tr.transaction_type === "buy") {
                volumeUsd += Number(tr.amount) || 0;
            } else if (tr.transaction_type === "sell") {
                const proceeds = sellProceedsUsd(tr, adminFeeFrac);
                volumeUsd += proceeds;
                const name = tr.name || String(tr.token_address || "").slice(0, 8);
                if (!anySell || proceeds > bestSellUsd) {
                    bestSellUsd = proceeds;
                    bestSellLabel = name;
                }
                if (!anySell || proceeds < worstSellUsd) {
                    worstSellUsd = proceeds;
                    worstSellLabel = name;
                }
                anySell = true;
            }
        }
    }

    if (!anySell) {
        worstSellUsd = 0;
        worstSellLabel = "—";
    }

    return {
        tradeCount,
        volumeUsd,
        feesUsd,
        bestSellUsd,
        worstSellUsd,
        bestSellLabel,
        worstSellLabel,
    };
}

/** PnL change over period: snapshot(now) - snapshot(periodStart). */
export function periodPnlDeltaUsd(
    wallets: Array<{ publicKey?: string; label?: string; tradeHistory?: TradeDoc[] }>,
    periodMs: number,
    adminFeeFrac: number,
    nowMs: number = Date.now(),
): number {
    const snapNow = portfolioSnapshot(wallets, Infinity, adminFeeFrac);
    const snapStart = portfolioSnapshot(wallets, nowMs - periodMs, adminFeeFrac);
    return snapNow.totalPnlUsd - snapStart.totalPnlUsd;
}

/** Win rate on fully closed (flat) token positions. */
export function closedPositionWinRatePercent(closedWinners: number, closedLosers: number): number {
    const t = closedWinners + closedLosers;
    if (t <= 0) return 0;
    return (100 * closedWinners) / t;
}
