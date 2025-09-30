import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    isValidSolanaAddress,
} from "../../services/solana";
import { getPairByAddress } from "../../services/dexscreener";
import {
    formatNumberStyle,
    getCurrentTime,
    isMEVProtect,
} from "../../services/other";
import { User } from "../../models/user";
import { connection } from "../../config/connection";
import { PublicKey } from "@solana/web3.js";
import { t } from "../../locales";

export const getHelp = async (
    userId: number
): Promise<{
    caption: string;
    reply_markup: TelegramBot.InlineKeyboardMarkup;
}> => {
    const caption = [
        `<strong>${await t('help.p1', userId)}</strong>\n`,
        `${await t('help.p2', userId)}\n`,
        // '🐦 For the latest updates and news, follow us on <strong>Twitter</strong>.',
        `${await t('help.p4', userId)}\n`,
        `<em>${await t('help.p5', userId)}</em>`
    ].join('\n');

    const reply_markup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {
                    text: `${await t('help.contactSupport', userId)}`,
                    url: "https://the-cryptofox-learning.com/",
                },
                { 
                    text: `${await t('help.documentation', userId)}`, 
                    url: "https://the-cryptofox-learning.com/" 
                },
            ],
            // [
            //     {
            //         text: "🐦 Twitter Updates",
            //         url: "https://t.me/eniy_trading_bot",
            //     },
            //     {
            //         text: "📢 Announcements",
            //         url: "https://t.me/eniy_trading_bot",
            //     },
            // ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" }
            ],
        ],
    };

    return { caption, reply_markup };
};

export const sendHelpMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, reply_markup  } = await getHelp(userId);
        bot.sendMessage(chatId, caption, {
            parse_mode: "HTML",
            reply_markup,
        });
    } catch (error) {
        console.error('Error sending help message:', error);
    }
};

export const sendHelpMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId?: number,
) => {
    try {
        const { caption, reply_markup } = await getHelp(userId);
        // Use absolute path for the image
        const imagePath = "./src/assets/help.jpg";
        await bot.sendPhoto(chatId, imagePath, {
            caption,
            parse_mode: "HTML",
            reply_markup,
        });
    } catch (error) {
        console.log("Could not send help image, falling back to text:", error);
        // Fallback to text-only message if image fails
        try {
            const { caption, reply_markup } = await getHelp(userId);
            bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup,
            });
        } catch (textError) {
            console.error('Error sending fallback help text:', textError);
        }
    }
};

export const editHelpMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, reply_markup } = await getHelp(userId);
        
        // Try to edit as text message first
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup,
            });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "HTML",
                    reply_markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Help message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing help message:', error);
    }
};
