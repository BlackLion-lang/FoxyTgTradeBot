import { PublicKey } from "@solana/web3.js";
import { User } from "../models/user";
import { limitOrderData } from "../models/limitOrder";
import { TippingSettings } from "../models/tipSettings";
import { getPumpFunCoinInfo, getPairByAddress } from "./dexscreener";
import { swapToken } from "./jupiter";
import { getBalance, getSolPrice, getTokenBalance } from "./solana";
import { formatNumberStyle } from "./other";
import { t } from "../locales";
import { bot } from "../config/constant";
import { connection } from "../config/connection";
import { subscribeToWallet, unsubscribe, type TokenCreationResult } from "./pumpDetector";
import { startPumpStream, stopPumpStream, onPumpCreate, onPumpBuy, type PumpStreamCreateEvent, type PumpStreamBuyEvent } from "./pumpStream";
import { logger } from "../utils/logger";
import { getCloseButton } from "../utils/markup";
import { getSell } from "../messages/solana/sell";

const LAMPORTS_PER_SOL = 1e9;
const SUBSCRIPTION_REFRESH_MS = 25_000;
const RECENT_DEDUP_MS = 120_000;

const notifiedRecently = new Map<string, number>();
const logSubscriptions = new Map<string, number>();
let refreshIntervalId: NodeJS.Timeout | null = null;
/** Current monitored wallets (addressKey -> entries), updated on each refresh. Used by pump stream for target-wallet token launch detection. */
let currentMonitoredByAddress: Map<string, MonitoredEntry[]> = new Map();
let pumpStreamUnsubscribe: (() => void) | null = null;
let pumpStreamBuyUnsubscribe: (() => void) | null = null;

function shortAddress(addr: string, len = 8): string {
    if (!addr || addr.length <= len * 2) return addr;
    return `${addr.slice(0, len)}...${addr.slice(-len)}`;
}

function pruneNotified(): void {
    const cutoff = Date.now() - RECENT_DEDUP_MS;
    for (const [k, ts] of notifiedRecently.entries()) if (ts < cutoff) notifiedRecently.delete(k);
}

/** After a successful copy-trade buy: update trade history, optional limit order (TP/SL), send success message + positions (getSell). */
async function applyCopyTradeBuySuccess(
    userId: number,
    mint: string,
    walletPubKey: string,
    buyAmountSol: number,
    result: { success: boolean; signature?: string; [k: string]: unknown }
): Promise<void> {
    const userDoc = await User.findOne({ userId });
    const activeWalletDoc = userDoc?.wallets?.find((w: any) => w.is_active_wallet);
    if (!userDoc || !activeWalletDoc) return;
    const settings = await TippingSettings.findOne() || new TippingSettings();
    const sol_price = getSolPrice();
    let priceUsd = 0, market_cap = 0, symbol = "", name = "";
    try {
        const pairArray = await getPairByAddress(mint);
        const pair = pairArray?.[0];
        if (pair) {
            priceUsd = pair.priceUsd ?? 0;
            market_cap = pair?.marketCap ?? 0;
            symbol = pair?.baseToken?.symbol ?? "";
            name = pair?.baseToken?.name ?? "";
        }
    } catch (_) {}
    if (!name && !symbol) {
        const coinInfo = await getPumpFunCoinInfo(mint).catch(() => null);
        if (coinInfo) {
            name = coinInfo.name ?? "";
            symbol = coinInfo.symbol ?? "";
        }
    }
    const tokenBalance = await getTokenBalance(new PublicKey(walletPubKey), new PublicKey(mint)).catch(() => 0);
    let adminFeePercent = (settings?.feePercentage ?? 0) / 100;
    if (userId === 7994989802 || userId === 2024002049) adminFeePercent = 0;
    if (!activeWalletDoc.tradeHistory) (activeWalletDoc as any).tradeHistory = [];
    (activeWalletDoc.tradeHistory as any[]).push({
        transaction_type: "buy",
        token_address: mint,
        amount: buyAmountSol * sol_price,
        token_price: priceUsd,
        token_balance: tokenBalance,
        mc: market_cap,
        date: Date.now(),
        name: name || mint.slice(0, 8),
        tip: buyAmountSol * adminFeePercent,
        pnl: true,
    });
    await userDoc.save();

    const copyTpSlEnabled = (userDoc.copyTrade as any)?.tpSlEnabled !== false;
    if (copyTpSlEnabled && ((userDoc.settings?.auto_sell?.enabled_solana ?? false) || (userDoc.sniper as any)?.allowAutoSell)) {
        const takeProfitPercent = (userDoc.copyTrade as any)?.takeProfitPercent ?? 10;
        const stopLossPercent = (userDoc.copyTrade as any)?.stopLossPercent ?? -40;
        const existingOrder = await limitOrderData.findOne({
            user_id: userId,
            token_mint: mint,
            wallet: walletPubKey,
            status: "Pending",
        });
        const newTargetPrice1 = ((takeProfitPercent + 100) * priceUsd) / 100;
        const newTargetPrice2 = ((stopLossPercent + 100) * priceUsd) / 100;
        if (existingOrder) {
            const totalAmount = tokenBalance;
            const updatedTargetPrice1 = (existingOrder.token_amount * existingOrder.target_price1 + (tokenBalance - existingOrder.token_amount) * newTargetPrice1) / totalAmount;
            const updatedTargetPrice2 = (existingOrder.token_amount * existingOrder.target_price2 + (tokenBalance - existingOrder.token_amount) * newTargetPrice2) / totalAmount;
            await limitOrderData.updateOne(
                { _id: existingOrder._id },
                { $set: { token_amount: totalAmount, Tp: takeProfitPercent, Sl: stopLossPercent, target_price1: updatedTargetPrice1, targer_price2: updatedTargetPrice2, status: "Pending" } }
            );
        } else {
            await new limitOrderData({
                user_id: userId,
                wallet: walletPubKey,
                token_mint: mint,
                token_amount: tokenBalance,
                Tp: takeProfitPercent,
                Sl: stopLossPercent,
                target_price1: newTargetPrice1,
                target_price2: newTargetPrice2,
                status: "Pending",
            }).save();
        }
    }

    const balanceAfter = await getBalance(walletPubKey).catch(() => 0);
    const successText =
        `${await t("quickBuy.p7", userId)}\n\n` +
        `Token : <code>${mint}</code>\n\n` +
        `${await t("quickBuy.p14", userId)} : ${activeWalletDoc?.label ?? "Wallet"} - <strong>${balanceAfter.toFixed(2)} SOL</strong> ($${(balanceAfter * sol_price).toFixed(2)})\n` +
        `<code>${walletPubKey}</code>\n\n` +
        `🟢 <strong><em>${await t("quickBuy.p8", userId)}</em></strong>\n` +
        `${buyAmountSol} SOL ⇄ ${priceUsd > 0 ? (buyAmountSol * sol_price / priceUsd).toFixed(2) : "—"} ${symbol || "tokens"}\n` +
        `${await t("quickBuy.p11", userId)} ${formatNumberStyle(market_cap)}\n\n` +
        ((result.signature ? `<strong><em>${await t("quickBuy.p12", userId)}</em></strong> - <a href="https://solscan.io/tx/${result.signature}">${await t("quickBuy.p13", userId)}</a>` : ""));
    await bot.sendMessage(userId, successText, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
            inline_keyboard: [
                [
                    { text: await t("quickBuy.viewToken", userId), url: `https://solscan.io/token/${mint}` },
                    { text: await t("quickBuy.positions", userId), callback_data: "positions" },
                    { text: await t("quickBuy.sell", userId), callback_data: `sellToken_${mint}` },
                ],
                [await getCloseButton(userId)],
            ],
        },
    }).catch(() => {});
    try {
        const { caption, markup } = await getSell(userId, mint);
        await bot.sendMessage(userId, caption, { parse_mode: "HTML", reply_markup: markup }).catch(() => {});
    } catch (_) {}
}

export type MonitoredEntry = {
    user: any;
    wallet: { address: string; copyOnNewToken?: boolean; buyAmountSol?: number; label?: string };
};

async function handlePumpCreate(
    creator: string,
    mint: string,
    entries: MonitoredEntry[],
    addressKey: string,
    signature: string,
    source: "create" | "buy" = "create"
): Promise<void> {
    const pumpUrl = `https://pump.fun/coin/${mint}`;
    const solscanUrl = `https://solscan.io/token/${mint}`;
    const coinInfoPromise = getPumpFunCoinInfo(mint);
    for (const { user: u, wallet: match } of entries) {
        const userId = u.userId as number;
        const dedupKey = source === "buy" ? `buy:${userId}:${mint}:${signature || Date.now()}` : `create:${userId}:${mint}`;
        if (notifiedRecently.has(dedupKey)) continue;
        notifiedRecently.set(dedupKey, Date.now());

        const buyAmountSol = Number(match.buyAmountSol ?? 0.01);
        const trackedLabel = match.label ? `${shortAddress(creator)} (${match.label})` : shortAddress(creator);
        const walletIndex = (u.copyTrade as any)?.monitoredWallets?.findIndex((w: any) => (w.address || "").toLowerCase() === addressKey) ?? 0;

        const isAutoMode = (u.copyTrade as any)?.mode !== "manual";

        // Auto + purchase: same message as manual (position, purchase alert), then auto-buy, then result message
        if (isAutoMode && source === "buy") {
            const titleKey = "copyTrade.targetBought";
            const newTokenDetected = await t(titleKey, userId);
            const trackedWallet = await t("copyTrade.trackedWallet", userId);
            const attemptingBuy = await t("copyTrade.attemptingBuy", userId);
            const viewToken = await t("copyTrade.viewToken", userId);
            const buyToken = await t("copyTrade.buyToken", userId);
            const disclaimer = await t("copyTrade.disclaimer", userId);
            const purchaseAlertText =
                `🚀 <strong>${newTokenDetected}</strong>\n\n` +
                `<strong>${trackedWallet} : </strong> <code>${creator}</code> (${trackedLabel})\n\n` +
                `<strong>Token : </strong> <code>${mint}</code>\n\n` +
                `${attemptingBuy}\n\n` +
                `${disclaimer}`;
            const copyTradeBuyData = `copyTrade_buy_${mint}_${walletIndex}`;
            const closeBtn = await getCloseButton(userId);
            const buyButton =
                copyTradeBuyData.length <= 64
                    ? { text: buyToken, callback_data: copyTradeBuyData }
                    : { text: buyToken, url: pumpUrl };
            await bot.sendMessage(userId, purchaseAlertText, {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: viewToken, url: solscanUrl },
                            { text: "Pump.fun", url: pumpUrl },
                        ],
                        [buyButton],
                        [closeBtn],
                    ],
                },
            });

            logger.info("CopyTrade", `Auto copy-buy (purchase) — userId=${userId}, mint=${mint.slice(0, 8)}…, ${buyAmountSol} SOL`);
            const fullUser = await User.findOne({ userId });
            if (!fullUser || fullUser.chain !== "solana") { continue; }
            const activeWallet = fullUser.wallets?.find((w: any) => w.is_active_wallet);
            if (!activeWallet?.publicKey) { continue; }
            const walletPubKey =
                typeof activeWallet.publicKey === "string"
                    ? activeWallet.publicKey
                    : String((activeWallet as any).publicKey);
            const balance = await getBalance(walletPubKey).catch(() => 0);
            if (balance < buyAmountSol * 1.05) {
                const skippedMsg = await t("copyTrade.copyBuySkippedBalance", userId);
                await bot.sendMessage(userId, `${skippedMsg} ${(buyAmountSol * 1.05).toFixed(2)} SOL).`).catch(() => {});
                continue;
            }
            const pendingMsg = await t("copyTrade.copyBuyPending", userId);
            await bot.sendMessage(userId, pendingMsg).catch(() => {});
            const slippage =
                (fullUser as any).sniper?.slippage ??
                (fullUser as any).settings?.fee_setting?.slippage?.buy_slippage ??
                50;
            const fee = typeof (fullUser as any).settings?.mev === "number" ? (fullUser as any).settings.mev : 0;
            const result = await swapToken(
                userId,
                walletPubKey,
                mint,
                buyAmountSol,
                "buy",
                slippage,
                fee
            ).catch((err) => {
                logger.error("CopyTrade", "Buy failed", userId, mint, err);
                return { success: false, error: String(err) };
            });
            const coinInfo = await coinInfoPromise.catch(() => null);
            const tokenName = coinInfo?.name || coinInfo?.symbol || shortAddress(mint);
            const failedPrefix = await t("copyTrade.copyBuyFailedPurchase", userId);
            if (result?.success) {
                await applyCopyTradeBuySuccess(userId, mint, walletPubKey, buyAmountSol, result as any);
            } else {
                const errMsg = (result as any)?.error ?? "Unknown error";
                await bot.sendMessage(userId, `${failedPrefix} ${tokenName}\n${errMsg}`).catch(() => {});
            }
            continue;
        }

        // Auto + launch: buy first, then only result message (no alert)
        if (isAutoMode && source === "create") {
            logger.info("CopyTrade", `Auto copy-buy (launch) — userId=${userId}, mint=${mint.slice(0, 8)}…, ${buyAmountSol} SOL`);
            const fullUser = await User.findOne({ userId });
            if (!fullUser || fullUser.chain !== "solana") continue;
            const activeWallet = fullUser.wallets?.find((w: any) => w.is_active_wallet);
            if (!activeWallet?.publicKey) continue;
            const walletPubKey =
                typeof activeWallet.publicKey === "string"
                    ? activeWallet.publicKey
                    : String((activeWallet as any).publicKey);
            const balance = await getBalance(walletPubKey).catch(() => 0);
            if (balance < buyAmountSol * 1.05) {
                const skippedMsg = await t("copyTrade.copyBuySkippedBalance", userId);
                await bot.sendMessage(userId, `${skippedMsg} ${(buyAmountSol * 1.05).toFixed(2)} SOL).`).catch(() => {});
                continue;
            }
            const pendingMsgLaunch = await t("copyTrade.copyBuyPending", userId);
            await bot.sendMessage(userId, pendingMsgLaunch).catch(() => {});
            const slippage =
                (fullUser as any).sniper?.slippage ??
                (fullUser as any).settings?.fee_setting?.slippage?.buy_slippage ??
                50;
            const fee = typeof (fullUser as any).settings?.mev === "number" ? (fullUser as any).settings.mev : 0;
            const resultLaunch = await swapToken(
                userId,
                walletPubKey,
                mint,
                buyAmountSol,
                "buy",
                slippage,
                fee
            ).catch((err) => {
                logger.error("CopyTrade", "Buy failed", userId, mint, err);
                return { success: false, error: String(err) };
            });
            const coinInfoLaunch = await coinInfoPromise.catch(() => null);
            const tokenNameLaunch = coinInfoLaunch?.name || coinInfoLaunch?.symbol || shortAddress(mint);
            const failedPrefixLaunch = await t("copyTrade.copyBuyFailedLaunch", userId);
            if (resultLaunch?.success) {
                await applyCopyTradeBuySuccess(userId, mint, walletPubKey, buyAmountSol, resultLaunch as any);
            } else {
                const errMsg = (resultLaunch as any)?.error ?? "Unknown error";
                await bot.sendMessage(userId, `${failedPrefixLaunch} ${tokenNameLaunch}\n${errMsg}`).catch(() => {});
            }
            continue;
        }

        // Manual mode: send alert with Buy Token button (user taps to copy)
        const titleKey = source === "buy" ? "copyTrade.targetBought" : "copyTrade.newTokenDetected";
        const newTokenDetected = await t(titleKey, userId);
        const trackedWallet = await t("copyTrade.trackedWallet", userId);
        const tapBuyToCopy = await t("copyTrade.tapBuyToCopy", userId);
        const viewToken = await t("copyTrade.viewToken", userId);
        const buyToken = await t("copyTrade.buyToken", userId);
        const disclaimer = await t("copyTrade.disclaimer", userId);

        const text =
            `🚀 <strong>${newTokenDetected}</strong>\n\n` +
            `<strong>${trackedWallet} : </strong> <code>${creator}</code> (${trackedLabel})\n\n` +
            `<strong>Token : </strong> <code>${mint}</code>\n\n` +
            `${tapBuyToCopy}\n\n` +
            `${disclaimer}`;

        const copyTradeBuyData = `copyTrade_buy_${mint}_${walletIndex}`;
        const closeBtn = await getCloseButton(userId);
        const buyButton =
            copyTradeBuyData.length <= 64
                ? { text: buyToken, callback_data: copyTradeBuyData }
                : { text: buyToken, url: pumpUrl };
        await bot.sendMessage(userId, text, {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: viewToken, url: solscanUrl },
                        { text: "Pump.fun", url: pumpUrl },
                    ],
                    [buyButton],
                    [closeBtn],
                ],
            },
        });
    }
}

/**
 * Handle token create event from Pump stream when the creator is a monitored target wallet (backend-style detection).
 */
function onStreamCreate(event: PumpStreamCreateEvent): void {
    const creator = (event.txSigner ?? "").trim();
    if (!creator) return;
    const addressKey = creator.toLowerCase();
    const entries = currentMonitoredByAddress.get(addressKey);
    if (!entries?.length) return;
    const mint = event.mint ?? "";
    if (!mint) return;
    const signature = typeof event.signature === "string" ? event.signature : "";
    handlePumpCreate(creator, mint, entries, addressKey, signature, "create").catch((err) =>
        logger.error("CopyTrade", "Stream create handler error", mint, err)
    );
}

/**
 * Handle buy event from Pump stream when the buyer is a monitored target wallet (target bought an existing Pump.fun token).
 */
function onStreamBuy(event: PumpStreamBuyEvent): void {
    const buyer = (event.txSigner ?? "").trim();
    if (!buyer) return;
    const addressKey = buyer.toLowerCase();
    const entries = currentMonitoredByAddress.get(addressKey);
    if (!entries?.length) return;
    const mint = event.mint ?? "";
    if (!mint) return;
    const signature = typeof event.signature === "string" ? event.signature : "";
    const solAmount = event.solAmount ?? 0;
    logger.info("CopyTrade", `Target wallet bought — mint: ${mint}, buyer: ${buyer.slice(0, 8)}…, ${solAmount.toFixed(4)} SOL, https://pump.fun/coin/${mint}`);
    handlePumpCreate(buyer, mint, entries, addressKey, signature, "buy").catch((err) =>
        logger.error("CopyTrade", "Stream buy handler error", mint, err)
    );
}

/** Start pump stream; log new token launches and target buys; if there are monitored wallets, process create and buy matches. */
function setupPumpStreamForTargetLaunches(monitoredByAddress: Map<string, MonitoredEntry[]>): void {
    if (pumpStreamUnsubscribe !== null) return; // already registered
    startPumpStream();
    pumpStreamUnsubscribe = onPumpCreate((event) => {
        const mint = event.mint ?? "";
        const creator = (event.txSigner ?? "").trim();
        if (mint && creator) {
            logger.info("CopyTrade", `New token launch — mint: ${mint}, dev wallet: ${creator}, https://pump.fun/coin/${mint}`);
        }
        const signer = creator.toLowerCase();
        if (!currentMonitoredByAddress.has(signer)) return;
        onStreamCreate(event);
    });
    pumpStreamBuyUnsubscribe = onPumpBuy((event) => {
        const buyer = (event.txSigner ?? "").trim().toLowerCase();
        if (!currentMonitoredByAddress.has(buyer)) return;
        onStreamBuy(event);
    });
    logger.info("CopyTrade", monitoredByAddress.size > 0
        ? "Pump stream started (token launches + target wallet purchases)."
        : "Pump stream started (logging all new token launches).");
}

function setupLogSubscriptions(monitoredByAddress: Map<string, MonitoredEntry[]>): void {
    const current = new Set(monitoredByAddress.keys());
    for (const [addr, subId] of logSubscriptions.entries()) {
        if (!current.has(addr)) {
            unsubscribe(connection, subId);
            logSubscriptions.delete(addr);
        }
    }
    for (const addressKey of current) {
        if (logSubscriptions.has(addressKey)) continue;
        const entries = monitoredByAddress.get(addressKey)!;
        try {
            const subId = subscribeToWallet(
                connection,
                entries[0].wallet.address,
                async (result: TokenCreationResult) => {
                    await handlePumpCreate(
                        result.creator,
                        result.mint,
                        entries,
                        addressKey,
                        result.signature
                    );
                }
            );
            logSubscriptions.set(addressKey, subId);
        } catch (err) {
            logger.warn("CopyTrade", "onLogs subscribe failed for", addressKey, err);
        }
    }
}

async function refreshSubscriptions(): Promise<void> {
    pruneNotified();
    try {
        const users = await User.find({
            $or: [{ chain: "solana" }, { chain: { $exists: false } }],
            "copyTrade.monitoredWallets.0": { $exists: true },
        }).lean();
        const monitoredByAddress = new Map<string, MonitoredEntry[]>();
        for (const u of users) {
            if ((u as any).copyTrade?.enabled === false) continue; // copy trading turned off for this user
            const list = (u as any).copyTrade?.monitoredWallets as Array<{
                address: string;
                copyOnNewToken?: boolean;
                buyAmountSol?: number;
                label?: string;
            }> | undefined;
            if (!list?.length) continue;
            for (const w of list) {
                if (!w?.address || w.copyOnNewToken === false) continue;
                const key = w.address.toLowerCase();
                if (!monitoredByAddress.has(key)) monitoredByAddress.set(key, []);
                monitoredByAddress.get(key)!.push({ user: u, wallet: w });
            }
        }
        currentMonitoredByAddress = monitoredByAddress;
        // Always run pump stream to log all new token launches (with or without target wallets)
        setupPumpStreamForTargetLaunches(monitoredByAddress);
        if (monitoredByAddress.size === 0) {
            // No target wallets: only log all launches; no onLogs subscriptions
        } else {
            const addrList = [...monitoredByAddress.keys()].map((k) => k.slice(0, 8) + "…").join(", ");
            logger.info("CopyTrade", "Monitoring", monitoredByAddress.size, "wallet(s) for new launches:", addrList);
            setupLogSubscriptions(monitoredByAddress);
        }
    } catch (err) {
        logger.error("CopyTrade", "Refresh subscriptions error", err);
    }
}

export function startCopyTradeDetectionLoop(): NodeJS.Timeout | null {
    (async () => {
        const count = await User.countDocuments({
            $or: [{ chain: "solana" }, { chain: { $exists: false } }],
            "copyTrade.monitoredWallets.0": { $exists: true },
        });
        logger.info("CopyTrade", "Monitoring started. Watching", count, "user(s) with monitored wallets (Pump stream + onLogs).");
    })();
    refreshSubscriptions();
    refreshIntervalId = setInterval(refreshSubscriptions, SUBSCRIPTION_REFRESH_MS);
    return refreshIntervalId;
}

export function stopCopyTradeDetectionLoop(): void {
    if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
    for (const [, subId] of logSubscriptions.entries()) {
        unsubscribe(connection, subId);
    }
    logSubscriptions.clear();
    if (pumpStreamUnsubscribe !== null) {
        pumpStreamUnsubscribe();
        pumpStreamUnsubscribe = null;
    }
    if (pumpStreamBuyUnsubscribe !== null) {
        pumpStreamBuyUnsubscribe();
        pumpStreamBuyUnsubscribe = null;
    }
    stopPumpStream();
    currentMonitoredByAddress = new Map();
}

export async function runCopyTradeDetection(): Promise<void> {
    await refreshSubscriptions();
}
