import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getBalance, getSolPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { isMEVProtect } from "../../services/other";
import { t } from "../../locales";

export const getSniper = async (
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    if (!user) throw "No User";

    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
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

    const cap = `🔥 Detected active tokens:\n\n` +
        (user.sniper.tokenlist).map((t: any, i: any) => `${i + 1}. https://pump.fun/coin/${t}`).join('\n');

    const caption =
        // `<strong>${await t('Wallet', userId)}</strong>\n` +
        // `<code>${active_wallet.publicKey}</code>\n` +
        // `${await t('Balance', userId)} ${balance}\n\n` +
        // `${await t('Buy Tip', userId)}\n` +
        // `${await t('Sell Tip', userId)}\n\n` +
        // `<strong>${await t('settings.p5', userId)}</strong>`;
        `${tokenlist.length > 0 ? `${cap}` : "No detective active tokens"} \n\n` +
        `<a href="https://Google.fr">${await t('Example link', userId)}</a>\n\n` +
        `It is the panel of the sniper bot. Here you can configure all the parameters of the bot.\n\n` +
        `If you have any questions, please let me know. If you want, I will add more options according your strategy. \n\n` +
        `<strong>Important:</strong> The bot is not a guarantee of profit all the time. Please use it with caution and at your own risk.\n\n`;

    const options: TelegramBot.InlineKeyboardButton[][] = user.sniper.advance_mode
        ? [
            [
                {
                    text: user.sniper.is_snipping ? `🛑 ${await t('Stop Snipping', userId)}` : `🎯 ${await t('Start Snipping', userId)}`,
                    callback_data: "is_snipping",
                },
                {
                    text: `🌍 Token Detection`,
                    callback_data: "detection",
                }
            ],
            [
                {
                    text: user.sniper.mev ? `🟢 ${await t('settings.mev', userId)}` : `🔴 ${await t('settings.mev', userId)}`,
                    callback_data: "sniper_mev",
                },
                { text: `${await t('Slippage', userId)} : ${user.sniper.slippage}%`, callback_data: "sniper_slippage" },
            ],
            [
                { text: `${await t('Buy', userId)} : ${user.sniper.buy_amount} SOL`, callback_data: "sniper_buyAmount" },
                { text: `${await t('Buy Limit', userId)} : ${user.sniper.buy_limit}`, callback_data: "sniper_buyLimit" },
            ],
            [
                { text: `${await t('Take Profit', userId)} : ${user.sniper.take_profit} %`, callback_data: "sniper_takeProfit" },
                { text: `${await t('Stop Loss', userId)} : ${user.sniper.stop_loss} %`, callback_data: "sniper_stopLoss" },
            ],
            [
                { text: `${await t('Time limit', userId)} : ${user.sniper.time_limit} min`, callback_data: "sniper_timeLimit" },
            ],
            [
                {
                    text: user.sniper.allowAutoBuy ? `🔴 ${await t('Allow Auto Buy', userId)}` : `🟢 ${await t('Allow Auto Buy', userId)}`,
                    callback_data: "allowAutoBuy",
                },
                {
                    text: user.sniper.allowAutoSell ? `🔴 ${await t('Allow Auto Sell', userId)}` : `🟢 ${await t('Allow Auto Sell', userId)}`,
                    callback_data: "allowAutoSell",
                }
            ],
            [
                { text: `${await t('⬆️Advance', userId)}`, callback_data: "advance_action" },
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
                    text: user.sniper.twitter_check ? `🟢 ${await t('Enable Twitter Channel', userId)}` : `🔴 ${await t('Disable Twitter Channel', userId)}`,
                    callback_data: "sniper_twitter",
                },
            ],
            [
                { text: `${await t('Bonding Curve Min', userId)} : ${user.sniper.bonding_curve_min}%`, callback_data: "sniper_boundingMin" },
                { text: `${await t('Bonding Curve Max', userId)} : ${user.sniper.bonding_curve_max}%`, callback_data: "sniper_bondingMax" },
            ],
            [
                { text: `${await t('Min MC', userId)} : $${user.sniper.min_mc}K`, callback_data: "sniper_MCMin" },
                { text: `${await t('Max MC', userId)} : $${user.sniper.max_mc}K`, callback_data: "sniper_MCMax" },
            ],
            [
                { text: `${await t('Min Token Age', userId)} : ${user.sniper.min_token_age} min`, callback_data: "sniper_tokenAgeMin" },
                { text: `${await t('Max Token Age', userId)} : ${user.sniper.max_token_age} min`, callback_data: "sniper_tokenAgeMax" },
            ],
            [
                { text: `${await t('Min Holders', userId)} : ${user.sniper.min_holders}`, callback_data: "sniper_holdersMin" },
                { text: `${await t('Max Holders', userId)} : ${user.sniper.max_holders}`, callback_data: "sniper_holdersMax" },
            ],
            [
                { text: `${await t('Min Volume', userId)} : $${user.sniper.min_vol}K`, callback_data: "sniper_volumeMin" },
                { text: `${await t('Max Volume', userId)} : $${user.sniper.max_vol}K`, callback_data: "sniper_volumeMax" },
            ],
            [
                { text: `${await t('Min Liquidity', userId)} : $${user.sniper.min_liq}K`, callback_data: "sniper_liquidityMin" },
                { text: `${await t('Max Liquidity', userId)} : $${user.sniper.max_liq}K`, callback_data: "sniper_liquidityMax" },
            ],
            [
                { text: `${await t('Min TXNS', userId)} : ${user.sniper.TXNS_MIN}`, callback_data: "sniper_TxnMin" },
                { text: `${await t('Max TXNS', userId)} : ${user.sniper.TXNS_MAX}`, callback_data: "sniper_TxnMax" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                // { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
            ],
        ]
        : [
            [
                {
                    text: user.sniper.is_snipping ? `🛑 ${await t('Stop Snipping', userId)}` : `🎯 ${await t('Start Snipping', userId)}`,
                    callback_data: "is_snipping",
                },
                {
                    text: `🌍 Token Detection`,
                    callback_data: "detection",
                }
            ],
            [
                {
                    text: user.sniper.mev ? `🟢 ${await t('settings.mev', userId)}` : `🔴 ${await t('settings.mev', userId)}`,
                    callback_data: "sniper_mev",
                },
                { text: `${await t('Slippage', userId)} : ${user.sniper.slippage}%`, callback_data: "sniper_slippage" },
            ],
            [
                { text: `${await t('Buy', userId)} : ${user.sniper.buy_amount} SOL`, callback_data: "sniper_buyAmount" },
                { text: `${await t('Buy Limit', userId)} : ${user.sniper.buy_limit}`, callback_data: "sniper_buyLimit" },
            ],
            [
                { text: `${await t('Take Profit', userId)} : ${user.sniper.take_profit} %`, callback_data: "sniper_takeProfit" },
                { text: `${await t('Stop Loss', userId)} : ${user.sniper.stop_loss} %`, callback_data: "sniper_stopLoss" },
            ],
            [
                { text: `${await t('Time limit', userId)} : ${user.sniper.time_limit} min`, callback_data: "sniper_timeLimit" },
            ],
            [
                {
                    text: user.sniper.allowAutoBuy ? `🟢 ${await t('Allow Auto Buy', userId)}` : `🔴 ${await t('Allow Auto Buy', userId)}`,
                    callback_data: "allowAutoBuy",
                },
                {
                    text: user.sniper.allowAutoSell ? `🟢 ${await t('Allow Auto Sell', userId)}` : `🔴 ${await t('Allow Auto Sell', userId)}`,
                    callback_data: "allowAutoSell",
                }
            ],
            [
                { text: `${await t('⬇️Advance', userId)}`, callback_data: "advance_action" },
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
