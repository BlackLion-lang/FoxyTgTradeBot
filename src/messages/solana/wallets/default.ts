import TelegramBot from "node-telegram-bot-api";
import { walletBackButton } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getWalletMessage } from "../../../utils/config";
import { t } from "../../../locales";

export const getDefaultWallet = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const caption =
        `<strong>${await t('defaultWallet.p1', userId)}</strong>\n\n` +
        `${await getWalletMessage(userId, "solana")}\n\n` +
        `<strong>${await t('defaultWallet.p2', userId)}</strong>`;
    const wallets = user.wallets;
    const default_wallet = (user as any).default_wallet;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < wallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = [];
        for (let j = i; j < wallets.length && j < i + 2; j++) {
            option.push({
                text: `${j === default_wallet ? "🟢" : ""} ${wallets[j].label}`,
                callback_data: `wallets_default_${j}`,
            });
        }
        options.push(option);
    }

    options.push(await walletBackButton(userId));

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const editDefaultWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getDefaultWallet(userId);

        // Try to edit as text message first
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: markup,
            });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Default wallet message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing default wallet message:', error);
    }
};

export const sendDefaultWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getDefaultWallet(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
