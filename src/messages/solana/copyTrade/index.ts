import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { getCloseButton } from "../../../utils/markup";
import { mergeWalletCopyConfig } from "../../../services/copyTradeSizing";

const MONITORED_MAX = 20;
const ADDRESS_SHORT_LEN = 6;
const COPYTRADE_IMAGE_PATH = "./src/assets/Copytrading.jpg";

function shortAddress(addr: string): string {
    if (!addr || addr.length <= ADDRESS_SHORT_LEN * 2) return addr;
    return `${addr.slice(0, ADDRESS_SHORT_LEN)}...${addr.slice(-ADDRESS_SHORT_LEN)}`;
}

export async function getCopyTradeMain(userId: number): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const list = user.copyTrade?.monitoredWallets || [];
    const count = list.length;
    const enabled = (user.copyTrade as any)?.enabled !== false;

    const title = await t("copyTrade.title", userId);
    const subtitle = await t("copyTrade.subtitle", userId);
    const currentlyMonitoring = await t("copyTrade.currentlyMonitoring", userId);
    const walletsLabel = await t("copyTrade.wallets", userId);
    const noWallets = await t("copyTrade.noWallets", userId);
    const addFirst = await t("copyTrade.addFirst", userId);
    const enabledOn = await t("copyTrade.enabledOn", userId);
    const enabledOff = await t("copyTrade.enabledOff", userId);

    let body: string;
    if (count === 0) {
        body = `${noWallets}\n\n${addFirst}`;
    } else {
        const lines = list.map((w: { address: string; label?: string }, i: number) => {
            const label = w.label ? ` (${w.label})` : "";
            return `${i + 1}. <code>${shortAddress(w.address)}</code>${label}`;
        });
        body = `${currentlyMonitoring} <strong>${count}</strong> ${walletsLabel} :\n\n${lines.join("\n")}`;
    }

    const needHelp = await t("settings.p2", userId);
    const clickHere = await t("settings.p3", userId);
    const helpLine = `${needHelp}\n <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=copytrading&sig=G2kcUvUfL70RGTIkHF-65bjFvo2YGPwU
">${clickHere}</a>`;
    const caption = `<strong>🎯 ${title}</strong>\n\n${subtitle}\n\n${helpLine}\n\n${body}`;

    const modeAuto = await t("copyTrade.modeAuto", userId);
    const modeManual = await t("copyTrade.modeManual", userId);
    const modeIsAuto = (user.copyTrade as any)?.mode !== "manual";
    const addWallet = await t("copyTrade.addWallet", userId);
    const removeWallet = await t("copyTrade.removeWallet", userId);
    const walletSettings = await t("copyTrade.walletSettings", userId);
    const tpSlLabel = await t("copyTrade.tpSl", userId);
    const back = await t("copyTrade.back", userId);

    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: enabled ? `✅ ${enabledOn}` : `❌ ${enabledOff}`, callback_data: "copyTrade_toggle_enabled" }],
        [{ text: modeIsAuto ? `🟢 ${modeAuto}` : `🔵 ${modeManual}`, callback_data: "copyTrade_toggle_mode" }],
        [{ text: `📈 ${tpSlLabel}`, callback_data: "copyTrade_tp_sl" }],
        [{ text: `➕ ${addWallet}`, callback_data: "copyTrade_add" }],
        [
            { text: `🗑 ${removeWallet}`, callback_data: "copyTrade_remove_menu" },
            { text: `⚙️ ${walletSettings}`, callback_data: "copyTrade_settings_menu" },
        ],
        [{ text: `⬅ ${back}`, callback_data: "menu_back" }],
        // [await getCloseButton(userId)],
    ];

    return { caption, markup: { inline_keyboard } };
}

export async function getCopyTradeRemoveMenu(userId: number): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const list = user.copyTrade?.monitoredWallets || [];
    const removeWallet = await t("copyTrade.removeWallet", userId);
    const back = await t("copyTrade.back", userId);
    const selectWalletToRemove = await t("copyTrade.selectWalletToRemove", userId);
    const noWalletsToRemove = await t("copyTrade.noWalletsToRemove", userId);

    const selectPrompt = list.length ? selectWalletToRemove : noWalletsToRemove;
    const caption = `<strong>🗑 ${removeWallet}</strong>\n\n${selectPrompt}\n\n${list.map((w: { address: string; label?: string }, i: number) => `${i + 1}. ${shortAddress(w.address)}${w.label ? ` (${w.label})` : ""}`).join("\n") || "—"}`;

    const rows: TelegramBot.InlineKeyboardButton[][] = list.slice(0, MONITORED_MAX).map((_: unknown, i: number) => [
        { text: `${i + 1}. ${shortAddress(list[i].address)}`, callback_data: `copyTrade_remove_${i}` },
    ]);
    rows.push([{ text: `⬅ ${back}`, callback_data: "copyTrade_back" }]);
    // rows.push([await getCloseButton(userId)]);

    return { caption, markup: { inline_keyboard: rows } };
}

export async function getCopyTradeSettingsMenu(userId: number): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const list = user.copyTrade?.monitoredWallets || [];
    const settingsMenuTitle = await t("copyTrade.settingsMenuTitle", userId);
    const walletSettings = await t("copyTrade.walletSettings", userId);
    const back = await t("copyTrade.back", userId);
    const noWalletsInSettings = await t("copyTrade.noWalletsInSettings", userId);

    const body = list.length
        ? list.map((w: { address: string; label?: string }, i: number) => `${i + 1}. ${shortAddress(w.address)}${w.label ? ` — ${w.label}` : ""}`).join("\n")
        : noWalletsInSettings;
    const caption = `<strong>${settingsMenuTitle}</strong>\n\n<strong>⚙️ ${walletSettings}</strong>\n\n${body}`;

    const rows: TelegramBot.InlineKeyboardButton[][] = list.length
        ? list.slice(0, MONITORED_MAX).map((_: unknown, i: number) => [
            { text: `#${i + 1} ${shortAddress(list[i].address)}`, callback_data: `copyTrade_settings_${i}` },
        ])
        : [];
    rows.push([{ text: `⬅ ${back}`, callback_data: "copyTrade_back" }]);
    // rows.push([await getCloseButton(userId)]);

    return { caption, markup: { inline_keyboard: rows } };
}

export async function getCopyTradeWalletSettings(
    userId: number,
    walletIndex: number
): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const list = user.copyTrade?.monitoredWallets || [];
    const w = list[walletIndex];
    if (!w) {
        const { caption, markup } = await getCopyTradeMain(userId);
        return { caption, markup };
    }

    const settingsFor = await t("copyTrade.settingsFor", userId);
    const copyOnNewToken = await t("copyTrade.copyOnNewToken", userId);
    const buyAmount = await t("copyTrade.buyAmount", userId);
    const minAmount = await t("copyTrade.minAmount", userId);
    const maxAmount = await t("copyTrade.maxAmount", userId);
    const rename = await t("copyTrade.rename", userId);
    const remove = await t("copyTrade.remove", userId);
    const back = await t("copyTrade.back", userId);
    const label = await t("copyTrade.label", userId);
    const copyModeBuyOnly = await t("copyTrade.copyModeBuyOnly", userId);
    const copyModeBuySell = await t("copyTrade.copyModeBuySell", userId);
    const sizingFilters = await t("copyTrade.sizingFilters", userId);
    const copyModeLabel = await t("copyTrade.copyMode", userId);
    const isBuySell = (w as { copyFollowMode?: string }).copyFollowMode === "buy_sell";

    const caption =
        `<strong>⚙️ ${settingsFor}</strong> <code>${shortAddress(w.address)}</code>\n\n` +
        `• ${copyOnNewToken} : ${w.copyOnNewToken ? "✅" : "❌"}\n` +
        `• ${copyModeLabel} : ${isBuySell ? copyModeBuySell : copyModeBuyOnly}\n` +
        `• ${buyAmount} : ${w.buyAmountSol ?? 0.01} SOL\n` +
        `• ${minAmount} : ${w.minAmountSol ?? 0} SOL\n` +
        `• ${maxAmount} : ${(w.maxAmountSol ?? 0) > 0 ? `${w.maxAmountSol} SOL` : await t("copyTrade.noMaxTargetSol", userId)}\n` +
        (w.label ? `• ${label} : ${w.label}\n` : "");

    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: `${copyOnNewToken} ${w.copyOnNewToken ? "✅" : "❌"}`, callback_data: `copyTrade_toggle_${walletIndex}` }],
        [
            {
                text: isBuySell ? `🔁 ${copyModeBuySell}` : `📥 ${copyModeBuyOnly}`,
                callback_data: `cwz_${walletIndex}_follow`,
            },
        ],
        [{ text: `📐 ${sizingFilters}`, callback_data: `cwz_${walletIndex}_open` }],
        [{ text: `${buyAmount}`, callback_data: `copyTrade_buyAmount_${walletIndex}` }],
        [
            { text: `${minAmount}`, callback_data: `copyTrade_minAmount_${walletIndex}` },
            { text: `${maxAmount}`, callback_data: `copyTrade_maxAmount_${walletIndex}` },
        ],
        [
            { text: `✏️ ${rename}`, callback_data: `copyTrade_rename_${walletIndex}` },
            { text: `🗑 ${remove}`, callback_data: `copyTrade_remove_${walletIndex}` },
        ],
        [{ text: `⬅ ${back}`, callback_data: "copyTrade_settings_menu" }],
        // [await getCloseButton(userId)],
    ];

    return { caption, markup: { inline_keyboard } };
}

export async function sendCopyTradeMessage(
    bot: TelegramBot,
    chatId: number,
    userId: number
): Promise<TelegramBot.Message> {
    const { caption, markup } = await getCopyTradeMain(userId);
    return bot.sendPhoto(chatId, COPYTRADE_IMAGE_PATH, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function editCopyTradeMessage(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeMain(userId);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function sendCopyTradeRemoveMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number
): Promise<TelegramBot.Message> {
    const { caption, markup } = await getCopyTradeRemoveMenu(userId);
    return bot.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: markup });
}

export async function sendCopyTradeSettingsMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number
): Promise<TelegramBot.Message> {
    const { caption, markup } = await getCopyTradeSettingsMenu(userId);
    return bot.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: markup });
}

export async function editCopyTradeToMain(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeMain(userId);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function editCopyTradeToRemoveMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeRemoveMenu(userId);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function editCopyTradeToSettingsMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeSettingsMenu(userId);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function getCopyTradeTpSlMenu(userId: number): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const tpSlEnabled = (user.copyTrade as any)?.tpSlEnabled !== false;
    const tp = (user.copyTrade as any)?.takeProfitPercent ?? 10;
    const sl = (user.copyTrade as any)?.stopLossPercent ?? -40;
    const tpSlLabel = await t("copyTrade.tpSl", userId);
    const tpSlOnLabel = await t("copyTrade.tpSlOn", userId);
    const tpSlOffLabel = await t("copyTrade.tpSlOff", userId);
    const takeProfitLabel = await t("copyTrade.takeProfit", userId);
    const stopLossLabel = await t("copyTrade.stopLoss", userId);
    const back = await t("copyTrade.back", userId);

    const tpSlOnlyCopy = await t("copyTrade.tpSlOnlyCopy", userId);
    const caption =
        `<strong>📈 ${tpSlLabel}</strong>\n\n` +
        `• ${takeProfitLabel} : <strong>${tp}%</strong>\n` +
        `• ${stopLossLabel} : <strong>${sl}%</strong>\n\n` +
        tpSlOnlyCopy;

    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: tpSlEnabled ? `✅ ${tpSlOnLabel}` : `❌ ${tpSlOffLabel}`, callback_data: "copyTrade_toggle_tp_sl" }],
        [{ text: `${takeProfitLabel} : (${tp}%)`, callback_data: "copyTrade_set_tp" }],
        [{ text: `${stopLossLabel} : (${sl}%)`, callback_data: "copyTrade_set_sl" }],
        [{ text: `⬅ ${back}`, callback_data: "copyTrade_back" }],
    ];

    return { caption, markup: { inline_keyboard } };
}

export async function editCopyTradeToTpSlMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeTpSlMenu(userId);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function getCopyTradeWalletSizingMenu(
    userId: number,
    walletIndex: number,
): Promise<{ caption: string; markup: TelegramBot.InlineKeyboardMarkup }> {
    const user = (await User.findOne({ userId })) || new User();
    const list = user.copyTrade?.monitoredWallets || [];
    const w = list[walletIndex];
    if (!w) {
        return getCopyTradeWalletSettings(userId, walletIndex);
    }
    const ct = (user.copyTrade as any) || {};
    const cfg = mergeWalletCopyConfig(ct, w as unknown as Record<string, unknown>);
    const num = (v: unknown, def: number): number => {
        const n = Number(v ?? def);
        return Number.isFinite(n) ? n : def;
    };
    const mode = String(cfg.sizingMode || "fixed");
    const pct = num(cfg.sizingPercentWallet, 5);
    const ratio = num(cfg.proportionalRatio, 1);
    const maxCap = num(cfg.maxAmountPerTradeSol, 10);
    const minM = num(cfg.filterMinMcapUsd, 0);
    const maxM = num(cfg.filterMaxMcapUsd, 0);
    const minL = num(cfg.filterMinLiquidityUsd, 0);
    const ageMin = num(cfg.filterMinTokenAgeMinutes, 0);
    const minV = num(cfg.filterMinVolumeUsd, 0);
    const bl = (cfg.filterTokenBlacklist as string[] | undefined)?.length ?? 0;
    const wl = (cfg.filterTokenWhitelist as string[] | undefined)?.length ?? 0;

    const title = await t("copyTrade.sizingMenuTitle", userId);
    const modeFixed = await t("copyTrade.modeFixed", userId);
    const modePct = await t("copyTrade.modePercentWallet", userId);
    const modeProp = await t("copyTrade.modeProportional", userId);
    const modeLine = await t("copyTrade.sizingCurrentMode", userId);
    const sumWalletPct = await t("copyTrade.summaryWalletPercent", userId);
    const sumRatio = await t("copyTrade.summaryRatio", userId);
    const sumMax = await t("copyTrade.summaryMaxSol", userId);
    const sumMinM = await t("copyTrade.summaryMinMcap", userId);
    const sumMaxM = await t("copyTrade.summaryMaxMcap", userId);
    const sumLiq = await t("copyTrade.summaryMinLiq", userId);
    const sumAge = await t("copyTrade.summaryMinAge", userId);
    const sumVol = await t("copyTrade.summaryMinVol", userId);
    const sumBl = await t("copyTrade.summaryBlacklist", userId);
    const sumWl = await t("copyTrade.summaryWhitelist", userId);
    const tapCycle = await t("copyTrade.tapModeCycle", userId);
    const back = await t("copyTrade.back", userId);

    const modeLabel = mode === "percent_wallet" ? modePct : mode === "proportional_source" ? modeProp : modeFixed;
    const off = await t("copyTrade.filterOff", userId);

    const perWalletNote = await t("copyTrade.sizingPerWalletNote", userId);

    const caption =
        `<strong>📐 ${title}</strong>\n\n` +
        `${perWalletNote}\n\n` +
        `${modeLine} <strong>${modeLabel}</strong>\n` +
        `• ${sumWalletPct} : ${pct}%\n` +
        `• ${sumRatio} : ${ratio}\n` +
        `• ${sumMax} : ${maxCap > 0 ? `${maxCap} SOL` : off}\n\n` +
        `<strong>${await t("copyTrade.filtersSection", userId)}</strong>\n` +
        `• ${sumMinM} : ${minM > 0 ? `$${minM}` : off}\n` +
        `• ${sumMaxM} : ${maxM > 0 ? `$${maxM}` : off}\n` +
        `• ${sumLiq} : ${minL > 0 ? `$${minL}` : off}\n` +
        `• ${sumAge} : ${ageMin > 0 ? `${ageMin} min` : off}\n` +
        `• ${sumVol} : ${minV > 0 ? `$${minV}` : off}\n` +
        `• ${sumBl} : ${bl}\n` +
        `• ${sumWl} : ${wl > 0 ? wl : off}`;

    const setPct = await t("copyTrade.btnSetWalletPct", userId);
    const setRatio = await t("copyTrade.btnSetRatio", userId);
    const setMax = await t("copyTrade.btnSetMaxSol", userId);
    const bMinM = await t("copyTrade.btnMinMcap", userId);
    const bMaxM = await t("copyTrade.btnMaxMcap", userId);
    const bLiq = await t("copyTrade.btnMinLiq", userId);
    const bAge = await t("copyTrade.btnMinAge", userId);
    const bVol = await t("copyTrade.btnMinVol", userId);
    const bBl = await t("copyTrade.btnBlacklist", userId);
    const bWl = await t("copyTrade.btnWhitelist", userId);

    const i = walletIndex;
    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: `🔁 ${tapCycle}: ${modeLabel}`, callback_data: `cwz_${i}_mode` }],
        [
            { text: setPct, callback_data: `cwz_${i}_pct` },
            { text: setRatio, callback_data: `cwz_${i}_ratio` },
        ],
        [{ text: setMax, callback_data: `cwz_${i}_max` }],
        [
            { text: bMinM, callback_data: `cwz_${i}_fm` },
            { text: bMaxM, callback_data: `cwz_${i}_fM` },
        ],
        [
            { text: bLiq, callback_data: `cwz_${i}_fl` },
            { text: bAge, callback_data: `cwz_${i}_fa` },
        ],
        [{ text: bVol, callback_data: `cwz_${i}_fv` }],
        [
            { text: bBl, callback_data: `cwz_${i}_bl` },
            { text: bWl, callback_data: `cwz_${i}_wl` },
        ],
        [{ text: `⬅ ${back}`, callback_data: `copyTrade_settings_${i}` }],
    ];

    return { caption, markup: { inline_keyboard } };
}

export async function editCopyTradeToWalletSizingMenu(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    walletIndex: number,
): Promise<void> {
    const { caption, markup } = await getCopyTradeWalletSizingMenu(userId, walletIndex);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function sendCopyTradeWalletSettings(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    walletIndex: number
): Promise<TelegramBot.Message> {
    const { caption, markup } = await getCopyTradeWalletSettings(userId, walletIndex);
    return bot.sendMessage(chatId, caption, { parse_mode: "HTML", reply_markup: markup });
}

/** Send wallet settings as a photo (same image as main) so Back/edits work. Use when returning from a text-only prompt. */
export async function sendCopyTradeWalletSettingsPhoto(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    walletIndex: number
): Promise<TelegramBot.Message> {
    const { caption, markup } = await getCopyTradeWalletSettings(userId, walletIndex);
    return bot.sendPhoto(chatId, COPYTRADE_IMAGE_PATH, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}

export async function editCopyTradeWalletSettings(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    walletIndex: number
): Promise<void> {
    const { caption, markup } = await getCopyTradeWalletSettings(userId, walletIndex);
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
}
