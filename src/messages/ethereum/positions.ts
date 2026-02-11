import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getBalance, getEtherPrice } from "../../services/ethereum/etherscan";
import { getTokenBalancWithContract } from "../../services/ethereum/contract";
import { getPairInfoWithTokenAddress } from "../../services/ethereum/dexscreener";
import { formatNumberStyle, formatWithSuperscript, getLastUpdatedTime } from "../../services/other";
import { t } from "../../locales";
import { TippingSettings } from "../../models/tipSettings";
import { Token } from "../../models/token";

export const getEthereumPositions = async (
    userId: number,
    current_wallet: number,
    page: number,
    label: string,
) => {
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

    const wallets = user?.ethereumWallets || [];

    const currentWallet = wallets[current_wallet];
    if (!currentWallet) throw new Error("❌ Invalid wallet index.");

    // Handle empty or missing trade history
    if (!currentWallet.tradeHistory || currentWallet.tradeHistory.length === 0) {
        const caption = `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
            `${await t('positions.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('positions.p3', userId)}</a>\n\n` +
            `${await t('positions.noPositionsFound', userId)}\n\n` +
            `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}`;
        
        const options: TelegramBot.InlineKeyboardButton[][] = [
            [
                {
                    text: "⬅️",
                    callback_data: `positions_wallet_left_eth_${current_wallet}`,
                },
                {
                    text: label,
                    callback_data: `positions_wallet_current_eth_${current_wallet}`,
                },
                {
                    text: "➡️",
                    callback_data: `positions_wallet_right_eth_${current_wallet}`,
                },
            ],
            [
                {
                    text: `🆕 ${await t('positions.importPosition', userId)}`,
                    callback_data: `positions_import_eth_${current_wallet}_${page}`,
                },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('refresh', userId)}`, callback_data: `positions_refresh_eth_${current_wallet}` },
            ],
        ];
        
        return { caption, markup: { inline_keyboard: options } };
    }

    const tradedTokenAddresses = [
        ...new Set((currentWallet.tradeHistory || []).map((pos: any) => pos.token_address))
    ];

    const grouped: Record<string, any[]> = {};

    for (const trade of currentWallet.tradeHistory || []) {
        const tokenAddress = trade?.token_address;
        if (!tokenAddress) continue; // Skip trades without token address

        if (!grouped[tokenAddress]) {
            grouped[tokenAddress] = [];
        }
        grouped[tokenAddress].push(trade);
    }

    const tokenProfitMap: Record<string, number> = {};
    const marketCapMap: Record<string, number> = {};
    const usdMap: Record<string, number> = {};
    const tokenBalanceMap: Record<string, number> = {};

    const start = page * 2;
    const end = page * 2 + 2;
    
    // Filter tokens - prioritize trade history balance (more reliable)
    console.log(`[Positions] Starting balance check for ${Object.keys(grouped).length} tokens`);
    const balanceGroup: Array<[string, any[]]> = [];
    for (const [token, trades] of Object.entries(grouped)) {
        const lastTrade = trades[trades.length - 1];
        const tradeHistoryBalance = lastTrade?.token_balance;
        
        console.log(`[Positions] Checking token ${token}: tradeHistoryBalance=${tradeHistoryBalance}, type=${typeof tradeHistoryBalance}`);
        
        // Primary check: use trade history balance if available and > 0
        // Handle both number and string types
        let balanceValue = 0;
        if (typeof tradeHistoryBalance === 'number') {
            balanceValue = tradeHistoryBalance;
        } else if (typeof tradeHistoryBalance === 'string') {
            balanceValue = parseFloat(tradeHistoryBalance);
        }
        
        if (balanceValue > 0.00001) {
            balanceGroup.push([token, trades]);
            console.log(`[Positions] ✅ Token ${token} added - trade history balance: ${balanceValue}`);
            continue;
        }
        
        // Fallback: check blockchain if trade history balance is missing or 0
        try {
            const blockchainBalance = await getTokenBalancWithContract(token, currentWallet.publicKey);
            if (blockchainBalance && blockchainBalance > 0.00001) {
                balanceGroup.push([token, trades]);
                console.log(`[Positions] ✅ Token ${token} added - blockchain balance: ${blockchainBalance}`);
            } else {
                console.log(`[Positions] ❌ Token ${token} excluded - no balance (trade history: ${balanceValue}, blockchain: ${blockchainBalance})`);
            }
        } catch (error) {
            console.error(`[Positions] Error checking blockchain balance for token ${token}:`, error);
            console.log(`[Positions] ❌ Token ${token} excluded - blockchain check failed and no trade history balance`);
        }
    }
    
    console.log(`[Positions] ✅ Found ${balanceGroup.length} tokens with balance out of ${Object.keys(grouped).length} total tokens in trade history`);
    
    // If no tokens with balance found, return empty positions message
    if (balanceGroup.length === 0) {
        const caption = `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
            `${await t('positions.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('positions.p3', userId)}</a>\n\n` +
            `No active positions found. All tokens have been sold or have zero balance.\n\n` +
            `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}`;
        
        const options: TelegramBot.InlineKeyboardButton[][] = [
            [
                {
                    text: "⬅️",
                    callback_data: `positions_wallet_left_eth_${current_wallet}`,
                },
                {
                    text: label,
                    callback_data: `positions_wallet_current_eth_${current_wallet}`,
                },
                {
                    text: "➡️",
                    callback_data: `positions_wallet_right_eth_${current_wallet}`,
                },
            ],
            [
                {
                    text: `🆕 ${await t('positions.importPosition', userId)}`,
                    callback_data: `positions_import_eth_${current_wallet}_${page}`,
                },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('refresh', userId)}`, callback_data: `positions_refresh_eth_${current_wallet}` },
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
    
    const eth_price = await getEtherPrice();
    
    for (let [token, trades] of balanceGroup) {
        index++;
        // Get actual current balance - prioritize trade history (already verified in filter)
        let tokenBalance = 0;
        const lastTrade = trades[trades.length - 1];
        
        // First try to get balance from trade history (already verified in filter)
        if (lastTrade?.token_balance) {
            if (typeof lastTrade.token_balance === 'number') {
                tokenBalance = lastTrade.token_balance;
            } else if (typeof lastTrade.token_balance === 'string') {
                tokenBalance = parseFloat(lastTrade.token_balance);
            }
        }
        
        // If trade history balance is valid, use it; otherwise try blockchain
        if (tokenBalance <= 0.00001) {
            try {
                tokenBalance = await getTokenBalancWithContract(token, currentWallet.publicKey);
                if (tokenBalance && tokenBalance > 0.00001) {
                    console.log(`[Positions] Using blockchain balance for ${token}: ${tokenBalance}`);
                }
            } catch (error) {
                console.error(`[Positions] Error getting blockchain balance for ${token}:`, error);
            }
        } else {
            console.log(`[Positions] Using trade history balance for ${token}: ${tokenBalance}`);
        }
        
        if (tokenBalance <= 0.00001) {
            console.log(`[Positions] ⚠️ Skipping token ${token} in display - balance too low: ${tokenBalance}`);
            continue; // Skip tokens with 0 balance
        }
        
        console.log(`[Positions] ✅ Processing token ${token} with balance: ${tokenBalance}`);
        let tolCap = 0;
        let profit = 0;
        let usd = 0;
        
        for (const trade of trades) {
            if (trade.transaction_type === "buy") {
                // For buy: amount is USD spent, token_price is price per token
                tolCap += (trade.amount / (trade.token_price || 1)) * (trade.mc || 0);
                profit -= trade.amount; // usd spent
                usd += trade.amount;
            } else if (trade.transaction_type === "sell") {
                // For sell: amount is percentage (0-100), token_amount is token amount sold, token_price is price per token
                // Calculate USD received: token_amount * (amount/100) * token_price * (1 + adminFeePercent)
                // This matches Solana's calculation: trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100
                const usdReceived = (trade.token_amount || 0) * (trade.amount || 0) * (trade.token_price || 0) * (adminFeePercent + 1) / 100;
                profit += usdReceived; // usd received
                // Calculate market cap reduction: (token_amount * amount / 100) * mc
                tolCap -= ((trade.token_amount || 0) * (trade.amount || 0) / 100) * (trade.mc || 0);
            }
        }

        marketCapMap[token] = tolCap;
        tokenProfitMap[token] = profit;
        usdMap[token] = usd;
        positions.push({ token, profit });

        // Get current token info
        let tokenInfo;
        try {
            const pairInfo = await getPairInfoWithTokenAddress(token);
            if (pairInfo) {
                tokenInfo = {
                    priceUsd: pairInfo.priceUsd || 0,
                    marketCap: pairInfo.marketCap || 0,
                    symbol: pairInfo.baseToken?.symbol || 'TOKEN',
                    name: pairInfo.baseToken?.name || 'Token'
                };
            } else {
                // Fallback to database
                const dbToken = await Token.findOne({ address: { $regex: new RegExp(`^${token}$`, "i") } });
                tokenInfo = {
                    priceUsd: dbToken?.priceUsd || 0,
                    marketCap: dbToken?.market_cap || 0,
                    symbol: dbToken?.symbol || 'TOKEN',
                    name: dbToken?.name || 'Token'
                };
            }
        } catch (error) {
            console.error(`Error fetching token info for ${token}:`, error);
            const dbToken = await Token.findOne({ address: { $regex: new RegExp(`^${token}$`, "i") } });
            tokenInfo = {
                priceUsd: dbToken?.priceUsd || 0,
                marketCap: dbToken?.market_cap || 0,
                symbol: dbToken?.symbol || 'TOKEN',
                name: dbToken?.name || 'Token'
            };
        }

        // tokenBalance already retrieved above, reuse it
        tokenNames[token] = tokenInfo.name;
        tokenBalanceMap[token] = tokenInfo.priceUsd * tokenBalance;

        const balance = await getBalance(currentWallet.publicKey);
        totalprofit = profit + tokenBalance * tokenInfo.priceUsd * (adminFeePercent + 1);

        if (index < start || index >= end) continue;
        
        tokenContents += `💎 ${tokenInfo.name} - (<strong>${tokenInfo.symbol}</strong>) - <strong>$${formatNumberStyle(tokenInfo.marketCap)}</strong>\n` +
            `${await t('positions.p4', userId)} <strong>${tokenBalance.toFixed(4)} ${tokenInfo.symbol} </strong>(<strong>${(tokenBalance * tokenInfo.priceUsd).toFixed(2)} USD</strong>)\n` +
            `<code>${token}</code>\n` +
            `${await t('positions.p5', userId)} ${(totalprofit).toFixed(2)} USD - (${usdMap[token] > 0 ? (totalprofit * 100 / (usdMap[token])).toFixed(2) : '0.00'}%)\n` +
            `${await t('positions.p6', userId)} $${formatNumberStyle(tokenBalance > 0 ? tolCap / tokenBalance : 0)}\n\n\n`;
    }

    await user.save();

    const caption =
        `<strong>${await t('positions.p1', userId)}</strong>\n\n` +
        `${await t('positions.p2', userId)}\n <a href="https://the-cryptofox-learning.com/">${await t('positions.p3', userId)}</a>\n\n` +
        tokenContents +
        `${await t('positions.p7', userId)} ${getLastUpdatedTime(Date.now())}`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];

    options.push(
        ...[
            [
                {
                    text: "⬅️",
                    callback_data: `positions_wallet_left_eth_${current_wallet}`,
                },
                {
                    text: label,
                    callback_data: `positions_wallet_current_eth_${current_wallet}`,
                },
                {
                    text: "➡️",
                    callback_data: `positions_wallet_right_eth_${current_wallet}`,
                },
            ],
            [
                ...chunkGroup.map(([_token], i) => ({
                    text: (tokenProfitMap[_token] + tokenBalanceMap[_token]) < 0 ? `🔴 ${tokenNames[_token]}` : `🟢 ${tokenNames[_token]}`,
                    callback_data: `sellToken_eth_${_token}`
                }))
            ],
            tokens.length ?
                [
                    {
                        text: "⬅️",
                        callback_data: page > 0 ? `positions_page_left_eth_${current_wallet}_${page}` : 'no_action',
                    },
                    {
                        text: `${page + 1}/${Math.ceil(tokens.length / 2)}`,
                        callback_data: `positions_page_current_eth_${current_wallet}_${page}`,
                    },
                    {
                        text: "➡️",
                        callback_data: page < Math.ceil(tokens.length / 2) - 1 ? `positions_page_right_eth_${current_wallet}_${page}` : 'no_action',
                    },
                ]
                : [],
            [
                {
                    text: `🆕 ${await t('positions.importPosition', userId)}`,
                    callback_data: `positions_import_eth_${current_wallet}_${page}`,
                },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                {
                    text: `${await t('refresh', userId)}`,
                    callback_data: `positions_refresh_eth_${current_wallet}`,
                },
            ],
        ],
    );

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const editEthereumPositionsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    current_wallet: number,
    page: number,
    label: string,
) => {
    const { caption, markup } = await getEthereumPositions(
        userId,
        current_wallet,
        page,
        label,
    );

    try {
        await bot.editMessageCaption(caption, {
            parse_mode: "HTML",
            chat_id: chatId,
            message_id: messageId,
            reply_markup: markup,
        });
    } catch (error: any) {
        if (error.message && error.message.includes('there is no text in the message to edit')) {
            await bot.editMessageText(caption, {
                parse_mode: "HTML",
                chat_id: chatId,
                message_id: messageId,
                reply_markup: markup,
            });
        } else {
            throw error;
        }
    }
};

export const sendEthereumPositionsMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    current_wallet: number = 0,
    page: number = 0,
    label: string = "",
) => {
    try {
        const { caption, markup } = await getEthereumPositions(
            userId,
            current_wallet,
            page,
            label,
        );
        const imagePath = "./src/assets/positions.jpg"; // Path to the image
        await bot.sendPhoto(chatId, imagePath, {
            caption,
                parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        console.error("Error sending Ethereum positions message:", error);
        await bot.sendMessage(chatId, `❌ ${error.message || "Error loading positions. Please try again."}`, {
            parse_mode: "HTML"
        });
    }
};
