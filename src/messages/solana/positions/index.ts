import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    getTokenSecurityInfo,
    isValidSolanaAddress,
} from "../../../services/solana";
import { getPairByAddress } from "../../../services/dexscreener";
import {
    formatNumberStyle,
    formatWithSuperscript,
    getCurrentTime,
    getLastUpdatedTime,
    isMEVProtect,
} from "../../../services/other";
import { getUserChain } from "../../../utils/chain";
import { User } from "../../../models/user";
import { connection } from "../../../config/connection";
import { PublicKey } from "@solana/web3.js";
import { get } from "node:https";
import { swapToken } from "../../../services/jupiter";
import { t } from "../../../locales";
import { TippingSettings } from "../../../models/tipSettings";


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
    // Only include tokens that still have balance (exclude sold positions) – verify with on-chain balance
    const balanceGroup: Array<[string, any[]]> = [];
    for (const [tokenAddress, trades] of Object.entries(grouped)) {
        const lastTrade = trades[trades.length - 1];
        const lastBalance = lastTrade?.token_balance ?? 0;
        if (lastBalance > 0.00001) {
            try {
                const onChainBalance = await getTokenBalance(
                    new PublicKey(currentWallet.publicKey),
                    new PublicKey(tokenAddress),
                );
                if (onChainBalance > 0.00001) {
                    balanceGroup.push([tokenAddress, trades]);
                }
            } catch {
                balanceGroup.push([tokenAddress, trades]);
            }
        }
    }
    
    // If no tokens with balance found, return empty positions message
    if (balanceGroup.length === 0) {
        const caption = `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
            `${await t('positions.p2', userId)}\n <a href="${(await getUserChain(userId)) === "ethereum" ? "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=eth&section=positions&sig=rwI1fOLjR9pWKYaKJByNfr-ilWH_sqvs" : "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=positions&sig=djM7IBXJtvVe5_o4TWGJsMBsy95PFStz"}">${await t('positions.p3', userId)}</a>\n\n` +
            `${await t('positions.p8', userId)}\n\n` +
            `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
            `${await t('positions.whatToDo', userId)}`;
        
        const options: TelegramBot.InlineKeyboardButton[][] = [
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
        ];
        
        return { caption, markup: { inline_keyboard: options } };
    }
    
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
        positions.push({ token, profit });

        const pairArray = await getPairByAddress(token);
        const pair = pairArray[0];
        const priceUsd = pair.priceUsd;
        const priceNative = pair.priceNative;
        const liquidity = pair?.liquidity?.usd;
        const market_cap = pair?.marketCap;
        const symbol = pair.baseToken.symbol;
        const name = pair.baseToken.name;

        tokenNames[token] = name;
        const tokenBalance = await getTokenBalance(
            new PublicKey(currentWallet.publicKey),
            new PublicKey(token),
        );

        const wallets = user.wallets;
        tokenBalanceMap[token] = priceUsd * tokenBalance;

        const balance = await getBalance(currentWallet.publicKey); // Sol balance maybe

        totalprofit = profit + tokenBalance * priceUsd * (adminFeePercent + 1);
        if (index < start || index >= end) continue;
        tokenContents += `💎 ${name} - (<strong>${symbol}</strong>) - <strong>$${formatNumberStyle(market_cap)}</strong>\n` +
            `${await t('positions.p4', userId)} <strong>${tokenBalance} ${symbol} </strong>(<strong>${(tokenBalance * priceUsd).toFixed(2)} USD</strong>)\n` +
            `<code>${token}</code>\n` +
            `${totalprofit >= 0 ? '🟢' : '🔴'} ${await t('positions.p5', userId)} ${(totalprofit).toFixed(2)} USD - (${(totalprofit * 100 / (usdMap[token])).toFixed(2)}%)\n` +
            `${await t('positions.p6', userId)} $${formatNumberStyle(tolCap / tokenBalance)}\n\n\n`;
    }
    await user.save();
    user.wallets[current_wallet]

    const caption =
        `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
        `${await t('positions.p2', userId)}\n <a href="${(await getUserChain(userId)) === "ethereum" ? "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=eth&section=positions&sig=rwI1fOLjR9pWKYaKJByNfr-ilWH_sqvs" : "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=positions&sig=djM7IBXJtvVe5_o4TWGJsMBsy95PFStz"}">${await t('positions.p3', userId)}</a>\n\n` +
        tokenContents +
        `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
        `${await t('positions.whatToDo', userId)}`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];

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
                {
                    text: `🗑️ ${await t('positions.deletePosition', userId)}`,
                    callback_data: `positions_delete_menu_sol_${current_wallet}_${page}`,
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

function labelFromTrades(trades: any[], mint: string): string {
    const last = trades[trades.length - 1];
    const n = last?.name;
    if (typeof n === "string" && n.trim()) {
        const s = n.trim();
        return s.length > 22 ? `${s.slice(0, 20)}…` : s;
    }
    return mint.length > 16 ? `${mint.slice(0, 8)}…${mint.slice(-6)}` : mint;
}

/** Same ordering as visible rows in `getPositions` (balance group). */
export async function getActivePositionsForDeletionSolana(
    userId: number,
    current_wallet: number,
): Promise<{ mint: string; label: string }[]> {
    const user = await User.findOne({ userId });
    if (!user?.wallets?.[current_wallet]) return [];
    const currentWallet = user.wallets[current_wallet];
    const grouped: Record<string, any[]> = {};
    for (const trade of currentWallet.tradeHistory || []) {
        const tokenAddress = trade?.token_address;
        if (!tokenAddress) continue;
        if (!grouped[tokenAddress]) grouped[tokenAddress] = [];
        grouped[tokenAddress].push(trade);
    }
    const out: { mint: string; label: string }[] = [];
    for (const [tokenAddress, trades] of Object.entries(grouped)) {
        const lastTrade = trades[trades.length - 1];
        const lastBalance = lastTrade?.token_balance ?? 0;
        if (lastBalance > 0.00001) {
            try {
                const onChainBalance = await getTokenBalance(
                    new PublicKey(currentWallet.publicKey),
                    new PublicKey(tokenAddress),
                );
                if (onChainBalance > 0.00001) {
                    out.push({ mint: tokenAddress, label: labelFromTrades(trades, tokenAddress) });
                }
            } catch {
                out.push({ mint: tokenAddress, label: labelFromTrades(trades, tokenAddress) });
            }
        }
    }
    return out;
}

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

