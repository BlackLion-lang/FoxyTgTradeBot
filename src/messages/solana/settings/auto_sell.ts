import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getAutoSell = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    let user = (await User.findOne({ userId })) || new User();
    const { getUserChain } = await import("../../../utils/chain");
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";
    
    const active_wallet = isEthereum 
        ? user.ethereumWallets.find((wallet: any) => wallet.is_active_wallet)
        : user.wallets.find((wallet: any) => wallet.is_active_wallet);
    if (!active_wallet) throw "No active Wallet";
    const status = user.settings.auto_sell.enabled === true ? "🟢" : "🔴";
    // const once = user.settings.auto_sell.sellOnce === true ? "🟢" : "🔴";
    // const text1 = user.settings.auto_sell.enabled === true ? "Enabled" : "Disabled";
    // const text2 = user.settings.auto_sell.sellOnce === true ? "Enabled" : "Disabled";

    const caption =
        `<strong>${await t('autoSell.p1', userId)}</strong>\n\n` +
        `${await t('autoSell.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('autoSell.p3', userId)}</a>\n\n` +
        `${await t('autoSell.p4', userId)}\n\n` +
        `<strong>${user.username} (${await t('autoSell.p5', userId)})</strong> : <strong>${active_wallet.label}\n</strong>` +
        `<code>${active_wallet.publicKey}</code>\n\n` +
        // `<strong>💹 Sell Percent:</strong> ${user.settings.auto_sell.sellPercent} %\n\n` +n
        `<strong>${await t('autoSell.p6', userId)}</strong> ${user.settings.auto_sell.takeProfitPercent}%\n` +
        `<strong>${await t('autoSell.p7', userId)}</strong> ${user.settings.auto_sell.stopLossPercent}%\n\n` +
        // `<strong>${status} Status</strong>\n\n` +
        // `<strong>${once} Sell Once</strong>\n\n` +
        // `<strong>⚙️ Auto Sell Rules</strong>\n\n` +
        // `<code>• No rules set.</code>\n\n` +
        `<strong>${await t('autoSell.p8', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        // [
        //     {
        //         text: `🆕 Sell ${user.settings.auto_sell.sellPercent}%`,
        //         callback_data: "settings_auto_Sell_add_rule",
        //     },
        //     // {
        //     //     text: "🗑 Delete Rule",
        //     //     callback_data: "settings_auto_Sell_delete_rule",
        //     // },
        // ],
        [
            {
                text: user.settings.auto_sell?.enabled ? `🟢 ${await t('autoSell.status1', userId)}` : `🔴 ${await t('autoSell.status2', userId)}`,
                callback_data: "settings_auto_Sell_toggle",
            },
            {
                text: "💸 TP & SL",
                callback_data: "settings_auto_Sell_tp_sl",
            },
        ],
          [
            {
                text: `${await t('autoSell.wallet', userId)} ${active_wallet.label}`,
                callback_data: "settings_auto_Sell_wallets",
            },
            
            //   {
            //     text: `🆕 Sell ${user.settings.auto_sell.sellPercent}%`,
            //     callback_data: "settings_auto_Sell_add_rule",
            // }
            // {
            //     text: user.settings.auto_sell.sellOnce ? "🟢 Sell Once" : "🔴 Sell Once",
            //     callback_data: "settings_auto_Sell_Sell_once",
            // }
        ],
        [
             { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
            // {
            //     text: "🔄 Refresh",
            //     callback_data: "settings_auto_Sell_refresh",
            // },
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
    const { caption, markup } = await getAutoSell(userId);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendAutoSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getAutoSell(userId);

    const imagePath = "./src/assets/Auto-sell.jpg"; // Path to the image 

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        disable_notification: true,
        reply_markup: markup,
    });
};

