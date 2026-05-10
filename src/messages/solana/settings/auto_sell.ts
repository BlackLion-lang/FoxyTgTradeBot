import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { clampInactivityMinutes } from "../../../services/sellOnNoActivity";

/** Telegram photo captions are capped at 1024 chars (Bot API). */
const TELEGRAM_PHOTO_CAPTION_MAX = 1024;

function escapeHtmlText(s: string): string {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

/** `&` in query strings must be escaped or Telegram HTML parsing breaks (link + bold lost). */
function telegramHtmlHref(url: string): string {
    return String(url).replace(/&/g, "&amp;");
}

function clampAutoSellPhotoCaption(html: string): string {
    if (html.length <= TELEGRAM_PHOTO_CAPTION_MAX) return html;
    const withoutItalic = html.replace(/<i>[\s\S]*?<\/i>\n?/g, "");
    if (withoutItalic.length <= TELEGRAM_PHOTO_CAPTION_MAX) return withoutItalic;
    console.warn(
        `[autoSell] caption still too long (${withoutItalic.length} chars); plain fallback (help stays at top + keyboard button)`,
    );
    const plain = withoutItalic.replace(/<\/?[^>]+(>|$)/g, "");
    return plain.slice(0, TELEGRAM_PHOTO_CAPTION_MAX - 1).trimEnd() + "…";
}

export const getAutoSell = async (
    userId: number,
) => {
    const user = await User.findOne({ userId });
    if (!user) throw "No User";
    
    const { getUserChain } = await import("../../../utils/chain");
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";
    
    const takeProfitPercent = isEthereum 
        ? (user.settings.auto_sell.takeProfitPercent_ethereum ?? 10)
        : (user.settings.auto_sell.takeProfitPercent_solana ?? 10);
    const stopLossPercent = isEthereum
        ? (user.settings.auto_sell.stopLossPercent_ethereum ?? -40)
        : (user.settings.auto_sell.stopLossPercent_solana ?? -40);
    
    const active_wallet = isEthereum 
        ? user.ethereumWallets.find((wallet: any) => wallet.is_active_wallet)
        : user.wallets.find((wallet: any) => wallet.is_active_wallet);
    if (!active_wallet) throw "No active Wallet";
    const enabled = isEthereum 
        ? (user.settings.auto_sell?.enabled_ethereum ?? false)
        : (user.settings.auto_sell?.enabled_solana ?? false);

    const noActEnabled = isEthereum
        ? (user.settings.auto_sell?.sellOnNoActivityEnabled_ethereum ?? false)
        : (user.settings.auto_sell?.sellOnNoActivityEnabled_solana ?? false);
    const noActMins = clampInactivityMinutes(
        isEthereum
            ? user.settings.auto_sell?.sellOnNoActivityMinutes_ethereum
            : user.settings.auto_sell?.sellOnNoActivityMinutes_solana,
    );

    const devSellEnabled = !isEthereum && (user.settings.auto_sell?.sellOnDevSellEnabled_solana ?? false);
    const devMinSol = !isEthereum ? Number(user.settings.auto_sell?.sellOnDevSellMinSol_solana ?? 0) : 0;
    const devMinSupply = !isEthereum ? Number(user.settings.auto_sell?.sellOnDevSellMinSupplyPercent_solana ?? 0) : 0;
    const devPosPct = !isEthereum
        ? Math.min(100, Math.max(1, Math.floor(Number(user.settings.auto_sell?.sellOnDevSellPositionPercent_solana ?? 100))))
        : 100;

    const chainName = isEthereum ? "Ethereum" : "Solana";
    const chainEmoji = isEthereum ? "🟠" : "🟠";
    const autoSellHelpUrl = isEthereum
        ? "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=eth&section=venteauto&sig=WO31GUxNRLMuWWA7TesQ_ynvgtV13XZK"
        : "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=venteauto&sig=scUK6DZdM5KF7JMttGwra126UBqUZYgN";

    const helpHref = telegramHtmlHref(autoSellHelpUrl);
    const helpLinkLabel = await t("autoSell.p3", userId);
    /** Telegram counts HTML toward 1024; `<b>` saves ~10 chars per emphasis vs `<strong>`. */
    const b = (inner: string) => `<b>${inner}</b>`;

    const walletLine = b(
        `${escapeHtmlText(String(user.username))} (${await t("autoSell.p5", userId)}) : ${escapeHtmlText(String(active_wallet.label))}`,
    );

    const pumpFunHref = telegramHtmlHref("https://pump.fun");

    const assembleCaption = async (noActivityHintText: string) => {
        const helpAnchor =
            `${escapeHtmlText(await t("autoSell.p2", userId))}\n` +
            `<a href="${helpHref}">${escapeHtmlText(helpLinkLabel)}</a>\n\n`;

        const devHintBlock =
            !isEthereum
                ? `${escapeHtmlText(await t("autoSell.devSellHintBeforePumpLink", userId))}` +
                  `<a href="${pumpFunHref}">pump.fun</a>` +
                  `${escapeHtmlText(await t("autoSell.devSellHintAfterPumpLink", userId))}\n\n`
                : "";

        return (
            `${b(escapeHtmlText(await t("autoSell.p1", userId)))}\n\n` +
            helpAnchor +
            `${escapeHtmlText(await t("autoSell.p4", userId))}\n\n` +
            `${b(escapeHtmlText(await t("autoSell.currentChain", userId)))} ${chainEmoji} ${b(chainName)}\n\n` +
            `${walletLine}\n` +
            `<code>${escapeHtmlText(String(active_wallet.publicKey))}</code>\n\n` +
            `${b(escapeHtmlText(await t("autoSell.p6", userId)))} ${takeProfitPercent}%\n` +
            `${b(escapeHtmlText(await t("autoSell.p7", userId)))} ${stopLossPercent}%\n\n` +
            `${b(escapeHtmlText(await t("autoSell.noActivityTitle", userId)))} ${noActEnabled ? "🟢" : "🔴"}\n` +
            `${escapeHtmlText(noActivityHintText)}\n` +
            `${b(`${escapeHtmlText(await t("autoSell.noActivityPeriodLabel", userId))} : ${noActMins} min`)}\n\n` +
            (!isEthereum
                ? `${b(escapeHtmlText(await t("autoSell.devSellTitle", userId)))} ${devSellEnabled ? "🟢" : "🔴"}\n` +
                  devHintBlock +
                  `${b(`${escapeHtmlText(await t("autoSell.devSellMinSolLabel", userId))} : ${devMinSol}`)}\n` +
                  `${b(`${escapeHtmlText(await t("autoSell.devSellMinSupplyLabel", userId))} : ${devMinSupply}%`)}\n` +
                  `${b(`${escapeHtmlText(await t("autoSell.devSellPositionLabel", userId))} : ${devPosPct}%`)}\n\n`
                : "") +
            `${b(escapeHtmlText(await t("autoSell.p8", userId)))}`
        );
    };

    const hintFull = await t("autoSell.noActivityHint", userId);
    const hintShort = await t("autoSell.noActivityHintShort", userId);
    const hintMinimal = await t("autoSell.noActivityHintMinimal", userId);

    let caption = await assembleCaption(hintFull);
    if (caption.length > TELEGRAM_PHOTO_CAPTION_MAX) {
        caption = await assembleCaption(hintShort);
    }
    if (caption.length > TELEGRAM_PHOTO_CAPTION_MAX) {
        caption = await assembleCaption(hintMinimal);
    }

    const captionClamped = clampAutoSellPhotoCaption(caption);

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: enabled ? `🟢 ${await t('autoSell.status1', userId)}` : `🔴 ${await t('autoSell.status2', userId)}`,
                callback_data: "settings_auto_Sell_toggle",
            },
            {
                text: "💸 TP & SL",
                callback_data: "settings_auto_Sell_tp_sl",
            },
        ],
        [
            {
                text: `${noActEnabled ? "🟢" : "🔴"} ${await t("autoSell.noActivityTitle", userId)}`,
                callback_data: "autoSell_no_activity_toggle",
            },
        ],
        [
            {
                text: `⏱ ${noActMins} min`,
                callback_data: "autoSell_no_activity_period",
            },
        ],
        ...(isEthereum
            ? []
            : [
                  [
                      {
                          text: `${devSellEnabled ? "🟢" : "🔴"} ${await t("autoSell.devSellTitle", userId)}`,
                          callback_data: "autoSell_dev_sell_toggle",
                      },
                  ],
                  [
                      {
                          text: `${await t("autoSell.devSellMinSolLabel", userId)} : ${devMinSol}`,
                          callback_data: "autoSell_dev_sell_min_sol",
                      },
                  ],
                  [
                      {
                          text: `% ${await t("autoSell.devSellMinSupplyLabel", userId)} : ${devMinSupply}`,
                          callback_data: "autoSell_dev_sell_supply_pct",
                      },
                  ],
                  [
                      {
                          text: `↪ ${await t("autoSell.devSellPositionLabel", userId)} : ${devPosPct}`,
                          callback_data: "autoSell_dev_sell_position_pct",
                      },
                  ],
              ]),
          [
            {
                text: `${await t('autoSell.wallet', userId)} ${active_wallet.label}`,
                callback_data: "settings_auto_Sell_wallets",
            },
        ],
        [
             { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
        ],
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption: captionClamped, markup: walletsMarkup };
};

export const editMessageReplyMarkup = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
) => {
    const { caption, markup } = await getAutoSell(userId);
    await bot.editMessageReplyMarkup(markup, {
        chat_id: chatId,
        message_id: messageId
    });
};

export const editAutoSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getAutoSell(userId);

        await bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Auto sell message is already up to date');
            return;
        }
        console.error('Error editing auto sell message:', error);
        throw error;
    }
};

export const sendAutoSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getAutoSell(userId);

    const imagePath = "./src/assets/Auto-sell.jpg";

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        disable_notification: true,
        reply_markup: markup,
    });
};

