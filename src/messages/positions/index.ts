import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    getTokenSecurityInfo,
    isValidSolanaAddress,
} from "../../services/solana";
import { getPairByAddress } from "../../services/dexscreener";
import {
    formatNumberStyle,
    formatWithSuperscript,
    getCurrentTime,
    getLastUpdatedTime,
    isMEVProtect,
} from "../../services/other";
import { User } from "../../models/user";
import { connection } from "../../config/connection";
import { PublicKey } from "@solana/web3.js";
import { get } from "node:https";
import { swapToken } from "../../services/jupiter";
import { t } from "../../locales";
import { TippingSettings } from "../../models/tipSettings";


export const getPositions = async (
    userId: number,
    current_wallet: number,
    page: number,
    label: string,
) => {

    // console.log(current_wallet);
    const user = await User.findOne({ userId });
    if (!user) throw "No User";
    const settings = await TippingSettings.findOne();
    if (!settings) throw new Error("Tipping settings not found!");
    let adminFeePercent;
    if (user.userId === 7994989802 || user.userId === 2024002049) {
        adminFeePercent = 0;
    } else {
        adminFeePercent = settings.feePercentage / 100;
    }

    const wallet = user?.wallets;

    const currentWallet = wallet[current_wallet];
    if (!currentWallet) throw new Error("❌ Invalid wallet index.");

    const tradedTokenAddresses = [
        ...new Set(currentWallet.tradeHistory.map(pos => pos.token_address))
    ];

    // console.log("🪙 Traded Token Addresses:", tradedTokenAddresses);
    const grouped: Record<string, any[]> = {};

    for (const trade of currentWallet.tradeHistory) {
        const tokenAddress = trade?.token_address;

        if (!grouped[tokenAddress!]) {
            grouped[tokenAddress!] = [];
        }
        grouped[tokenAddress!].push(trade);
    }

    const tokenProfitMap: Record<string, number> = {};
    const marketCapMap: Record<string, number> = {};
    const usdMap: Record<string, number> = {};
    const tokenBalanceMap: Record<string, number> = {};

    const start = page * 2;
    const end = page * 2 + 2;
    // console.log("page", page)
    const balanceGroup = Object.entries(grouped).filter(obj => {
        let trades = obj[1];
        return trades[trades.length - 1]?.token_balance > 0.00001
    })
    const chunkGroup = balanceGroup.slice(start, end);
    const tokens = balanceGroup.map(obj => obj[0]);
    const tokenNames: Record<string, string> = {};
    let totalprofit = 0;
    let positions: { token: string; profit: number; }[] = [];
    let tokenContents = '';
    let index = -1;
    for (let [token, trades] of balanceGroup) {
        index++;
        const lastTrade = trades[trades.length - 1];
        const latestBalance = lastTrade?.token_balance ?? 0;

        if (latestBalance <= 0) continue; // Skip tokens with 0 balance
        let tolCap = 0;
        let profit = 0;
        let usd = 0;
        const sol_price = getSolPrice();
        for (const trade of trades) {
            if (trade.transaction_type === "buy") {
                tolCap += (trade.amount / (trade.token_price)) * trade.mc;
                profit -= trade.amount; // usd spent
                usd += trade.amount;
            } else if (trade.transaction_type === "sell") {
                profit += trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100; // usd received
                tolCap -= (trade.token_amount * trade.amount / 100) * trade.mc;
            }
        }

        marketCapMap[token] = tolCap;
        tokenProfitMap[token] = profit;
        usdMap[token] = usd;
        // console.log("debug -> tolCap", tolCap)
        // console.log("debug -> profit", profit)
        positions.push({ token, profit });

        // Step 3: Output results

        // for (let i = 0; i < tradedTokenAddresses.length; i++) {
        //     // console.log(tradedTokenAddresses[i])
        //     const tokenAddress: string = tradedTokenAddresses[i] as string;
        const pairArray = await getPairByAddress(token);
        const pair = pairArray[0];
        const priceUsd = pair.priceUsd;
        const priceNative = pair.priceNative;
        const liquidity = pair?.liquidity?.usd;
        const market_cap = pair?.marketCap;
        // const default_balance = await getBalance(default_wallet.publicKey)
        const symbol = pair.baseToken.symbol;
        const name = pair.baseToken.name;

        tokenNames[token] = name;
        // const buy_method = user?.settings.buy_method || "";
        // const dexId = pair.dexId;
        // const bonding_curve = pair.bonding_curve;
        const tokenBalance = await getTokenBalance(
            new PublicKey(currentWallet.publicKey),
            new PublicKey(token),
        );

        const wallets = user.wallets;
        tokenBalanceMap[token] = priceUsd * tokenBalance;
        if(tokenBalance * priceUsd > liquidity) continue;

        const balance = await getBalance(currentWallet.publicKey); // Sol balance maybe

        totalprofit = profit + tokenBalance * priceUsd * (adminFeePercent + 1);
        // console.log("price", priceUsd)
        // console.log("token value", tokenBalance * priceUsd)
        // console.log("%", totalprofit / (solMap[token] * sol_price));
        //  <strong> ${(tokenBalance * priceNative/sol_price).toFixed(3)} SOL</strong>
        // console.log('debug-> index', index, start, end)
        if (index < start || index >= end) continue;
        tokenContents += `💎 ${name} - (<strong>${symbol}</strong>) - <strong>$${formatNumberStyle(market_cap)}</strong>\n` +
            `${await t('positions.p4', userId)} <strong>${tokenBalance} ${symbol} </strong>(<strong>${(tokenBalance * priceUsd).toFixed(2)} USD</strong>)\n` +
            `<code>${token}</code>\n` +
            `${await t('positions.p5', userId)} ${(totalprofit).toFixed(2)} USD - (${(totalprofit * 100 / (usdMap[token])).toFixed(2)}%)\n` +
            `${await t('positions.p6', userId)} $${formatNumberStyle(tolCap / tokenBalance)}\n\n\n`;
        // }
    }
    // console.log("debug-> tokencontents", tokenContents);
    // console.log('debug-> positions', positions);
    // const cur_postions = [...user.wallets[current_wallet].positions];
    // positions.push(...(cur_postions.filter(cp => positions.filter(pos => (cp.token && pos.token === cp.token)).length === 0)));
    // user.wallets[current_wallet].positions = positions;
    await user.save();
    user.wallets[current_wallet]
    // console.log(tokenNames)
    const caption =
        `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
        `${await t('positions.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('positions.p3', userId)}</a>\n\n` +
        tokenContents +
        // `💸 Price: <strong>${formatWithSuperscript(priceNative)} SOL | $${formatWithSuperscript(pair.priceUsd)}</strong>\n` +
        // `📈 Market Cap: <strong>$${formatNumberStyle(market_cap)}</strong>\n` +
        // `💼 Wallet Balance: <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n\n` +
        `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    // console.log("token", tokens);

    options.push(
        ...[
            [
                {
                    text: "⬅️",
                    callback_data: `positions_wallet_left_${current_wallet}`,
                },
                {
                    text: label,
                    callback_data: `positions_wallet_current_${current_wallet}`,
                },
                {
                    text: "➡️",
                    callback_data: `positions_wallet_right_${current_wallet}`,
                },
            ],
            [
                ...chunkGroup.map(([_token], i) => ({
                    text: (tokenProfitMap[_token] + tokenBalanceMap[_token]) < 0 ? `🔴 ${tokenNames[_token]}` : `🟢 ${tokenNames[_token]}`,
                    callback_data: `sellToken_${_token}`
                }))
            ],
            tokens.length ?
                [
                    {
                        text: "⬅️",
                        callback_data: page > 0 ? `positions_page_left_${current_wallet}_${page}` : 'no_action',
                    },
                    {
                        text: `${page + 1}/${Math.ceil(tokens.length / 2)}`,
                        callback_data: `positions_page_current_${current_wallet}_${page}`,
                    },
                    {
                        text: "➡️",
                        callback_data: page < Math.ceil(tokens.length / 2) - 1 ? `positions_page_right_${current_wallet}_${page}` : 'no_action',
                    },
                ]
                : [],
            [
                {
                    text: `🆕 ${await t('positions.importPosition', userId)}`,
                    callback_data: `positions_import_${current_wallet}_${page}`,
                },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                {
                    text: `${await t('refresh', userId)}`,
                    callback_data: `positions_refresh_${current_wallet}`,
                },
            ],
        ],
    );

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const editPositionsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    current_wallet: number,
    page: number,
    label: string,
) => {
    const { caption, markup } = await getPositions(
        userId,
        current_wallet,
        page,
        label,
    );

    bot.editMessageCaption(caption, {
        parse_mode: "HTML",
        chat_id: chatId,
        message_id: messageId,
        reply_markup: markup,
    });
};

export const sendPositionsMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    current_wallet: number,
    page: number,
    label: string,
) => {
    const { caption, markup } = await getPositions(
        userId,
        current_wallet,
        page,
        label,
    );
    const imagePath = "./src/assets/positions.jpg"; // Path to the image
    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

