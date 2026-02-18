import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getQuickBuy = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();

    const caption =
        `<strong>${await t('quickBuy.p1', userId)}</strong>\n\n` +
        `${await t('quickBuy.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('quickBuy.p3', userId)}</a>\n\n` +
        `${await t('quickBuy.p4', userId)}\n\n` +
        `<strong>${await t('quickBuy.p5', userId)}</strong>\n\n` +
        `<code>• ${user.settings.quick_buy.buy_amount[0]} SOL\n` +
        `• ${user.settings.quick_buy.buy_amount[1]} SOL\n` +
        `• ${user.settings.quick_buy.buy_amount[2]} SOL\n` +
        `• ${user.settings.quick_buy.buy_amount[3]} SOL\n` +
        `• ${user.settings.quick_buy.buy_amount[4]} SOL</code>\n\n` +
        `<strong>${await t('quickBuy.p6', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `💰 ${user.settings.quick_buy.buy_amount[0]} SOL`,
                callback_data: "settings_quick_buy_amount_0",
            },
            {
                text: `💰 ${user.settings.quick_buy.buy_amount[1]} SOL`,
                callback_data: "settings_quick_buy_amount_1",
            },
        ],
        [
            {
                text: `💰 ${user.settings.quick_buy.buy_amount[2]} SOL`,
                callback_data: "settings_quick_buy_amount_2",
            },
            {
                text: `💰 ${user.settings.quick_buy.buy_amount[3]} SOL`,
                callback_data: "settings_quick_buy_amount_3",
            },
            {
                text: `💰 ${user.settings.quick_buy.buy_amount[4]} SOL`,
                callback_data: "settings_quick_buy_amount_4",
            },
        ],
        // [
        //     {
        //         text: user.settings.quick_buy.is_auto_sell
        //             ? "🟢 Auto-Sell on Dev Sell"
        //             : "🔴 Auto-Sell on Dev Sell",
        //         callback_data: "settings_quick_buy_auto_sell",
        //     },
        // ],
        // [{ text: "💸 TP & SL", callback_data: "settings_quick_buy_tpsl" }],
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

export const editQuickBuyMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getQuickBuy(userId);

        await bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Quick buy message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing quick buy message:', error);
        throw error; // Re-throw other errors
    }
};

export const sendQuickBuyMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getQuickBuy(userId);

    const imagePath = "./src/assets/quickBuy.jpg";
    bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
