import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../services/other";
import { getBalance, getSolPrice, walletCreate } from "../../services/solana";
import { walletBackButton, walletsBackMarkup } from "../../utils/markup";
import { User } from "../../models/user";
import { getWalletMessage } from "../../utils/config";
import { userLocalData } from "../../bot";
import { t } from "../../locales";

export const getWithdrawWallet = async (userId: number) => {
    const user = await User.findOne({ userId }) || new User()
    const caption = `<strong>${await t('withdrawWallet.p1', userId)}</strong>\n\n` +
        `${await getWalletMessage(userId)}` +
        `<strong>${await t('withdrawWallet.p2', userId)}</strong>`
    const wallets = user.wallets

    const options: TelegramBot.InlineKeyboardButton[][] = []
    for (let i = 0; i < wallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = []
        for (let j = i; j < wallets.length && j < i + 2; j++) {
            option.push({ text: `${wallets[j].label}`, callback_data: `wallets_withdraw_${j}` })
        }
        options.push(option)
    }

    options.push(await walletBackButton(userId))

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options
    }

    return { caption, markup: newMarkup }
}

// export const sendWithdrawWalletsMessage = async (
//     bot: TelegramBot,
//     chatId: number,
//     userId: number,
//     messageId: number,
// ) => {
//     try {
//         const { caption, markup } = await getWithdrawWallet(userId);

//         bot.sendMessage(chatId, caption, {
//             parse_mode: "HTML",
//             reply_markup: markup,
//         });
//     } catch (error) {}
// };

export const editWithdrawWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getWithdrawWallet(userId);

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
            console.log('Withdraw wallet message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing withdraw wallet message:', error);
    }
};

export const sendWithdrawWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/withdraw.jpg"; // Path to the image
    const { caption, markup } = await getWithdrawWallet(userId);

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};