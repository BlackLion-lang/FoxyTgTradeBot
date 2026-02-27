import TelegramBot from "node-telegram-bot-api";
import { t } from "../../../locales";

/** Same language menu as when clicking Language in Settings (caption + markup). */
export const getLanguage = async (userId: number) => {
    const caption = `${await t("language.p1", userId)}`;
    const markup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
        [
                { text: `🇺🇸 ${await t("language.english", userId)}`, callback_data: "settings_language_en" },
                { text: `🇫🇷 ${await t("language.french", userId)}`, callback_data: "settings_language_fr" },
        ],
            [
                { text: `${await t("backSettings", userId)}`, callback_data: "settings_back" },
                { text: `${await t("backMenu", userId)}`, callback_data: "menu_back" },
            ],
        ],
    };
    return { caption, markup };
};

const SETTINGS_IMAGE_PATH = "./src/assets/settings.jpg";

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

/** Sends the same language menu as Settings (photo + caption + keyboard). */
export const sendLanguageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    _messageId?: number,
) => {
    const { caption, markup } = await getLanguage(userId);
    await bot.sendPhoto(chatId, SETTINGS_IMAGE_PATH, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
