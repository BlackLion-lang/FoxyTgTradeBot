import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { settingsbackButton } from "../../../utils/markup";
import { t } from "../../../locales";
import { getUserChain } from "../../../utils/chain";

export const getSlippage = async (
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";
    
    // Use Ethereum slippage settings if chain is Ethereum
    const buySlippage = isEthereum 
        ? (user.settings.slippage_eth?.buy_slippage_eth || 0.5)
        : (user.settings.slippage?.buy_slippage || 0.5);
    const sellSlippage = isEthereum
        ? (user.settings.slippage_eth?.sell_slippage_eth || 0.5)
        : (user.settings.slippage?.sell_slippage || 0.5);
    
    console.log('debug userSetting slippage', buySlippage, "sell_slippage", sellSlippage);
    const caption =
        `<strong>${await t('slippageSettings.p1', userId)}</strong>\n\n` +
        `${await t('slippageSettings.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('slippageSettings.p3', userId)}</a>\n\n` +
        `<strong>${await t('slippageSettings.p4', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `${await t('slippageSettings.buy', userId)} ${buySlippage}%`,
                callback_data: isEthereum ? "settings_slippage_buy_eth" : "settings_slippage_buy",
            },
            {
                text: `${await t('slippageSettings.sell', userId)} ${sellSlippage}%`,
                callback_data: isEthereum ? "settings_slippage_sell_eth" : "settings_slippage_sell",
            },
        ],
        await settingsbackButton(userId),
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editSlippageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getSlippage(userId);

    // console.log('debug editSlippageMessage', caption, markup);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
    // console.log('debug editSlippageMessage done', caption, markup);
};

export const sendSlippageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getSlippage(userId);

    const imagePath = "./src/assets/settings.jpg";
    bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
