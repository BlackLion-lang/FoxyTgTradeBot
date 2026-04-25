import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { TippingSettings } from "../../../models/tipSettings";
import { t } from "../../../locales";
import {
    portfolioSnapshot,
    periodActivity,
    periodPnlDeltaUsd,
    periodDurationMs,
    closedPositionWinRatePercent,
    type PnlPeriodKey,
} from "../../../services/solanaPnlStats";

function adminFeeFrac(userId: number, feePct: number): number {
    if (userId === 7994989802 || userId === 2024002049) return 0;
    return feePct / 100;
}

function fmtUsd(n: number): string {
    if (!Number.isFinite(n)) return "$0.00";
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    const v = Math.abs(n);
    if (abs >= 1e6) return `${sign}$${(v / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}$${(v / 1e3).toFixed(2)}K`;
    return `${sign}$${v.toFixed(2)}`;
}

export async function clearSolanaTradeHistory(userId: number): Promise<void> {
    const user = await User.findOne({ userId });
    if (!user?.wallets?.length) return;
    for (const w of user.wallets) {
        if (w.tradeHistory?.length) w.tradeHistory.splice(0, w.tradeHistory.length);
    }
    await user.save();
}

export async function buildPnlCaption(userId: number, period: PnlPeriodKey): Promise<string> {
    const user = await User.findOne({ userId });
    const settings = await TippingSettings.findOne().lean();
    const feePct = (settings as { feePercentage?: number } | null)?.feePercentage ?? 0;
    const fee = adminFeeFrac(userId, feePct);
    const walletsPlain = (user?.wallets || []) as unknown as Parameters<typeof portfolioSnapshot>[0];
    const now = Date.now();

    const snap = portfolioSnapshot(walletsPlain, Infinity, fee);
    const dur = periodDurationMs(period);
    let periodDeltaLine = "";
    if (dur != null) {
        const d = periodPnlDeltaUsd(walletsPlain, dur, fee, now);
        const label = await t(`pnl.periodTag_${period}`, userId);
        periodDeltaLine = `\n${await t("pnl.periodDelta", userId)} (${label}) : <strong>${fmtUsd(d)}</strong>`;
    }

    const startAct = dur == null ? 0 : now - dur;
    const act = periodActivity(walletsPlain, startAct, now, fee);
    const winRate = closedPositionWinRatePercent(snap.closedWinners, snap.closedLosers);

    const walletLines: string[] = [];
    for (const [, v] of snap.byWallet) {
        walletLines.push(
            `  • ${escapeHtml(v.label)}: ${fmtUsd(v.pnlUsd)} · ${v.tradeCount} ${await t("pnl.trades", userId)}`,
        );
    }

    const tokArr = [...snap.byToken.entries()].map(([mint, v]) => ({ mint, ...v }));
    tokArr.sort((a, b) => b.pnlUsd - a.pnlUsd);
    const topWin = tokArr.filter((x) => x.pnlUsd > 0).slice(0, 5);
    const topLose = tokArr.filter((x) => x.pnlUsd < 0).sort((a, b) => a.pnlUsd - b.pnlUsd).slice(0, 5);

    const periodLabel = await t(`pnl.periodTag_${period}`, userId);

    let body =
        `<strong>${await t("pnl.title", userId)}</strong>\n` +
        `<em>${await t("pnl.solanaOnly", userId)}</em>\n\n` +
        `${await t("pnl.period", userId)} : <strong>${periodLabel}</strong>\n` +
        `${await t("pnl.totalPnl", userId)} : <strong>${fmtUsd(snap.totalPnlUsd)}</strong>` +
        periodDeltaLine +
        `\n${await t("pnl.realizedClosed", userId)} : ${fmtUsd(snap.closedPnlUsd)}\n` +
        `${await t("pnl.unrealizedOpen", userId)} : ${fmtUsd(snap.openPnlUsd)}\n\n` +
        `${await t("pnl.activityInPeriod", userId)} :\n` +
        `  ${await t("pnl.trades", userId)} : ${act.tradeCount}\n` +
        `  ${await t("pnl.volume", userId)} : ${fmtUsd(act.volumeUsd)}\n` +
        `  ${await t("pnl.fees", userId)} : ${fmtUsd(act.feesUsd)}\n` +
        `  ${await t("pnl.winRate", userId)} : ${winRate.toFixed(1)}% <i>(${await t("pnl.winRateHint", userId)})</i>\n\n` +
        `${await t("pnl.bestTrade", userId)} : ${fmtUsd(act.bestSellUsd)} <i>${escapeHtml(act.bestSellLabel)}</i>\n` +
        `${await t("pnl.worstTrade", userId)} : ${fmtUsd(act.worstSellUsd)} <i>${escapeHtml(act.worstSellLabel)}</i>\n\n` +
        `${await t("pnl.byWallet", userId)} :\n${walletLines.length ? walletLines.join("\n") : "  —"}\n\n` +
        `${await t("pnl.byChain", userId)} : Solana — ${fmtUsd(snap.totalPnlUsd)}\n\n` +
        `${await t("pnl.topWinners", userId)} :\n`;

    for (const row of topWin) {
        body += `  • ${escapeHtml(row.name)} : +${fmtUsd(row.pnlUsd)}\n`;
    }
    if (!topWin.length) body += `  —\n`;
    body += `\n${await t("pnl.topLosers", userId)} :\n`;
    for (const row of topLose) {
        body += `  • ${escapeHtml(row.name)} : ${fmtUsd(row.pnlUsd)}\n`;
    }
    if (!topLose.length) body += `  —\n`;
    body += `\n<i>${await t("pnl.disclaimer", userId)}</i>`;

    if (body.length > 4000) {
        body = body.slice(0, 3990) + "…</i>";
    }
    return body;
}

function escapeHtml(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

async function periodButtonText(userId: number, p: PnlPeriodKey, current: PnlPeriodKey): Promise<string> {
    const mark = p === current ? "🟠" : " ";
    const key =
        p === "1d" ? "btn1d" : p === "7d" ? "btn7d" : p === "30d" ? "btn30d" : "btnAll";
    return `${mark}${await t(`pnl.${key}`, userId)}`;
}

export async function getPnlMarkup(userId: number, period: PnlPeriodKey): Promise<TelegramBot.InlineKeyboardMarkup> {
    const periods: PnlPeriodKey[] = ["1d", "7d", "30d", "all"];
    const row1: TelegramBot.InlineKeyboardButton[] = [];
    for (const p of periods) {
        row1.push({
            text: await periodButtonText(userId, p, period),
            callback_data: `pnl_p_${p}`,
        });
    }
    return {
        inline_keyboard: [
            row1,
            [
                { text: await t("pnl.refresh", userId), callback_data: `pnl_r_${period}` },
                { text: await t("pnl.clearHistory", userId), callback_data: `pnl_z_${period}` },
            ],
            [{ text: await t("backMenu", userId), callback_data: "menu_back" }],
        ],
    };
}

export async function getPnlConfirmClearMarkup(
    userId: number,
    period: PnlPeriodKey,
): Promise<TelegramBot.InlineKeyboardMarkup> {
    return {
        inline_keyboard: [
            [
                { text: await t("pnl.clearYes", userId), callback_data: `pnl_z_ok_${period}` },
                { text: await t("pnl.clearNo", userId), callback_data: `pnl_z_x_${period}` },
            ],
        ],
    };
}

export async function sendPnlMessage(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    period: PnlPeriodKey = "7d",
): Promise<void> {
    const caption = await buildPnlCaption(userId, period);
    const markup = await getPnlMarkup(userId, period);
    await bot.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: markup, disable_web_page_preview: true });
}

export async function editPnlMessage(
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    userId: number,
    period: PnlPeriodKey,
): Promise<void> {
    const caption = await buildPnlCaption(userId, period);
    const markup = await getPnlMarkup(userId, period);
    try {
        await bot.editMessageText(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
            disable_web_page_preview: true,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("message is not modified")) {
            console.error("editPnlMessage:", e);
        }
    }
}
