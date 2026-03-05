import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getQuickSellEth = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();
    const sell_percents = user.settings.quick_sell_eth?.sell_percent_eth || [10, 20, 50, 75, 100];

    const caption =
        `<strong>${await t('quickSell.p1', userId)}</strong>\n\n` +
        `${await t('quickSell.p2', userId)}\n <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=eth&section=venterapide&sig=QQTDMg-ZhuLecbmVHYgMnhz2-58HPM6W">${await t('quickSell.p3', userId)}</a>\n\n` +
        `${await t('quickSell.p4', userId)}\n\n` +
        `<strong>${await t('quickSell.p5', userId)}</strong>\n\n` +
        `<code>• ${sell_percents[0]}%\n` +
        `• ${sell_percents[1]}%\n` +
        `• ${sell_percents[2]}%\n` +
        `• ${sell_percents[3]}%\n` +
        `• ${sell_percents[4]}%</code>\n\n` +
        `<strong>${await t('quickSell.p6', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `💰 ${sell_percents[0]}%`,
                callback_data: "settings_quick_sell_eth_percent_0",
            },
            {
                text: `💰 ${sell_percents[1]}%`,
                callback_data: "settings_quick_sell_eth_percent_1",
            },
        ],
        [
            {
                text: `💰 ${sell_percents[2]}%`,
                callback_data: "settings_quick_sell_eth_percent_2",
            },
            {
                text: `💰 ${sell_percents[3]}%`,
                callback_data: "settings_quick_sell_eth_percent_3",
            },
            {
                text: `💰 ${sell_percents[4]}%`,
                callback_data: "settings_quick_sell_eth_percent_4",
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

export const editQuickSellEthMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickSellEth(userId);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendQuickSellEthMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickSellEth(userId);

    const imagePath = "./src/assets/quickSell.jpg";
    bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

