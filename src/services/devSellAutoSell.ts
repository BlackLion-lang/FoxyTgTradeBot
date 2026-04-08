import { PublicKey } from "@solana/web3.js";
import { User } from "../models/user";
import { limitOrderData } from "../models/limitOrder";
import { getPumpFunCoinMeta } from "./dexscreener";
import { swapToken } from "./jupiter";
import { getTokenBalance } from "./solana";
import { onPumpSell, type PumpStreamSellEvent } from "./pumpStream";
import { logger } from "../utils/logger";
import { bot } from "../config/constant";
import { t } from "../locales";

const CREATOR_CACHE_MS = 60 * 60 * 1000;
const creatorOnlyCache = new Map<string, { creator: string; at: number }>();
const DEDUP_MS = 120_000;
const notified = new Map<string, number>();

function pruneDedup(): void {
    const cutoff = Date.now() - DEDUP_MS;
    for (const [k, ts] of notified) if (ts < cutoff) notified.delete(k);
}

async function getCachedCreatorOnly(mint: string): Promise<string | null> {
    const e = creatorOnlyCache.get(mint);
    if (e && Date.now() - e.at < CREATOR_CACHE_MS) return e.creator;
    const meta = await getPumpFunCoinMeta(mint);
    const c = meta?.creator ?? null;
    if (c) creatorOnlyCache.set(mint, { creator: c, at: Date.now() });
    return c;
}

async function handleDevSell(event: PumpStreamSellEvent): Promise<void> {
    const mint = (event.mint ?? "").trim();
    const seller = (event.txSigner ?? "").trim();
    if (!mint || !seller) return;

    const users = await User.find({
        $or: [{ chain: "solana" }, { chain: { $exists: false } }],
        "settings.auto_sell.sellOnDevSellEnabled_solana": true,
    }).lean();

    if (!users.length) return;

    const anySupply = users.some(
        (u: { settings?: { auto_sell?: { sellOnDevSellMinSupplyPercent_solana?: number } } }) =>
            (u.settings?.auto_sell?.sellOnDevSellMinSupplyPercent_solana ?? 0) > 0,
    );

    let creator: string | null = null;
    let totalSupply = 0;
    if (anySupply) {
        const meta = await getPumpFunCoinMeta(mint);
        creator = meta?.creator ?? null;
        totalSupply = meta?.totalSupply ?? 0;
    } else {
        creator = await getCachedCreatorOnly(mint);
    }

    if (!creator || seller.toLowerCase() !== creator.toLowerCase()) return;

    const solRaw = (event as Record<string, unknown>).solAmount ?? (event as Record<string, unknown>).sol_amount;
    const solNum = typeof solRaw === "number" ? solRaw : Number(solRaw);
    const tokRaw = (event as Record<string, unknown>).tokenAmount ?? (event as Record<string, unknown>).token_amount;
    const tokenAm = typeof tokRaw === "number" ? tokRaw : Number(tokRaw);

    for (const u of users) {
        const userId = u.userId as number;
        const as = (u as { settings?: { auto_sell?: Record<string, unknown> } }).settings?.auto_sell ?? {};
        const minSol = Math.max(0, Number(as.sellOnDevSellMinSol_solana ?? 0));
        const minSupplyPct = Math.min(100, Math.max(0, Number(as.sellOnDevSellMinSupplyPercent_solana ?? 0)));
        const posPct = Math.min(100, Math.max(1, Math.floor(Number(as.sellOnDevSellPositionPercent_solana ?? 100))));

        if (minSol > 0 && (!Number.isFinite(solNum) || solNum < minSol)) continue;

        if (minSupplyPct > 0) {
            if (!totalSupply || !Number.isFinite(tokenAm) || tokenAm <= 0) continue;
            const pct = (tokenAm / totalSupply) * 100;
            if (!Number.isFinite(pct) || pct < minSupplyPct) continue;
        }

        const fullUser = await User.findOne({ userId });
        if (!fullUser || fullUser.chain === "ethereum") continue;
        const activeWallet = fullUser.wallets?.find((w: { is_active_wallet?: boolean }) => w.is_active_wallet);
        if (!activeWallet?.publicKey) continue;
        const walletPubKey = String(activeWallet.publicKey);

        pruneDedup();
        const dedupKey = `devsell:${userId}:${mint}:${(event.signature ?? "").toString()}`;
        if (notified.has(dedupKey)) continue;
        notified.set(dedupKey, Date.now());

        const tokenBal = await getTokenBalance(new PublicKey(walletPubKey), new PublicKey(mint)).catch(() => 0);
        if (tokenBal <= 0) continue;

        const settings = fullUser.settings as {
            slippage?: { sell_slippage?: number };
            fee_setting?: { sell_fee?: number };
        };
        const sellSlippage = (settings?.slippage?.sell_slippage ?? 1) * 100;
        const sellFee = (settings?.fee_setting?.sell_fee ?? 0) * 10 ** 9;

        logger.info(
            "DevSellAutoSell",
            `Trigger userId=${userId} mint=${mint.slice(0, 8)}… positionSell=${posPct}%`,
        );

        const pending = await t("autoSell.devSellPending", userId).catch(() => "Selling…");
        await bot.sendMessage(userId, pending).catch(() => {});

        const result = await swapToken(userId, walletPubKey, mint, posPct, "sell", sellSlippage, sellFee, tokenBal).catch(
            (err: unknown) => {
                logger.error("DevSellAutoSell", "Sell failed", userId, mint, err);
                return { success: false, error: String(err) };
            },
        );

        if (result?.success) {
            await limitOrderData
                .updateMany(
                    { user_id: userId, token_mint: mint, wallet: walletPubKey, status: "Pending" },
                    { $set: { status: "Failed" } },
                )
                .catch(() => {});
            const ok = await t("autoSell.devSellDone", userId).catch(() => "Dev sold — your position was updated.");
            await bot.sendMessage(userId, `${ok}\n<code>${mint}</code>`, { parse_mode: "HTML" }).catch(() => {});
        } else {
            const fail = await t("autoSell.devSellFailed", userId).catch(() => "Auto-sell failed");
            await bot
                .sendMessage(
                    userId,
                    `${fail}\n<code>${mint}</code>\n${(result as { error?: string })?.error ?? ""}`,
                    { parse_mode: "HTML" },
                )
                .catch(() => {});
        }
    }
}

let unsubscribe: (() => void) | null = null;

/** Subscribe to pump stream sells and auto-sell when the token creator (dev) sells (Solana / pump.fun). */
export function startDevSellAutoSellListener(): () => void {
    if (unsubscribe) return unsubscribe;
    const u = onPumpSell((ev) => {
        void handleDevSell(ev).catch((err) => logger.error("DevSellAutoSell", "handler", err));
    });
    unsubscribe = () => {
        u();
        unsubscribe = null;
    };
    return unsubscribe;
}

export function stopDevSellAutoSellListener(): void {
    if (unsubscribe) unsubscribe();
}
