import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { getBalance } from "../../../services/solana";
import { t } from "../../../locales";
import { getPairByAddress } from "../../../services/dexscreener";

export const getSniper = async (
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    if (!user) throw "No User";

    const active_wallet = user.wallets.find(
        (wallet: any) => wallet.is_active_wallet,
    );
    if (!active_wallet) throw "No active Wallet";
    const balance = await getBalance(active_wallet.publicKey);

    let tokenlist;

    if (!user.sniper.is_snipping){
        tokenlist = [];
    }else{
        tokenlist = user.sniper.tokenlist || [];
    };
    // console.log("User Token List:", tokenlist);

    // Fetch token names for each address
    const tokenListWithNames = await Promise.all(
        (user.sniper.tokenlist || []).map(async (tokenAddress: any, index: number) => {
            try {
                const pairArray = await getPairByAddress(tokenAddress);
                const pair = pairArray?.[0];
                
                if (pair && pair.baseToken) {
                    const tokenName = pair.baseToken.name || 'Unknown Token';
                    const tokenSymbol = pair.baseToken.symbol || 'N/A';
                    return `${index + 1}. <strong>${tokenName} (${tokenSymbol})</strong> - <a href="https://pump.fun/coin/${tokenAddress}">View</a>`;
                } else {
                    // Fallback if token info not found
                    return `${index + 1}. <code>${tokenAddress}</code> - <a href="https://pump.fun/coin/${tokenAddress}">View</a>`;
                }
            } catch (error) {
                console.error(`Error fetching token info for ${tokenAddress}:`, error);
                // Fallback on error
                return `${index + 1}. <code>${tokenAddress}</code> - <a href="https://pump.fun/coin/${tokenAddress}">View</a>`;
            }
        })
    );

    const cap = `${await t('sniper.detectedActiveTokens', userId)}\n\n` +
        tokenListWithNames.join('\n');

    const caption =
        `${tokenlist.length > 0 ? `${cap}` : await t('sniper.noDetectedTokens', userId)} \n\n` +
        `<a href="https://Google.fr">${await t('Example link', userId)}</a>\n\n` +
        `${await t('sniper.panelDescription', userId)}\n\n` +
        `${await t('sniper.panelDescription2', userId)} \n\n` +
        `<strong>${await t('sniper.important', userId)}</strong> ${await t('sniper.importantNote', userId)}\n\n`;

    const options: TelegramBot.InlineKeyboardButton[][] = user.sniper.advance_mode
        ? [
            [
                {
                    text: user.sniper.is_snipping ? `🛑 ${await t('sniper.stopSnipping', userId)}` : `🎯 ${await t('sniper.startSnipping', userId)}`,
                    callback_data: "is_snipping",
                },
                {
                    text: await t('sniper.tokenDetection', userId),
                    callback_data: "detection",
                }
            ],
            [
                {
                    text: user.sniper.mev ? `🟢 ${await t('settings.mev', userId)}` : `🔴 ${await t('settings.mev', userId)}`,
                    callback_data: "sniper_mev",
                },
                { text: `${await t('sniper.slippage', userId)} : ${user.sniper.slippage}%`, callback_data: "sniper_slippage" },
            ],
            [
                { text: `${await t('sniper.buy', userId)} : ${user.sniper.buy_amount} SOL`, callback_data: "sniper_buyAmount" },
                { text: `${await t('sniper.buyLimit', userId)} : ${user.sniper.buy_limit}`, callback_data: "sniper_buyLimit" },
            ],
            [
                { text: `${await t('sniper.takeProfit', userId)} : ${user.sniper.take_profit} %`, callback_data: "sniper_takeProfit" },
                { text: `${await t('sniper.stopLoss', userId)} : ${user.sniper.stop_loss} %`, callback_data: "sniper_stopLoss" },
            ],
            [
                { text: `${await t('sniper.timeLimit', userId)} : ${user.sniper.time_limit} min`, callback_data: "sniper_timeLimit" },
            ],
            [
                {
                    text: user.sniper.allowAutoBuy ? `🟢 ${await t('sniper.allowAutoBuy', userId)}` : `🔴 ${await t('sniper.allowAutoBuy', userId)}`,
                    callback_data: "allowAutoBuy",
                },
                {
                    text: user.sniper.allowAutoSell ? `🟢 ${await t('sniper.allowAutoSell', userId)}` : `🔴 ${await t('sniper.allowAutoSell', userId)}`,
                    callback_data: "allowAutoSell",
                }
            ],
            [
                { text: await t('sniper.advance', userId), callback_data: "advance_action" },
            ],
            [
                // {
                //     text: user.sniper.social_check ? `🟢 ${await t('Check Social', userId)}` : `🔴 ${await t('Check Social', userId)}`,
                //     callback_data: "sniper_social",
                // },
                // {
                //     text: user.sniper.allowAutoSell ? `🟢 ${await t('Enable Auto Sell', userId)}` : `🔴 ${await t('Disable Auto Sell', userId)}`,
                //     callback_data: "allowAutoSell",
                // },
                {
                    text: user.sniper.twitter_check ? `🟢 ${await t('sniper.enableTwitterChannel', userId)}` : `🔴 ${await t('sniper.disableTwitterChannel', userId)}`,
                    callback_data: "sniper_twitter",
                },
            ],
            [
                { text: `${await t('sniper.bondingCurveMin', userId)} : ${user.sniper.bonding_curve_min}%`, callback_data: "sniper_boundingMin" },
                { text: `${await t('sniper.bondingCurveMax', userId)} : ${user.sniper.bonding_curve_max}%`, callback_data: "sniper_bondingMax" },
            ],
            [
                { text: `${await t('sniper.minMC', userId)} : $${user.sniper.min_mc}K`, callback_data: "sniper_MCMin" },
                { text: `${await t('sniper.maxMC', userId)} : $${user.sniper.max_mc}K`, callback_data: "sniper_MCMax" },
            ],
            [
                { text: `${await t('sniper.minTokenAge', userId)} : ${user.sniper.min_token_age} min`, callback_data: "sniper_tokenAgeMin" },
                { text: `${await t('sniper.maxTokenAge', userId)} : ${user.sniper.max_token_age} min`, callback_data: "sniper_tokenAgeMax" },
            ],
            [
                { text: `${await t('sniper.minHolders', userId)} : ${user.sniper.min_holders}`, callback_data: "sniper_holdersMin" },
                { text: `${await t('sniper.maxHolders', userId)} : ${user.sniper.max_holders}`, callback_data: "sniper_holdersMax" },
            ],
            [
                { text: `${await t('sniper.minVolume', userId)} : $${user.sniper.min_vol}K`, callback_data: "sniper_volumeMin" },
                { text: `${await t('sniper.maxVolume', userId)} : $${user.sniper.max_vol}K`, callback_data: "sniper_volumeMax" },
            ],
            [
                { text: `${await t('sniper.minLiquidity', userId)} : $${user.sniper.min_liq}K`, callback_data: "sniper_liquidityMin" },
                { text: `${await t('sniper.maxLiquidity', userId)} : $${user.sniper.max_liq}K`, callback_data: "sniper_liquidityMax" },
            ],
            [
                { text: `${await t('sniper.minTXNS', userId)} : ${user.sniper.TXNS_MIN}`, callback_data: "sniper_TxnMin" },
                { text: `${await t('sniper.maxTXNS', userId)} : ${user.sniper.TXNS_MAX}`, callback_data: "sniper_TxnMax" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                // { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
            ],
        ]
        : [
            [
                {
                    text: user.sniper.is_snipping ? `🛑 ${await t('sniper.stopSnipping', userId)}` : `🎯 ${await t('sniper.startSnipping', userId)}`,
                    callback_data: "is_snipping",
                },
                {
                    text: await t('sniper.tokenDetection', userId),
                    callback_data: "detection",
                }
            ],
            [
                {
                    text: user.sniper.mev ? `🟢 ${await t('settings.mev', userId)}` : `🔴 ${await t('settings.mev', userId)}`,
                    callback_data: "sniper_mev",
                },
                { text: `${await t('sniper.slippage', userId)} : ${user.sniper.slippage}%`, callback_data: "sniper_slippage" },
            ],
            [
                { text: `${await t('sniper.buy', userId)} : ${user.sniper.buy_amount} SOL`, callback_data: "sniper_buyAmount" },
                { text: `${await t('sniper.buyLimit', userId)} : ${user.sniper.buy_limit}`, callback_data: "sniper_buyLimit" },
            ],
            [
                { text: `${await t('sniper.takeProfit', userId)} : ${user.sniper.take_profit} %`, callback_data: "sniper_takeProfit" },
                { text: `${await t('sniper.stopLoss', userId)} : ${user.sniper.stop_loss} %`, callback_data: "sniper_stopLoss" },
            ],
            [
                { text: `${await t('sniper.timeLimit', userId)} : ${user.sniper.time_limit} min`, callback_data: "sniper_timeLimit" },
            ],
            [
                {
                    text: user.sniper.allowAutoBuy ? `🟢 ${await t('sniper.allowAutoBuy', userId)}` : `🔴 ${await t('sniper.allowAutoBuy', userId)}`,
                    callback_data: "allowAutoBuy",
                },
                {
                    text: user.sniper.allowAutoSell ? `🟢 ${await t('sniper.allowAutoSell', userId)}` : `🔴 ${await t('sniper.allowAutoSell', userId)}`,
                    callback_data: "allowAutoSell",
                }
            ],
            [
                { text: await t('sniper.advanceDown', userId), callback_data: "advance_action" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                // { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
            ],
        ];

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const sendSniperMessageeWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/Snipping.jpg"; // Path to the image
    const { caption, markup } = await getSniper(userId);

    await bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const editSniperMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getSniper(userId);
    console.log("Edit Sniper Message");
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        parse_mode: "HTML",
        message_id: messageId,
        reply_markup: markup,
    });
};
