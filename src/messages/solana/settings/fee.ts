import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { getRecommendedMEVTip } from "../../../services/solana";
import { getRecommendedGasPrice } from "../../../services/ethereum/etherscan";
import { t } from "../../../locales";
import { getUserChain } from "../../../utils/chain";

export const getFee = async (
    userId: number
) => {
    const user = (await User.findOne({ userId })) || new User();
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";

    if (isEthereum) {
        const gasValues = user.settings.gas_values_eth || [10, 50, 100];
        const currentGasSpeed = (user.settings as any).auto_gas_eth || "medium";

        const recommendedGasPrice = await getRecommendedGasPrice(currentGasSpeed);

        let feeSpeed: string;
        switch (currentGasSpeed) {
            case 'low':
                feeSpeed = await t('feeSettings.p8', userId);
                break;
            case 'medium':
                feeSpeed = await t('feeSettings.p9', userId);
                break;
            case 'high':
                feeSpeed = await t('feeSettings.p10', userId);
                break;
            case 'veryHigh':
                feeSpeed = await t('feeSettings.veryFast', userId);
                break;
            default:
                feeSpeed = await t('feeSettings.p9', userId);
                break;
        }

        const caption =
            `<strong>${await t('feeSettings.gasFeeSettingsEthereum', userId)}</strong>\n\n` +
            `${await t('feeSettings.p2', userId)}\n <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=frais&sig=B8wF2Jbu96_1e19FVno4c1ivttAqmiy_
">${await t('feeSettings.p3', userId)}</a>\n\n` +
            `<strong>${await t('feeSettings.configureGasFeeEthereum', userId)}</strong>\n\n` +
            `<strong>${await t('feeSettings.p16', userId)}</strong> ${feeSpeed}\n\n` +
            `${await t('feeSettings.p14', userId)} ${recommendedGasPrice.toFixed(1)} Gwei\n\n` +
            `<strong>${await t('feeSettings.currentGasValues', userId)}</strong>\n` +
            `<code>• ${gasValues[0]} Gwei\n` +
            `• ${gasValues[1]} Gwei\n` +
            `• ${gasValues[2]} Gwei</code>`;

        const options: TelegramBot.InlineKeyboardButton[][] = [
            [
                {
                    text: `${await t('feeSettings.gasValue1', userId)} ${gasValues[0]} Gwei`,
                    callback_data: "settings_fee_gas_eth_0",
                },
            ],
            [
                {
                    text: `${await t('feeSettings.gasValue2', userId)} ${gasValues[1]} Gwei`,
                    callback_data: "settings_fee_gas_eth_1",
                },
            ],
            [
                {
                    text: `${await t('feeSettings.gasValue3', userId)} ${gasValues[2]} Gwei`,
                    callback_data: "settings_fee_gas_eth_2",
                },
            ],
            [
                {
                    text: `${await t('feeSettings.p11', userId)}`,
                    callback_data: "settings_fee_auto_eth",
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
    }

    const result = await getRecommendedMEVTip(user.settings.auto_tip);

    let feeSpeed: string;
    switch (user.settings.auto_tip) {
        case 'medium':
            feeSpeed = await t('feeSettings.low', userId);
            break;
        case 'high':
            feeSpeed = await t('feeSettings.p9', userId);
            break;
        case 'veryHigh':
            feeSpeed = await t('feeSettings.p10', userId);
            break;
        default:
            feeSpeed = await t('feeSettings.p9', userId);
            break;
    }

    const caption =
        `<strong>${await t('feeSettings.p1', userId)}</strong>\n\n` +
        `${await t('feeSettings.p2', userId)}\n <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=frais&sig=B8wF2Jbu96_1e19FVno4c1ivttAqmiy_
">${await t('feeSettings.p3', userId)}</a>\n\n` +
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
        ...(isEthereum ? [] : [
            [
                {
                    text: `${await t('feeSettings.p11', userId)}`,
                    callback_data: "settings_fee_auto",
                },
            ],
        ]),
        [
            { text: `${await t('refresh', userId)}`, callback_data: "settings_refresh" },
        ],
        [
            { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
        ],
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

        await bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup
        });
    } catch (error: any) {
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Fee message is already up to date');
            return;
        }
        console.error('Error editing fee message:', error);
        throw error;
    }
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
        disable_web_page_preview: true
    });
};

export const editFeeAutoMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const user = (await User.findOne({ userId })) || new User();
        const result = await getRecommendedMEVTip(user.settings.auto_tip);
        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
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
        await bot.editMessageCaption(
            `<strong>${await t('feeSettings.p11', userId)}</strong>

${await t('feeSettings.p12', userId)} 
<a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=fraisrecommande&sig=YIv1xssS1SH9BM39HK-1l79e4aDpam4o
">${await t('feeSettings.p13', userId)}</a>

${await t('feeSettings.p14', userId)} ${result / 10 ** 9} SOL

<strong>${await t('feeSettings.p15', userId)}</strong>`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: newMarkup
            },
        );
    } catch (error: any) {
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Fee auto message is already up to date');
            return;
        }
        console.error('Error editing fee auto message:', error);
        throw error;
    }
};

export const sendFeeAutoMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";

    if (isEthereum) {
        const result = await getRecommendedGasPrice("veryHigh");
        const user = (await User.findOne({ userId })) || new User();
        const currentGasSpeed = (user.settings as any).auto_gas_eth || "medium";

        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    {
                        text: currentGasSpeed === "low" ? `🟢 🐢 ${await t('feeSettings.p8', userId)}` : `🔘 🐢 ${await t('feeSettings.p8', userId)}`,
                        callback_data: "speed_gas_low",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "medium" ? `🟢 ⚡️ ${await t('feeSettings.p9', userId)}` : `🔘 ⚡️ ${await t('feeSettings.p9', userId)}`,
                        callback_data: "speed_gas_medium",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "high" ? `🟢 🚀 ${await t('feeSettings.p10', userId)}` : `🔘 🚀 ${await t('feeSettings.p10', userId)}`,
                        callback_data: "speed_gas_high",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "veryHigh" ? `🟢 ⚡⚡ ${await t('feeSettings.p17', userId)}` : `🔘 ⚡⚡ ${await t('feeSettings.p17', userId)}`,
                        callback_data: "speed_gas_veryHigh",
                    }
                ],
                [
                    { text: `${await t('back', userId)}`, callback_data: "settings_fee_back" },
                    { text: `${await t('refresh', userId)}`, callback_data: "autogas_refresh" },
                ]
            ],
        };
        bot.sendMessage(
            chatId,
            `<strong>${await t('feeSettings.recommendedGasFeeSettings', userId)}</strong>

${await t('feeSettings.p12', userId)} <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=fraisrecommande&sig=YIv1xssS1SH9BM39HK-1l79e4aDpam4o
">${await t('feeSettings.p13', userId)}</a>

${await t('feeSettings.currentRecommendedGas', userId)} ${result.toFixed(1)} Gwei

<strong>${await t('feeSettings.autoCalculateGasPrice', userId)}</strong>`,
            {
                parse_mode: "HTML",
                reply_markup: newMarkup,
                disable_web_page_preview: true
            },
        );
    } else {
        const result = await getRecommendedMEVTip("veryHigh");
        const user = (await User.findOne({ userId })) || new User();
        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    { text: await t('feeSettings.slowButton', userId), callback_data: "speed_medium" },
                    { text: await t('feeSettings.fastButton', userId), callback_data: "speed_veryHigh" },
                    { text: await t('feeSettings.normalButton', userId), callback_data: "speed_high" },
                    { text: await t('feeSettings.slowButton2', userId), callback_data: "speed_medium" },
                ],
                [
                    { text: await t('back', userId), callback_data: "settings_fee_back" },
                    { text: await t('refresh', userId), callback_data: "autotip_refresh" },
                ]
            ],
        };
        bot.sendMessage(
            chatId,
            `<strong>${await t('feeSettings.recommendedFeeSettings', userId)}</strong>

${await t('feeSettings.p12', userId)} <a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=fraisrecommande&sig=YIv1xssS1SH9BM39HK-1l79e4aDpam4o
">${await t('feeSettings.p13', userId)}</a>

${await t('feeSettings.currentRecommendedFee', userId)} ${result} SOL

<strong>${await t('feeSettings.autoCalculateMEVTip', userId)}</strong>`,
            {
                parse_mode: "HTML",
                reply_markup: newMarkup,
                disable_web_page_preview: true
            },
        );
    }
};

export const editFeeAutoMessageEth = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const currentGasSpeed = (user.settings as any).auto_gas_eth || "medium";

    console.log(`[editFeeAutoMessageEth] User ${userId}, currentGasSpeed: ${currentGasSpeed}`);

    const result = await getRecommendedGasPrice(currentGasSpeed);

    console.log(`[editFeeAutoMessageEth] Recommended gas price for speed ${currentGasSpeed}: ${result} Gwei`);

    let feeSpeed: string;
    switch (currentGasSpeed) {
        case 'low':
            feeSpeed = await t('feeSettings.p8', userId);
            break;
        case 'medium':
            feeSpeed = await t('feeSettings.p9', userId);
            break;
        case 'high':
            feeSpeed = await t('feeSettings.p10', userId);
            break;
        case 'veryHigh':
            feeSpeed = await t('feeSettings.p10', userId);
            break;
        default:
            feeSpeed = await t('feeSettings.p9', userId);
            break;
    }

    try {
        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    {
                        text: currentGasSpeed === "low" ? `🟢 🐢 ${await t('feeSettings.p8', userId)}` : `🔘 🐢 ${await t('feeSettings.p8', userId)}`,
                        callback_data: "speed_gas_low",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "medium" ? `🟢 ⚡️ ${await t('feeSettings.p9', userId)}` : `🔘 ⚡️ ${await t('feeSettings.p9', userId)}`,
                        callback_data: "speed_gas_medium",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "high" ? `🟢 🚀 ${await t('feeSettings.p10', userId)}` : `🔘 🚀 ${await t('feeSettings.p10', userId)}`,
                        callback_data: "speed_gas_high",
                    }
                ],
                [
                    {
                        text: currentGasSpeed === "veryHigh" ? `🟢 ⚡⚡ ${await t('feeSettings.p17', userId)}` : `🔘 ⚡⚡ ${await t('feeSettings.p17', userId)}`,
                        callback_data: "speed_gas_veryHigh",
                    }
                ],
                [
                    { text: `${await t('back', userId)}`, callback_data: "settings_fee_back" },
                    { text: `${await t('refresh', userId)}`, callback_data: "autogas_refresh" },
                ]
            ],
        };
        await bot.editMessageCaption(
            `<strong>${await t('feeSettings.p11', userId)}</strong>

${await t('feeSettings.p12', userId)} 
<a href="https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=fraisrecommande&sig=YIv1xssS1SH9BM39HK-1l79e4aDpam4o
">${await t('feeSettings.p13', userId)}</a>

<strong>${await t('feeSettings.p16', userId)}</strong> ${feeSpeed}

${await t('feeSettings.p14', userId)} ${result.toFixed(1)} Gwei

<strong>${await t('feeSettings.autoCalculateGasPrice', userId)}</strong>`,
            {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: newMarkup
            },
        );
    } catch (error: any) {
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Fee auto message (Ethereum) is already up to date');
            return;
        }
        console.error('Error editing fee auto message (Ethereum):', error);
        throw error;
    }
};
