import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getQuickBuyEth = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();
    const buy_amounts = user.settings.quick_buy_eth?.buy_amount_eth || [0.1, 0.2, 0.5, 1, 2];

    const caption =
        `<strong>${await t('quickBuy.p1', userId)}</strong>\n\n` +
        `${await t('quickBuy.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('quickBuy.p3', userId)}</a>\n\n` +
        `${await t('quickBuy.p4', userId)}\n\n` +
        `<strong>${await t('quickBuy.p5', userId)}</strong>\n\n` +
        `<code>• ${buy_amounts[0]} ETH\n` +
        `• ${buy_amounts[1]} ETH\n` +
        `• ${buy_amounts[2]} ETH\n` +
        `• ${buy_amounts[3]} ETH\n` +
        `• ${buy_amounts[4]} ETH</code>\n\n` +
        `<strong>${await t('quickBuy.p6', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `💰 ${buy_amounts[0]} ETH`,
                callback_data: "settings_quick_buy_eth_amount_0",
            },
            {
                text: `💰 ${buy_amounts[1]} ETH`,
                callback_data: "settings_quick_buy_eth_amount_1",
            },
        ],
        [
            {
                text: `💰 ${buy_amounts[2]} ETH`,
                callback_data: "settings_quick_buy_eth_amount_2",
            },
            {
                text: `💰 ${buy_amounts[3]} ETH`,
                callback_data: "settings_quick_buy_eth_amount_3",
            },
            {
                text: `💰 ${buy_amounts[4]} ETH`,
                callback_data: "settings_quick_buy_eth_amount_4",
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

export const editQuickBuyEthMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickBuyEth(userId);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendQuickBuyEthMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickBuyEth(userId);

    const imagePath = "./src/assets/quickBuy.jpg";
    bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

