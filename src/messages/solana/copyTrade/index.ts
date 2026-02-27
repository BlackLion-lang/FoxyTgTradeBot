import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { getCloseButton } from "../../../utils/markup";

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
        body = `${currentlyMonitoring} <strong>${count}</strong> ${walletsLabel}:\n\n${lines.join("\n")}`;
    }

    const caption = `<strong>📋 ${title}</strong>\n\n${subtitle}\n\n${body}`;

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

    const selectPrompt = list.length ? "Select a wallet to remove from monitoring:" : "No wallets to remove.";
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
    const walletSettings = await t("copyTrade.walletSettings", userId);
    const back = await t("copyTrade.back", userId);
    const noWalletsInSettings = await t("copyTrade.noWalletsInSettings", userId);

    const body = list.length
        ? list.map((w: { address: string; label?: string }, i: number) => `${i + 1}. ${shortAddress(w.address)}${w.label ? ` — ${w.label}` : ""}`).join("\n")
        : noWalletsInSettings;
    const caption = `<strong>⚙️ ${walletSettings}</strong>\n\n${body}`;

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

    const caption =
        `<strong>⚙️ ${settingsFor}</strong> <code>${shortAddress(w.address)}</code>\n\n` +
        `• ${copyOnNewToken}: ${w.copyOnNewToken ? "✅" : "❌"}\n` +
        `• ${buyAmount}: ${w.buyAmountSol ?? 0.01} SOL\n` +
        `• ${minAmount}: ${w.minAmountSol ?? 0} SOL\n` +
        `• ${maxAmount}: ${w.maxAmountSol ?? 100} SOL\n` +
        (w.label ? `• Label: ${w.label}\n` : "");

    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: `${copyOnNewToken}: ${w.copyOnNewToken ? "✅" : "❌"}`, callback_data: `copyTrade_toggle_${walletIndex}` }],
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
        `• ${takeProfitLabel}: <strong>${tp}%</strong>\n` +
        `• ${stopLossLabel}: <strong>${sl}%</strong>\n\n` +
        tpSlOnlyCopy;

    const inline_keyboard: TelegramBot.InlineKeyboardButton[][] = [
        [{ text: tpSlEnabled ? `✅ ${tpSlOnLabel}` : `❌ ${tpSlOffLabel}`, callback_data: "copyTrade_toggle_tp_sl" }],
        [{ text: `${takeProfitLabel} (${tp}%)`, callback_data: "copyTrade_set_tp" }],
        [{ text: `${stopLossLabel} (${sl}%)`, callback_data: "copyTrade_set_sl" }],
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
