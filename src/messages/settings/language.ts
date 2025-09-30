import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { settingsbackButton } from "../../utils/markup";

export const getLanguage = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();

    const caption =
        `<strong>💦 Language Settings</strong>\n\n` +
        `📚 Need more help?\n <a href="https://the-cryptofox-learning.com/">Click Here!</a>\n\n` +
        `<strong>🌐 LANGUAGE: Select a language</strong>`;

    const language = user.settings.language || "en";
    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `🇺🇸 Language: English`,
                callback_data: "settings_language_en",
            },
            {
                text: `🇫🇷 Language: French`,
                callback_data: "settings_language_fr",
            },
        ],
        await settingsbackButton(userId),
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editLanguageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getLanguage(userId);

    bot.editMessageText(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendLanguageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getLanguage(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: markup,
    });
};
