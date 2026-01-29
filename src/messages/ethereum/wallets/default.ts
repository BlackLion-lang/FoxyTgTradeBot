import TelegramBot from "node-telegram-bot-api";
import { walletBackButton } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getWalletMessage } from "../../../utils/config";

export const getDefaultWallet = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const caption =
        `<strong>💳 Change Default Wallet</strong>\n\n` +
        `${await getWalletMessage(userId, "ethereum")}\n\n` +
        `<strong>💡 Select a wallet you wish to set as default.</strong>`;
    
    const ethereumWallets = user.ethereumWallets || [];
    const default_wallet = (user as any).default_wallet;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    for (let i = 0; i < ethereumWallets.length; i += 2) {
        const option: TelegramBot.InlineKeyboardButton[] = [];
        for (let j = i; j < ethereumWallets.length && j < i + 2; j++) {
            option.push({
                text: `${j === default_wallet ? "🟢" : ""} ${ethereumWallets[j].label}`,
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
            console.log('Default wallet message is already up to date');
            return;
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

