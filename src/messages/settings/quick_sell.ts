import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import {
    menuBackButton,
    settingsbackButton,
    walletBackButton,
    walletRefreshButton,
} from "../../utils/markup";
import { t } from "../../locales";

export const getQuickSell = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();

    const caption =
        `<strong>${await t('quickSell.p1', userId)}</strong>\n\n` +
        `${await t('quickSell.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('quickSell.p3', userId)}</a>\n\n` +
        `${await t('quickSell.p4', userId)}\n\n` +
        `<strong>${await t('quickSell.p5', userId)}</strong>\n\n` +
        `<code>• ${user.settings.quick_sell.sell_percent[0]}%\n` +
        `• ${user.settings.quick_sell.sell_percent[1]}%\n` +
        `• ${user.settings.quick_sell.sell_percent[2]}%\n` +
        `• ${user.settings.quick_sell.sell_percent[3]}%\n` +
        `• ${user.settings.quick_sell.sell_percent[4]}%</code>\n\n` +
        `<strong>${await t('quickSell.p6', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `💰 ${user.settings.quick_sell.sell_percent[0]}%`,
                callback_data: "settings_quick_sell_percent_0",
            },
            {
                text: `💰 ${user.settings.quick_sell.sell_percent[1]}%`,
                callback_data: "settings_quick_sell_percent_1",
            },
        ],
        [
            {
                text: `💰 ${user.settings.quick_sell.sell_percent[2]}%`,
                callback_data: "settings_quick_sell_percent_2",
            },
            {
                text: `💰 ${user.settings.quick_sell.sell_percent[3]}%`,
                callback_data: "settings_quick_sell_percent_3",
            },
            {
                text: `💰 ${user.settings.quick_sell.sell_percent[4]}%`,
                callback_data: "settings_quick_sell_percent_4",
            },
        ],
        [
            { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back", }
        ]
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editQuickSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickSell(userId);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendQuickSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickSell(userId);

    const imagePath = "./src/assets/quickSell.jpg";
    bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
