import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { clampInactivityMinutes } from "../../../services/sellOnNoActivity";

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
    const status = enabled === true ? "🟢" : "🔴";

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

    const caption =
        `<strong>${await t('autoSell.p1', userId)}</strong>\n\n` +
        `${await t('autoSell.p2', userId)}\n <a href="${autoSellHelpUrl}">${await t('autoSell.p3', userId)}</a>\n\n` +
        `${await t('autoSell.p4', userId)}\n\n` +
        `${await t('menu.chain', userId)} <strong>${chainEmoji} ${chainName}</strong>\n\n` +
        `<strong>${user.username} (${await t('autoSell.p5', userId)})</strong> : <strong>${active_wallet.label}\n</strong>` +
        `<code>${active_wallet.publicKey}</code>\n\n` +
        `<strong>${await t('autoSell.p6', userId)}</strong> ${takeProfitPercent}%\n` +
        `<strong>${await t('autoSell.p7', userId)}</strong> ${stopLossPercent}%\n\n` +
        `<strong>${await t('autoSell.noActivityTitle', userId)}</strong> ${noActEnabled ? "🟢" : "🔴"}\n` +
        `${await t('autoSell.noActivityHint', userId)}\n` +
        `<strong>${await t('autoSell.noActivityPeriodLabel', userId)}</strong>: ${noActMins} min\n\n` +
        (!isEthereum
            ? `<strong>${await t("autoSell.devSellTitle", userId)}</strong> ${devSellEnabled ? "🟢" : "🔴"}\n` +
              `${await t("autoSell.devSellHint", userId)}\n` +
              `<strong>${await t("autoSell.devSellMinSolLabel", userId)}</strong>: ${devMinSol}\n` +
              `<strong>${await t("autoSell.devSellMinSupplyLabel", userId)}</strong>: ${devMinSupply}%\n` +
              `<strong>${await t("autoSell.devSellPositionLabel", userId)}</strong>: ${devPosPct}%\n\n`
            : "") +
        `<strong>${await t('autoSell.p8', userId)}</strong>`;

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
                          text: `◎ ${await t("autoSell.devSellMinSolLabel", userId)}: ${devMinSol}`,
                          callback_data: "autoSell_dev_sell_min_sol",
                      },
                  ],
                  [
                      {
                          text: `% ${await t("autoSell.devSellMinSupplyLabel", userId)}: ${devMinSupply}`,
                          callback_data: "autoSell_dev_sell_supply_pct",
                      },
                      {
                          text: `↪ ${await t("autoSell.devSellPositionLabel", userId)}: ${devPosPct}`,
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

    return { caption, markup: walletsMarkup };
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

