import TelegramBot from "node-telegram-bot-api";
import { walletBackButton } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getWalletMessage } from "../../../utils/config";
import { t } from "../../../locales";

export const getPrivateKeyWallet = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const caption =
        `<strong>${await t('exportPrivateKey.p1', userId)}</strong>\n\n` +
        `${await getWalletMessage(userId, "ethereum")}` +
        `<strong>${await t('exportPrivateKey.p2', userId)}</strong>`;

    const ethereumWallets = user.ethereumWallets || [];

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < ethereumWallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = [];
        for (let j = i; j < ethereumWallets.length && j < i + 2; j++) {
            option.push({
                text: `${ethereumWallets[j].label}`,
                callback_data: `wallets_private_key_${j}`,
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

export const editPrivateKeyWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getPrivateKeyWallet(userId);

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: markup,
            });
        } catch (textError: any) {
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
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Private key wallet message is already up to date');
            return;
        }
        console.error('Error editing private key wallet message:', error);
    }
};

export const sendPrivateKeyWalletMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getPrivateKeyWallet(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendPrivateKeyWalletMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/privateKey.jpg";
    const { caption, markup } = await getPrivateKeyWallet(userId);

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

