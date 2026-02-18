import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { t } from "../../../locales";
import { getUserChain } from "../../../utils/chain";

export const getSettings = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = await User.findOne({ userId });
    if (!user) throw "No User";
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";

    const caption =
        `<strong>${await t('settings.p1', userId)}</strong>\n\n` +
        `<strong>${await t('menu.chain', userId)} ${userChain === "ethereum" ? "🟠 Ethereum" : "🟠 Solana"}</strong>\n\n` +
        `${await t('settings.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('settings.p3', userId)}</a>\n\n` +
        `${await t('settings.p4', userId)}\n\n` +
        `<strong>${await t('settings.p5', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            { text: `${await t('settings.fee', userId)}`, callback_data: "settings_fee" },
            { text: `${await t('settings.slippage', userId)}`, callback_data: "settings_slippage" },
        ],
        ...(isEthereum ? [] : [[
            {
                text: user.settings.mev ? `🟢 ${await t('settings.mev', userId)}` : `🔴 ${await t('settings.mev', userId)}`,
                callback_data: "settings_mev",
            },
        ]]),
        [
            { text: `${await t('settings.wallet', userId)}`, callback_data: "wallets" },
            { text: `${await t('settings.language', userId)}`, callback_data: "settings_language" },
        ],
        [
            { 
                text: `${await t('settings.quickBuy', userId)}`, 
                callback_data: isEthereum ? "settings_quick_buy_eth" : "settings_quick_buy" 
            },
            {
                text: `${await t('settings.quickSell', userId)}`,
                callback_data: isEthereum ? "settings_quick_sell_eth" : "settings_quick_sell",
            },
        ],
        [
            { text: `${await t('settings.young', userId)} ${user.settings.youngTokenDate || 24}h`, callback_data: "young_token" },
        ],
        [
            { text: `${await t('settings.autoSell', userId)}`, callback_data: "settings_auto_sell" },
        ],
            [
                {
                    text: user.settings.image_activation ? `🟢 ${await t('settings.autoImage', userId)} ` : `🔴 ${await t('settings.autoImage', userId)}`,
                    callback_data: "settings_image"
                },
            ],
        [
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
        ],
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editSettingsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getSettings(userId);

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: markup,
            });
        } catch (textError: any) {
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "HTML",
                    // disable_web_page_preview: true,
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Settings message is already up to date');
            return;
        }
        console.error('Error editing settings message:', error);
    }
};

export const sendSettingsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId?: number,
) => {
    const { caption, markup } = await getSettings(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: markup,
    });
};

export const sendSettingsMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/settings.jpg"; // Path to the image
    const { caption, markup } = await getSettings(userId, username, first_name);

    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};
