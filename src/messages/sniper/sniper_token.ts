import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    isValidSolanaAddress,
    getTokenSecurityInfo
} from "../../services/solana";
import { getPairByAddress, fetchPumpFunData } from "../../services/dexscreener";
import { getAdminPanelMarkup, getMenuMarkup } from "../../utils/markup";
import { getMenu, sendMenu } from "../index";
import { editMenuMessage, sendAdminPanelMessage, sendWelcomeMessage, sendAddUserMessage, sendMenuMessage, sendMenuMessageWithImage } from "../index";
import {
    formatNumberStyle,
    formatWithSuperscript,
    getCurrentTime,
    getLastUpdatedTime,
    getlocationTime,
    getFrenchTime,
    isMEVProtect,
    msToTime
} from "../../services/other";
import { getImage } from "../Image/image"
import { User } from "../../models/user";
import { connection } from "../../config/connection";
import { PublicKey } from "@solana/web3.js";
import { swapToken } from "../../services/jupiter";
import { Market } from "@raydium-io/raydium-sdk-v2";
import { t } from "../../locales";
import { TippingSettings } from "../../models/tipSettings";
import { limitOrderData } from "../../models/limitOrder";

let invest = 0;
let pnl = 0;
let pnlpercent = 0;
let selltoken = 0;

export const getSniperSell = async (userId: number, address: string) => {

    const pairArray = await getPairByAddress(address);
    const pair = pairArray[0];
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

    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    );
    if (!active_wallet) throw "No active Wallet";

    const grouped: Record<string, any[]> = {};

    for (const trade of active_wallet.tradeHistory) {
        const tokenAddress = trade?.token_address;
        // const {
        //     token_address,
        //     transaction_type,
        //     amount, //SOL spent (on buy) or % of token sold (on sell)
        //     token_amount // token received (on buy) or SOL received (on sell)
        // } = trade;

        if (!grouped[tokenAddress!]) {
            grouped[tokenAddress!] = [];
        }
        grouped[tokenAddress!].push(trade);
    }

    const tokenProfitMap: Record<string, number> = {};
    const marketCapMap: Record<string, number> = {};
    const usdMap: Record<string, number> = {};
    const sellMap: Record<string, number> = {};
    const tokenBalanceMap: Record<string, number> = {};

    const chunkGroup = Object.entries(grouped);
    const tokens = Object.entries(grouped).filter(obj => {
        let trades = obj[1];
        return trades[trades.length - 1]?.token_balance > 0
    }).map(obj => obj[0]);
    const tokenNames: Record<string, string> = {};
    let totalprofit = 0;
    for (const [token, trades] of chunkGroup) {
        const lastTrade = trades[trades.length - 1];
        const latestBalance = lastTrade?.token_balance ?? 0;

        if (latestBalance <= 0) continue; // Skip tokens with 0 balance
        let tolCap = 0;
        let profit = 0;
        let usd = 0;
        let sell = 0;
        const sol_price = getSolPrice();
        for (const trade of trades) {
            if (trade.transaction_type === "buy") {
                tolCap += (trade.amount / (trade.token_price)) * trade.mc;
                profit -= trade.amount; // usd spent
                usd += trade.amount;
            } else if (trade.transaction_type === "sell") {
                profit += trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100; // usd received
                tolCap -= (trade.token_amount * trade.amount / 100) * trade.mc;
                sell += trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100;
            }
        }

        marketCapMap[token] = tolCap;
        tokenProfitMap[token] = profit;
        usdMap[token] = usd;
        sellMap[token] = sell;
        // console.log("mxc", tolCap)

        // Step 3: Output results
        // for (const [token, profit] of Object.entries(tokenProfitMap)) {
        //     console.log(`🪙 ${token}: ${profit >= 0 ? "+" : ""}${profit.toFixed(4)} SOL`);
        // }
    }

    const tokenAddress = pair.baseToken.address;
    const priceUsd = pair.priceUsd;
    const priceNative = pair.priceNative;
    const liquidity = pair?.liquidity?.usd;
    const market_cap = pair.marketCap;
    // const default_balance = await getBalance(default_wallet.publicKey)
    const symbol = pair.baseToken.symbol;
    const name = pair.baseToken.name;
    // const sell_method = user?.settings.sell_method || "";
    // const dexId = pair.dexId;
    const bonding_curve = (await fetchPumpFunData(address)).bonding_curve

    const tokenBalance = await getTokenBalance(
        new PublicKey(active_wallet.publicKey),
        new PublicKey(tokenAddress),
    );
    // console.log("debug -> tokenbalance", tokenAddress);
    // console.log(active_wallet.publicKey)
    const balance = await getBalance(active_wallet.publicKey);

    const sol_price = getSolPrice();
    // const createDate = pair.pairCreatedAt;
    // const now = Date.now();
    // const difftime = (now - createDate);
    // const { days, hours, minutes, seconds } = msToTime(now - createDate);

    // console.log(`Token Creation Date: ${days}d ${hours}h ${minutes}m ${seconds}s`);

    const tokenSecurityInfo = await getTokenSecurityInfo(address)
    const freezeAuthority = tokenSecurityInfo?.freezeAuthority;
    const mintAuthority = tokenSecurityInfo?.mintAuthority;
    const isSafe = tokenSecurityInfo?.safe || false;

    const freezeStatus = freezeAuthority === true ? "🟢" : "🔴";
    const mintStatus = mintAuthority === true ? "🟢" : "🔴";
    let renounceStatus = "🔴"; // Default to red cross
    if (isSafe) {
        renounceStatus = "🟢"; // Green check if safe
    } else if (freezeAuthority === null && mintAuthority === null) {
        renounceStatus = "🟢"; // both renounced = safer
    } else if (freezeAuthority !== null || mintAuthority !== null) {
        renounceStatus = "⚠️"; // warning: dev still controls something
    }

    totalprofit = tokenProfitMap[tokenAddress] + tokenBalance * priceUsd * (adminFeePercent + 1);
    const MarketC = marketCapMap[tokenAddress] / tokenBalance;
    const sendUsd = usdMap[tokenAddress];
    const tokensell = sellMap[tokenAddress];
    // console.log(sendUsd, totalprofit)
    // invest += sendUsd;
    // pnl += totalprofit;
    // pnlpercent += totalprofit / sendUsd
    // selltoken += tokensell;

    // console.log("profit", totalprofit)
    // console.log("%", totalprofit / sendUsd)
    // console.log("marketcap", MarketC)

    const icon = totalprofit < 0 ? "🔴" : "🟢";
    const status = user.sniper.allowAutoSell ? "🟢" : "🔴";
    const text = user.settings.auto_sell.enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`

    const p1 = user.settings.mev ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
    const p2 = user.settings.mev ? "🟢" : "🔴";

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
        `<strong>${await t('sell.p1', userId)}</strong>\n\n` +
        `💎 ${name} | <strong>$${symbol}</strong>\n <code>${tokenAddress}</code>\n\n` +
        // `Token Creation Date: ${days}d ${hours}h ${minutes}m ${seconds}s ago\n\n` +
        `${await t('sell.p2', userId)} <strong>$${formatWithSuperscript(pair.priceUsd)}</strong> - ` +
        `${await t('sell.p3', userId)} <strong>$${formatNumberStyle(liquidity)}</strong> - ` +
        `${await t('sell.p4', userId)} <strong>$${formatNumberStyle(market_cap)}</strong>\n\n` +
        // `👤 Renounced: <strong>Freeze ✅ | Mint ✅</strong>\n` +
        `<strong>${renounceStatus}</strong> ${await t('sell.p5', userId)}\n` +
        `<strong>${freezeStatus}</strong> ${await t('sell.p6', userId)}\n` +
        `<strong>${mintStatus}</strong> ${await t('sell.p7', userId)}\n\n` +
        // `💸 Price: <strong>${formatWithSuperscript(priceNative)} | $${formatWithSuperscript(pair.priceUsd)}</strong>\n` +
        // `📈 Market Cap: <strong>$${formatNumberStyle(market_cap)}</strong>\n` +
        // `🏦 Liquidity: <strong>$${formatNumberStyle(liquidity)}</strong>\n\n` +
        `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${balance.toFixed(2)} SOL ($${(balance * sol_price).toFixed(2)} USD)\n` +
        `<code>${active_wallet.publicKey}</code>\n\n` +
        `<strong>${await t('settings.mev', userId)} : </strong>${p2} ${p1}\n\n` +
        `<strong>${await t('sell.p13', userId)}</strong> ${status} ${text}\n\n` +
        `${await t('sell.p8', userId)} <strong>${tokenBalance} ${symbol} | $${(tokenBalance * priceUsd).toFixed(2)}</strong>\n` +
        // `<code>${active_wallet.publicKey}</code>\n\n` +
        `${icon} ${await t('sell.p9', userId)} : ${(totalprofit / sol_price).toFixed(6)} SOL (${(totalprofit * 100 / sendUsd).toFixed(2)}%)\n` +
        `${await t('sell.p10', userId)} $ ${formatNumberStyle(MarketC)}\n\n` +
        // `💼 Wallet Balance: <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `${await t('sell.p11', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
        `<strong>${await t('sell.p12', userId)}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [
        [
            {
                text: "Sol Scan",
                url: `https://solscan.io/token/${address}`,
            },
            {
                text: "DexScreener",
                url: `https://dexscreener.com/solana/${address}`,
            },
        ],
        [
            {
                text: `${await t('sell.p15', userId)}`,
                switch_inline_query: `https://dexscreener.com/solana/${address}`,
            },
        ],
        [
            { text: `💳 ${active_wallet.label} : ${balance.toFixed(2)} SOL ( $${(balance * sol_price).toFixed(2)} )`, callback_data: "wallets_default" },
        ],
        [
            { text: `${await t('sell.settings', userId)}`, callback_data: "settings" },
            {
                text: `💦 ${await t('sell.sell', userId)} : ${user.settings.slippage.sell_slippage}%`,
                callback_data: "settings_sell_slippage",
            }
        ],
        [
            { text: `💰${await t('sell.sell', userId)} ${user.settings.quick_sell.sell_percent[0]}%`, callback_data: "sell_10" },
            { text: `💰${await t('sell.sell', userId)} ${user.settings.quick_sell.sell_percent[1]}%`, callback_data: "sell_20" },
            { text: `💰${await t('sell.sell', userId)} ${user.settings.quick_sell.sell_percent[2]}%`, callback_data: "sell_50" },
        ],
        [
            { text: `💰${await t('sell.sell', userId)} ${user.settings.quick_sell.sell_percent[3]}%`, callback_data: "sell_75" },
            { text: `💰${await t('sell.sell', userId)} ${user.settings.quick_sell.sell_percent[4]}%`, callback_data: "sell_100" },
            { text: `💰${await t('sell.sell', userId)} X %`, callback_data: "sell_x" },
        ],
        [
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
            { text: `${await t('refresh', userId)}`, callback_data: "sell_refresh" },
        ],
        // [{ text: "🗑 Close", callback_data: "sell_close" }],
    ];

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const sendSniperSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string
) => {
    const { caption, markup } = await getSniperSell(userId, address);

    bot.deleteMessage(chatId, messageId)
    bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const editSniperSell = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    try {
        const { caption, markup } = await getSniperSell(userId, address);

        // Try to edit as text message first
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: markup,
            });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Sell message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing sell message:', error);
    }
};

export const sendSniperBuyWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    tokenAddress: string,
    solAmount: number,
) => {
    const user = await User.findOne({ userId });
    if (!user) throw "No User";

    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    );

    const sol_price = getSolPrice();
    const balance = await getBalance(active_wallet?.publicKey || "");
    // Send a message confirming the token swap and display the token address
    const text = `${await t('quickBuy.p7', userId)}\n\n` +
        `Token : <code>${tokenAddress}</code>\n\n` +
        `${await t('quickBuy.p14', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `<code>${active_wallet?.publicKey}</code>\n\n` +
        `🟡 <strong><em>${await t('quickBuy.p8', userId)}</em></strong>\n` +
        `${solAmount} SOL ⇄\n` +
        `${await t('quickBuy.p9', userId)}: ${user.settings.slippage.buy_slippage} % \n\n` +
        `<strong><em>${await t('quickBuy.p10', userId)}</em></strong>`
    const sent = bot.sendMessage(
        chatId,
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${await t('quickBuy.viewToken', userId)}`, url: `https://solscan.io/token/${tokenAddress}` },
                    ],
                    [
                        { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                    ]
                ]
            },
        },
    );
    setTimeout(async () => {
        bot.deleteMessage(chatId, (await sent).message_id).catch(() => { });
    }, 10000);
    console.log("sendmessage", text)

    // Define the SwapResult interface for handling the swap result
    interface SwapResult {
        success: boolean;
        error?: string;
        signature?: string;
    }

    // Perform the token swap using the swapToken01 function
    await swapToken(
        userId,
        active_wallet?.publicKey || "",
        tokenAddress,
        solAmount, // Amount to swap
        "buy", // Action type
        user.settings.slippage.buy_slippage * 100,
        user.settings.fee_setting.buy_fee * 10 ** 11,
        0
    ).then(async (result: SwapResult) => {
        // Handle the result of the swap
        if (result.success && active_wallet) {
            const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
            if (!settings) throw new Error("Tipping settings not found!");
            const sol_price = getSolPrice();
            const pairArray = await getPairByAddress(tokenAddress);
            const pair = pairArray[0];
            const priceUsd = pair.priceUsd;
            const priceNative = pair.priceNative;
            const liquidity = pair?.liquidity?.usd;
            const market_cap = pair?.marketCap;
            const symbol = pair.baseToken.symbol;
            const name = pair.baseToken.name;
            // console.log("token_price", priceNative);
            const tokenBalance = await getTokenBalance(
                new PublicKey(active_wallet.publicKey),
                new PublicKey(tokenAddress),
            );
            
            console.log("debug -> publicKey", active_wallet.publicKey)
            console.log("debug -> tokenBalance", tokenAddress)
            console.log("debug -> tokenBalance", tokenBalance)
            let adminFeePercent;
            if (user.userId === 7994989802 || user.userId === 2024002049) {
                adminFeePercent = 0;
            } else {
                adminFeePercent = settings.feePercentage / 100;
            }
            active_wallet?.tradeHistory.push({
                transaction_type: "buy",
                token_address: tokenAddress.toString(),
                amount: solAmount * sol_price,
                token_price: priceUsd,
                // token_amount: 0.01 / priceNative,
                token_balance: tokenBalance,
                mc: market_cap,
                date: Date.now(),
                name: name,
                tip: solAmount * adminFeePercent,
                pnl: true
            });
            await user.save();
            if (user.settings.auto_sell.enabled) {
                const existingOrder = await limitOrderData.findOne({
                    user_id: userId,
                    token_mint: tokenAddress,
                    wallet: active_wallet.publicKey,
                    status: "Pending",
                });

                const newAmount = tokenBalance;
                const newTargetPrice1 = ((user.settings.auto_sell.takeProfitPercent + 100) * priceUsd) / 100;
                const newTargetPrice2 = ((user.settings.auto_sell.stopLossPercent + 100) * priceUsd) / 100;

                if (existingOrder) {
                    // Order exists: update token amount and target price (optional: weighted avg)

                    const totalAmount = newAmount;

                    const updatedTargetPrice1 = (
                        (existingOrder.token_amount * existingOrder.target_price1 + (newAmount - existingOrder.token_amount) * newTargetPrice1) /
                        totalAmount
                    );

                    const updatedTargetPrice2 = (
                        (existingOrder.token_amount * existingOrder.target_price2 + (newAmount - existingOrder.token_amount) * newTargetPrice2) /
                        totalAmount
                    );

                    await limitOrderData.updateOne(
                        { _id: existingOrder._id },
                        {
                            $set: {
                                token_amount: totalAmount,
                                Tp: user.settings.auto_sell.takeProfitPercent,
                                Sl: user.settings.auto_sell.stopLossPercent,
                                target_price1: updatedTargetPrice1,
                                targer_price2: updatedTargetPrice2,
                                status: "Pending"
                            },
                        }
                    );
                    console.log("🔄 Existing limit order updated.");
                } else {
                    // No order exists: create a new one
                    const orderData = {
                        user_id: userId,
                        wallet: active_wallet.publicKey,
                        token_mint: tokenAddress,
                        token_amount: newAmount,
                        Tp: user.settings.auto_sell.takeProfitPercent,
                        Sl: user.settings.auto_sell.stopLossPercent,
                        target_price1: newTargetPrice1,
                        target_price2: newTargetPrice2,
                        status: "Pending",
                    };

                    const limitOrder = new limitOrderData(orderData);
                    await limitOrder.save();
                }
            }

            // }    
            // const safeTxLink = `https://solscan.io/tx/${result.signature}`;
            // bot.sendMessage(
            //     chatId,
            //     `✅ Token Swapped Successfully!\n\n🔗 Transaction: https://solscan.io/tx/${result.signature}`
            // )
            const text = `${await t('quickBuy.p7', userId)}\n\n` +
                `Token : <code>${tokenAddress}</code>\n\n` +
                `${await t('quickBuy.p14', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
                `<code>${active_wallet?.publicKey}</code>\n\n` +
                `🟢 <strong><em>${await t('quickBuy.p8', userId)}</em></strong>\n` +
                `${solAmount} SOL ⇄ ${(solAmount * sol_price / priceUsd).toFixed(2)} ${symbol}\n` +
                `${await t('quickBuy.p11', userId)} ${formatNumberStyle(market_cap)}\n\n` +
                `<strong><em>${await t('quickBuy.p12', userId)}</em></strong> - <a href="https://solscan.io/tx/${result.signature}">${await t('quickBuy.p13', userId)}</a>`
            setTimeout(async () => {
                await bot.deleteMessage(chatId, messageId);
            }, 5000);
            bot.sendMessage(
                chatId,
                text,
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('quickBuy.viewToken', userId)}`, url: `https://solscan.io/token/${tokenAddress}` },
                                { text: `${await t('quickBuy.positions', userId)}`, callback_data: "positions" },
                                { text: `${await t('quickBuy.sell', userId)}`, callback_data: `sellToken_${tokenAddress}` },
                            ],
                            [
                                { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                            ]
                        ]
                    },
                },
            );

            console.log("debug -> sellMenu")

            // const { caption, markup } = await getSell(userId, tokenAddress);
            // bot.sendMessage(chatId, caption, {
            //     parse_mode: "HTML",
            //     reply_markup: markup,
            // });
            return;

        } else {
            const sent = bot.sendMessage(chatId, `${await t('errors.transactionFailed', userId)}`);
            setTimeout(async () => {
                bot.deleteMessage(chatId, (await sent).message_id).catch(() => { });
            }, 10000);
            sendMenu(bot, chatId, userId, messageId);
            // ${result.error}
        }

        // } else {
        //     bot.sendMessage(chatId, `❌ Error: ${result.error}`);
        // }
    });

    // Fetch the buy message and send it to the user
    // const { caption, markup } = await getBuy(userId, tokenAddress);
    // bot.sendMessage(chatId, caption, {
    //     parse_mode: "HTML",
    //     reply_markup: markup,
    // });

};