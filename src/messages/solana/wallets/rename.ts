import TelegramBot from "node-telegram-bot-api";
import { walletBackButton } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getWalletMessage } from "../../../utils/config";
import { t } from "../../../locales";

export const getRenameWallet = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const caption =
        `<strong>${await t('renameWallet.p1', userId)}</strong>\n\n` +
        `${await getWalletMessage(userId, "solana")}` +
        `<strong>${await t('renameWallet.p2', userId)}</strong>`;
    const wallets = user.wallets;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < wallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = [];
        for (let j = i; j < wallets.length && j < i + 2; j++) {
            option.push({
                text: `${wallets[j].label}`,
                callback_data: `wallets_rename_${j}`,
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

export const sendRenameWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getRenameWallet(userId);

        // Try to edit as text message first
        try {
            const imagePath = "./src/assets/Rename-wallet.jpg"; // Path to the image

            await bot.sendPhoto(chatId, imagePath, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: markup,
            });
            // await bot.sendPhoto(caption, {
            //     chat_id: chatId,
            //     message_id: messageId,
            //     parse_mode: "HTML",
            //     reply_markup: markup,
            // });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('There is no text in the message to edit')) {
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
            console.log('Rename wallet message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing rename wallet message:', error);
    }
};

export const editRenameWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getRenameWallet(userId);

    bot.editMessageCaption(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
