import TelegramBot from "node-telegram-bot-api";
import { getBuy } from ".";
import { User } from "../../models/user";

export const getMultiWallet = async (userId: number, address: string) => {
    const user = (await User.findOne({ userId })) || new User();
    const { caption } = await getBuy(userId, address);

    const options: TelegramBot.InlineKeyboardButton[][] = [];

    const wallets = user.wallets;

    let index = 0;
    options.push([
        { text: "⬅ Back to Token", callback_data: "buy_to_token" },
        { text: "🔄 Refresh", callback_data: "buy_multi_refresh" },
    ]);

    // for(const wallet of wallets) {
    //     options.push([
    //         { text: wallet.label, callback_data: 'buy_multi_label' },
    //         { text: `${wallet.buy_amount} SOL`, callback_data: `buy_multi_amount_${index}` },
    //         { text: 'Buy', callback_data: `buy_multi_buy_${index}` },
    //     ])
    //     index++
    // }
    options.push(
        [{ text: `Buy on All Wallets`, callback_data: `buy_multi_all` }],
        [{ text: "✖ Close", callback_data: "close" }],
    );

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };
    return { caption, markup: newMarkup };
};
export const editMultiMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    const { caption, markup } = await getMultiWallet(userId, address);

    bot.editMessageText(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendMultiMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    const { caption, markup } = await getMultiWallet(userId, address);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
