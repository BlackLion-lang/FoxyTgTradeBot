import TelegramBot from "node-telegram-bot-api";
import { walletBackButton } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getWalletMessage } from "../../../utils/config";
import { t } from "../../../locales";

export const getDeleteWallet = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const caption =
        `<strong>${await t('deleteWallet.p1', userId)}</strong>\n\n` +
        `${await getWalletMessage(userId, "solana")}` +
        `<strong>${await t('deleteWallet.p2', userId)}</strong>`;
    const wallets = user.wallets;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < wallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = [];
        for (let j = i; j < wallets.length && j < i + 2; j++) {
            option.push({
                text: `${wallets[j].label}`,
                callback_data: `wallets_delete_${j}`,
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

export const editDeleteWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getDeleteWallet(userId);

        // Try to edit as text message first
        try {
            await bot.editMessageCaption(caption, {
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
            console.log('Delete wallet message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing delete wallet message:', error);
    }
};

export const sendDeleteWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getDeleteWallet(userId);

    const imagePath = "./src/assets/deletewallet.jpg"; // Path to the image

        bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: markup,
        });
};
