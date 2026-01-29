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

            ],
            [
                {
                    text: `${await t('help.documentation', userId)}`,
                    url: "https://the-cryptofox-learning.com/"
                },
            ],
            [
                {
                    text: `${await t('help.changelogs', userId)}`,
                    url: "https://the-cryptofox-learning.com/_bot/wiki/changelog.php?token=F39kL1xQ7vP2sN8gR4tY0zC6wB5hJ3m",
                },
            ],
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
        const { caption, reply_markup } = await getHelp(userId);
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
        const imagePath = "./src/assets/help.jpg";
        await bot.sendPhoto(chatId, imagePath, {
            caption,
            parse_mode: "HTML",
            reply_markup,
        });
    } catch (error) {
        console.log("Could not send help image, falling back to text:", error);
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

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup,
            });
        } catch (textError: any) {
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
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Help message is already up to date');
            return;
        }
        console.error('Error editing help message:', error);
    }
};
