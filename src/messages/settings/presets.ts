import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { menuBackButton, settingsbackButton } from "../../utils/markup";
import { t } from "../../locales";

export const getPresets = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();

    const caption =
        `<strong>⚙️ Presets</strong>\n\n` +
        `📚 Need more help?\n <a href="https://the-cryptofox-learning.com/">Click Here!</a>\n\n` +
        `<strong>💡 Select a preset below to modify.</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back", },
            {
                text: "🔄 Refresh",
                callback_data: "settings_presets_refresh",
            },
        ],
        [
            {
                text: `🎯 Sniper`,
                callback_data: "settings_presets_sniper",
            },
            {
                text: `🤖 Copy Trade`,
                callback_data: "settings_presets_copy_trade",
            },
        ],
        [
            {
                text: `Sniper`,
                callback_data: "settings_presets_limit_orders",
            },
        ],
        await settingsbackButton(userId),
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editPresetsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getPresets(userId);

    bot.editMessageText(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const sendPresetsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getPresets(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
