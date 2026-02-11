import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { getUserChain } from "../../../utils/chain";

export const getProfitLevel = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const userChain = await getUserChain(userId);
    
    // Get chain-specific TP/SL values
    const takeProfitPercent = userChain === "ethereum" 
        ? (user.settings.auto_sell.takeProfitPercent_ethereum ?? 10)
        : (user.settings.auto_sell.takeProfitPercent_solana ?? 10);
    const stopLossPercent = userChain === "ethereum"
        ? (user.settings.auto_sell.stopLossPercent_ethereum ?? -40)
        : (user.settings.auto_sell.stopLossPercent_solana ?? -40);
    
    const chainName = userChain === "ethereum" ? "Ethereum" : "Solana";
    const chainEmoji = userChain === "ethereum" ? "🟠" : "🟠";
    
    const caption =
        `<strong>${await t('TpSl.p1', userId)}</strong>\n\n` +
        `${await t('TpSl.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('TpSl.p3', userId)}</a>\n\n` +
        `${await t('TpSl.p4', userId)}\n\n` +
        `<strong>${chainEmoji} ${chainName}</strong>\n\n` +
        `<strong>${await t('TpSl.p5', userId)}</strong>${takeProfitPercent} %\n` +
        `<strong>${await t('TpSl.p6', userId)}</strong>${stopLossPercent}%\n\n` +
        // `<strong>${status} Status</strong>\n\n` +
        // `<strong>⚙️ Current Rules Set:</strong>\n\n` +
        `<strong>${await t('TpSl.p7', userId)}</strong>`;
    const wallets = user.wallets;

    const options: TelegramBot.InlineKeyboardButton[][] = [

        [
            { text: `${await t('TpSl.tp', userId)}${takeProfitPercent}%`, callback_data: "autoSell_tp" },

            // { text: "🗑 Delete Rule", callback_data: "settings_auto_Sell_delete_rule" },
        ],
        [{ text: `${await t('TpSl.sl', userId)}${stopLossPercent}%`, callback_data: "autoSell_sl" },],
        // [
        // { text: `💦 New Stop Loss Level ${user.settings.auto_sell.takeProfitPercent}%`, callback_data: "settings_slippage" },
        // { text: "🗑 Delete Rule", callback_data: "settings_auto_Sell_delete_rule" },
        // ],
        [
            { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
            // { text: "🔄 Refresh", callback_data: "settings_refresh" },
        ],
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};


export const editprofitLevelMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getProfitLevel(userId);

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
            console.log('Private key wallet message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing private key wallet message:', error);
    }
};

export const sendProfitLevelMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/Auto-sell.jpg"; // Path to the image
    const { caption, markup } = await getProfitLevel(userId);

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const editProfitlevelMessageReplyMarkup = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number
) => {
    const { caption, markup } = await getProfitLevel(userId);
    await bot.editMessageCaption (caption, {
        parse_mode: "HTML",
        reply_markup: markup,
        chat_id: chatId,
        message_id: messageId
    });
};
