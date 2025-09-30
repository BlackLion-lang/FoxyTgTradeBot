import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getRecommendedMEVTip, getSolPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { feebackButton, settingsbackButton } from "../../utils/markup";
import { t } from "../../locales/index"

export const getFee = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    const user = (await User.findOne({ userId })) || new User();
    const result = await getRecommendedMEVTip(user.settings.auto_tip);

    const feeSpeed = (() => {
        switch (user.settings.auto_tip) {
            case 'medium':
                return 'Low';
            case 'high':
                return 'Normal';
            case 'veryHigh':
                return 'Fast';
        }
    })();

    const caption =
        `<strong>${await t('feeSettings.p1', userId)}</strong>\n\n` +
        // `<strong>⛽️ Fee Settings</strong>\n\n` +
        `${await t('feeSettings.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('feeSettings.p3', userId)}</a>\n\n` +
        // `${await t('feeSettings.p4', userId)}\n\n` +
        // `${await t('feeSettings.p5', userId)}\n\n` +
        `<strong>${await t('feeSettings.p6', userId)}</strong>\n\n` +
        `<strong>${await t('feeSettings.p16', userId)}</strong> ${feeSpeed}\n\n` +
        `${await t('feeSettings.p14', userId)} ${result / 10 ** 9} SOL\n\n` +
        `${await t('feeSettings.p7', userId)}`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: `${await t('feeSettings.buyFee', userId)} ${user.settings.fee_setting.buy_fee} SOL`,
                callback_data: "settings_fee_buy_fee",
            },
        ],
        [
            {
                text: `${await t('feeSettings.sellFee', userId)} ${user.settings.fee_setting.sell_fee} SOL`,
                callback_data: "settings_fee_sell_fee",
            },
        ],
        // [
        //     {
        //         text: `${await t('feeSettings.buyTip', userId)} ${user.settings.fee_setting.buy_tip} SOL`,
        //         callback_data: "settings_fee_buy_tip",
        //     },
        // ],
        // [
        //     {
        //         text: `${await t('feeSettings.sellTip', userId)} ${user.settings.fee_setting.sell_tip} SOL`,
        //         callback_data: "settings_fee_sell_tip",
        //     },
        // ],
        [
            {
                text: `${await t('feeSettings.p11', userId)}`,
                callback_data: "settings_fee_auto",
            },
        ],
        [
            { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
            { text: `${await t('refresh', userId)}`, callback_data: "settings_refresh" },
        ]
    ];

    const walletsMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: walletsMarkup };
};

export const editFeeMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getFee(userId);

        bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (errorMessage) { console.log('Error editing fee message:', errorMessage); }
};

export const sendFeeMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getFee(userId);

    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const editFeeAutoMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const result = await getRecommendedMEVTip(user.settings.auto_tip);
    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
            // [
            //      {
            //         text: user.settings.mev ? `🟢 MEV Protect` : "🔴 MEV Protect",
            //         callback_data: "settings_mev",
            //     },
            // ],
            [
                {
                    text: user.settings.auto_tip === "medium" ? `🟢 🐢 ${await t('feeSettings.p8', userId)}` : `🔘 🐢 ${await t('feeSettings.p8', userId)}`,
                    callback_data: "speed_low",
                }
            ],
            [
                {
                    text: user.settings.auto_tip === "high" ? `🟢 ⚡️ ${await t('feeSettings.p9', userId)}` : `🔘 ⚡️ ${await t('feeSettings.p9', userId)}`,
                    callback_data: "speed_medium",
                }
            ],
            [
                {
                    text: user.settings.auto_tip === "veryHigh" ? `🟢 🚀 ${await t('feeSettings.p10', userId)}` : `🔘 🚀 ${await t('feeSettings.p10', userId)}`,
                    callback_data: "speed_high",
                }
            ],
            // [
            // { text: "🚀 Fast", callback_data: "speed_high" },
            // { text: "⚡️ Normal", callback_data: "speed_medium" },
            // { text: "🐢 Slow", callback_data: "speed_low" },
            // ],
            [
                { text: `${await t('back', userId)}`, callback_data: "settings_fee_back" },
                { text: `${await t('refresh', userId)}`, callback_data: "autotip_refresh" },
            ]
        ],
    };
    bot.editMessageCaption(
        `<strong>${await t('feeSettings.p11', userId)}</strong>

${await t('feeSettings.p12', userId)} 
<a href="https://the-cryptofox-learning.com/">${await t('feeSettings.p13', userId)}</a>

${await t('feeSettings.p14', userId)} ${result / 10 ** 9} SOL

<strong>${await t('feeSettings.p15', userId)}</strong>`,
        {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: newMarkup,
            // disable_web_page_preview: true
        },
    );
};

export const sendFeeAutoMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const result = await getRecommendedMEVTip("veryHigh");
    // const recommendedTip = result?.[0]?.prioritizationFee || 100_000;
    const user = (await User.findOne({ userId })) || new User();
    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
            // [
            //      {
            //         text: user.settings.mev ? `🟢 MEV Protect` : "🔴 MEV Protect",
            //         callback_data: "settings_mev",
            //     },
            // ],
            [
                { text: "⚡ Slow", callback_data: "speed_medium" },
                { text: "🚀 Fast", callback_data: "speed_veryHigh" },
                { text: "⚡️ Normal", callback_data: "speed_high" },
                { text: "🐢 Slow", callback_data: "speed_medium" },
            ],
            [
                { text: "⬅ Back", callback_data: "settings_fee_back" },
                { text: "🔄 Refresh", callback_data: "autotip_refresh" },
            ]
        ],
    };
    bot.sendMessage(
        chatId,
        `<strong>⛽️ Recommended Fee Settings</strong>

📚 Need more help? <a href="https://the-cryptofox-learning.com/">Click Here!</a>

🌎 Current Recommended Fee: ${result} SOL

<strong>💡 Automatically let Foxy calculate the recommended MEV tip.</strong>`,
        {
            parse_mode: "HTML",
            reply_markup: newMarkup,
            disable_web_page_preview: true
        },
    );
};
