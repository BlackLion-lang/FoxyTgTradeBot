import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    isValidSolanaAddress,
    getTokenSecurityInfo
} from "../../../services/solana";
import { getPairByAddress } from "../../../services/dexscreener";
import { getAdminPanelMarkup, getMenuMarkup } from "../../../utils/markup";
import { getMenu, sendMenu } from "../..";
import { editMenuMessage, sendAdminPanelMessage, sendWelcomeMessage, sendAddUserMessage, sendMenuMessage, sendMenuMessageWithImage } from "../..";
import {
    formatNumberStyle,
    formatWithSuperscript,
    getCurrentTime,
    getLastUpdatedTime,
    getlocationTime,
    getFrenchTime,
    isMEVProtect,
    msToTime
} from "../../../services/other";
import { getImage } from "../../Image/image"
import { User } from "../../../models/user";
import { connection } from "../../../config/connection";
import { PublicKey } from "@solana/web3.js";
import { swapToken } from "../../../services/jupiter";
import { Market } from "@raydium-io/raydium-sdk-v2";
import { t } from "../../../locales";
import { TippingSettings } from "../../../models/tipSettings";
import { limitOrderData } from "../../../models/limitOrder";

let invest = 0;
let pnl = 0;
let pnlpercent = 0;
let selltoken = 0;

export const getSell = async (userId: number, address: string) => {

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
    // const bonding_curve = pair.bonding_curve;

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
    const enabled = user.settings.auto_sell?.enabled_solana ?? false;
    const status = enabled ? "🟢" : "🔴";
    const text = enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`

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
        `<strong>${renounceStatus}</strong> ${await t('sell.p5', userId)}\n` +
        `<strong>${freezeStatus}</strong> ${await t('sell.p6', userId)}\n` +
        `<strong>${mintStatus}</strong> ${await t('sell.p7', userId)}\n\n` +
        `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${balance.toFixed(2)} SOL ($${(balance * sol_price).toFixed(2)} USD)\n` +
        `<code>${active_wallet.publicKey}</code>\n\n` +
        `<strong>${await t('sell.p13', userId)}</strong> ${status} ${text}\n\n` +
        `${await t('sell.p8', userId)} <strong>${tokenBalance} ${symbol} | $${(tokenBalance * priceUsd).toFixed(2)}</strong>\n` +
        `${icon} ${await t('sell.p9', userId)} : ${(totalprofit / sol_price).toFixed(6)} SOL (${(totalprofit * 100 / sendUsd).toFixed(2)}%)\n` +
        `${await t('sell.p10', userId)} $ ${formatNumberStyle(MarketC)}\n\n` +
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
            { text: await t('bundleWallets.bundleSellButton', userId), callback_data: "bundle_sell" },
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

export const sendSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    bot.sendMessage(
        chatId,
        `${await t('messages.sell', userId)}`,
        // {
        //     parse_mode: "Markdown",
        //     reply_markup: {
        //         force_reply: true,
        //     },
        // },
    ).then((sentMessage) => {
        bot.once('text', async (reply) => {
            const address = reply.text || "";
            if (!isValidSolanaAddress(address)) {
                const errorMessage = bot.sendMessage(
                    chatId,
                    `${await t('errors.invalidAddress', userId)}`,
                );
                setTimeout(async () => {
                    bot.deleteMessage(chatId, (await errorMessage).message_id);
                }, 5000);
            } else {
                try {
                    const { caption, markup } = await getSell(userId, address);

                    bot.deleteMessage(chatId, messageId)
                    bot.sendMessage(chatId, caption, {
                        parse_mode: "HTML",
                        reply_markup: markup,
                    });
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, `${await t('error.notToken', userId)}`);
                }
            }
            bot.deleteMessage(chatId, sentMessage.message_id);
            bot.deleteMessage(chatId, reply.message_id);
        });
    });
};

export const editSellMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    try {
        const { caption, markup } = await getSell(userId, address);

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

export const sendSellMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    tokenAddress: string,
    amount: number,
    tokenAmount?: any,
): Promise<void> => {
    const user = await User.findOne({ userId });
    if (!user) throw "No User";

    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    );

    // Send a message confirming the token swap and display the token address
    // bot.sendMessage(
    //     chatId,
    //     `🔃 Token Swapping\n\n` +
    //         `Token Address: ${tokenAddress}\n` +
    //         `Amount: ${amount * tokenAmount / 100}\n` +
    //         (tokenAmount
    //             ? `Token Quantity: ${tokenAmount}`
    //             : "No token quantity specified."),
    //     {
    //         parse_mode: "Markdown",
    //         reply_markup: {
    //             force_reply: false,
    //         },
    //     },
    // );
    // console.log("amount", amount);
    // console.log("tokenAmount", tokenAmount)
    const pairArray = await getPairByAddress(tokenAddress);
    const pair = pairArray[0];
    const symbol = pair.baseToken.symbol;

    const sol_price = getSolPrice();
    const balance = await getBalance(active_wallet?.publicKey || "");

    const text = `${await t('quickSell.p7', userId)}\n\n` +
        `Token : <code>${tokenAddress}</code>\n\n` +
        `${await t('quickSell.p18', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `<code>${active_wallet?.publicKey}</code>\n\n` +
        `🟡 <strong><em>${await t('quickSell.p8', userId)}</em></strong>\n` +
        `${await t('quickSell.p9', userId)} ${tokenAmount.toFixed(2)} ${symbol}\n` +
        `${await t('quickSell.p10', userId)} ${(amount * tokenAmount / 100).toFixed(2)} ${symbol} ⇄ \n` +
        `${await t('quickSell.p11', userId)} : ${user.settings.slippage.sell_slippage}% \n\n` +
        `<strong><em>${await t('quickSell.p12', userId)}</em></strong>`
    const sent = bot.sendMessage(
        chatId,
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${await t('quickSell.viewToken', userId)}`, url: `https://solscan.io/token/${tokenAddress}` }
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

    // Define the SwapResult interface
    interface SwapResult {
        success: boolean;
        error?: string;
        signature?: string;
    }

    // Perform the token swap using the swapToken function
    await swapToken(
        userId,
        active_wallet?.publicKey || "",
        tokenAddress,
        amount, // Sol amount on Buy, Percent on Sell
        "sell", // Action type
        user.settings.slippage.sell_slippage * 100,
        user.settings.fee_setting.sell_fee * 10 ** 9,
        tokenAmount, // Assuming amount is the intended variable
    ).then(async (result: SwapResult) => {
        // Handle the result of the swap
        if (result.success && active_wallet) {
            const orders = await limitOrderData.find({ status: "Pending" });
            for (const order of orders) {
                if (order.token_mint === tokenAddress) {
                    await limitOrderData.updateOne(
                        { _id: order._id },
                        { $set: { status: "Failed" } }
                    );
                }
            }
            const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
            if (!settings) throw new Error("Tipping settings not found!");
            const pairArray = await getPairByAddress(tokenAddress);
            const pair = pairArray[0];
            const priceUsd = pair.priceUsd;
            const priceNative = pair.priceNative;
            const liquidity = pair?.liquidity?.usd;
            const market_cap = pair?.marketCap;
            const symbol = pair.baseToken.symbol;
            const name = pair.baseToken.name;
            const sol_price = getSolPrice();
            // console.log("token_price", priceNative);
            const tokenBalance = await getTokenBalance(
                new PublicKey(active_wallet.publicKey),
                new PublicKey(tokenAddress),
            );
            let adminFeePercent;
            if (user.userId === 7994989802 || user.userId === 2024002049) {
                adminFeePercent = 0;
            } else {
                adminFeePercent = settings.feePercentage / 100;
            }

            active_wallet?.tradeHistory.push({
                transaction_type: "sell",
                token_address: tokenAddress.toString(),
                amount: amount,
                token_price: priceUsd,
                token_amount: tokenAmount,
                token_balance: tokenBalance,
                mc: market_cap,
                date: Date.now(),
                name: name,
                tip: amount * tokenAmount * priceUsd * adminFeePercent / (100 * sol_price),
                pnl: true
            });
            await user.save();

            // --- Group trades by token ---
            const grouped: Record<string, any[]> = {};
            for (const trade of active_wallet.tradeHistory) {
                const tokenAddr = trade.token_address;
                if (!grouped[tokenAddr!]) grouped[tokenAddr!] = [];
                grouped[tokenAddr!].push(trade);
            }

            // --- PNL calculation maps ---
            const tokenProfitMap: Record<string, number> = {};
            const marketCapMap: Record<string, number> = {};
            const usdInvestedMap: Record<string, number> = {};
            const sellUsdMap: Record<string, number> = {};
            const tokenBalanceMap: Record<string, number> = {};

            // --- Calculate PNL per token ---
            for (const [tokenAddr, trades] of Object.entries(grouped)) {
                // Filter trades where pnl = true
                const activeTrades = trades.filter(t => t.pnl === true);
                if (activeTrades.length === 0) continue;

                console.log('Active trades for ', tokenAddr, activeTrades)

                let totalProfit = 0;
                let totalMarketCap = 0;
                let totalUsdInvested = 0;
                let totalSellUsd = 0;

                // const lastTrade = activeTrades[activeTrades.length - 1];
                // const tokenBalance = lastTrade?.token_balance ?? 0;
                // if (tokenBalance <= 0) continue;

                for (const trade of activeTrades) {
                    console.log("Active Trades");
                    if (trade.transaction_type === "buy") {
                        totalMarketCap += (trade.amount / trade.token_price) * trade.mc;
                        totalProfit -= trade.amount; // USD spent
                        totalUsdInvested += trade.amount;
                        console.log("Profit", totalProfit)
                    } else if (trade.transaction_type === "sell") {
                        totalProfit += trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100;
                        totalMarketCap -= (trade.token_amount * trade.amount / 100) * trade.mc;
                        totalSellUsd += trade.token_amount * trade.amount * trade.token_price * (adminFeePercent + 1) / 100;
                    }
                }

                marketCapMap[tokenAddr] = totalMarketCap;
                tokenProfitMap[tokenAddr] = totalProfit;
                usdInvestedMap[tokenAddr] = totalUsdInvested;
                sellUsdMap[tokenAddr] = totalSellUsd;
                tokenBalanceMap[tokenAddr] = tokenBalance;
            }

            // --- Calculate totals for dashboard or image ---
            const tokenAddr = pair.baseToken.address;

            const tokenProfit = tokenProfitMap[tokenAddr] ?? 0;
            const usdInvested = usdInvestedMap[tokenAddr] ?? 0;
            const sellUsd = sellUsdMap[tokenAddr] ?? 0;
            const marketCap = marketCapMap[tokenAddr] ?? 0;

            // PNL including current token balance
            const totalPNL = sellUsd - usdInvested;
            const marketCPerToken = tokenBalance > 0 ? marketCap / tokenBalance : 0;
            const pnlPercent = usdInvested > 0 ? totalPNL * 100 / usdInvested : 0;

            // --- Update totals for image/dashboard ---
            invest = usdInvested;
            pnl = totalPNL;
            pnlpercent = pnlPercent;
            selltoken = sellUsd;

            // console.log("profit", totalprofit)
            // console.log("%", totalprofit / sendUsd)

            // const safeTxLink = `https://solscan.io/tx/${result.signature}`;
            // bot.sendMessage(
            //     chatId,
            //     `✅ Token Swapped Successfully!\n\n🔗 Transaction: https://solscan.io/tx/${result.signature}`);
            const text = `${await t('quickSell.p7', userId)}\n\n` +
                `Token : <code>${tokenAddress}</code>\n\n` +
                `${await t('quickSell.p18', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
                `<code>${active_wallet?.publicKey}</code>\n\n` +
                `🟢 <strong><em>${await t('quickSell.p8', userId)}</em></strong>\n` +
                `${await t('quickSell.p13', userId)} ${tokenBalance.toFixed(2)} ${symbol}\n` +
                `${await t('quickSell.p14', userId)} ${(amount * tokenAmount / 100).toFixed(2)} ${symbol} ⇄ ${(priceUsd * amount * tokenAmount / 100).toFixed(2)} USD\n` +
                `${await t('quickSell.p15', userId)} ${formatNumberStyle(market_cap)}\n\n` +
                `<strong><em>${await t('quickSell.p16', userId)}</em></strong> - <a href="https://solscan.io/tx/${result.signature}">${await t('quickSell.p17', userId)}</a>`
            bot.sendMessage(
                chatId,
                text,
                {
                    parse_mode: "HTML",
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('quickSell.viewToken', userId)}`, url: `https://solscan.io/token/${tokenAddress}` },
                                { text: `${await t('quickSell.positions', userId)}`, callback_data: "positions" },
                                { text: `${await t('quickSell.buy', userId)}`, callback_data: `buyToken_${tokenAddress}` },
                            ],
                            [
                                { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                            ]
                        ]
                    },
                },
            );
            sendMenu(bot, chatId, userId, messageId);
            if (user.settings.image_activation && amount == 100) {
                const imagePath = `./src/assetsOut/${getlocationTime(Date.now()).toString()}.jpg`; // Path to the image
                //@ts-ignore
                function shortenUsername(username, maxLength = 15) {
                    if (username.length <= maxLength) return username;
                    return username.slice(0, maxLength - 1) + '…';
                }
                const displayName = shortenUsername(user.username);
                const displayTokenName = shortenUsername(name);
                await getImage(
                    `@${displayName}`,
                    `Date de vente : UTC : ${getCurrentTime()}\n                         FR : ${getFrenchTime()}`,
                    `${displayTokenName} / $${symbol}`,
                    // `SOL: ${(priceNative * amount * tokenAmount / 100).toFixed(4)}`,
                    `${(invest / sol_price).toFixed(4)} SOL - (${invest.toFixed(4)} USD)`,
                    `${(selltoken / sol_price).toFixed(4)} SOL - (${selltoken.toFixed(4)} USD)`,
                    `${((selltoken - invest) / sol_price).toFixed(2)} SOL - (${(selltoken - invest).toFixed(2)} USD)`,
                    `${pnlpercent.toFixed(2)}% - (${pnl.toFixed(2)} USD)`,
                    imagePath
                )

                if (messageId > 0) {
                    try {
                        await bot.deleteMessage(chatId, messageId);
                    } catch (e) {
                        // Ignore if already deleted or not found
                    }
                }

                // Wait a moment then delete success message and show updated wallets
                const sent = await bot.sendMessage(chatId, `${await t('messages.pnl', userId)}`, { parse_mode: "HTML" });
                setTimeout(async () => {
                    await bot.deleteMessage(chatId, sent.message_id);
                    // Send fresh wallets message
                }, 3000);
                const caption = `${await t('sell.p14', userId)}`;
                bot.sendPhoto(chatId, imagePath, {
                    caption,
                    parse_mode: "HTML",
                });
            };
            // Change pnl=false for all trades of this token
            if (active_wallet?.tradeHistory?.length > 0 && amount == 100) {
                active_wallet?.tradeHistory.forEach(trade => {
                    if (trade.token_address === tokenAddress.toString()) {
                        trade.pnl = false;
                    }
                });
                await user.save();
            }
        } else {
            const sent = bot.sendMessage(chatId, `${await t('errors.transactionFailed', userId)}`,);
            setTimeout(async () => {
                bot.deleteMessage(chatId, (await sent).message_id).catch(() => { });
            }, 10000);
            sendMenu(bot, chatId, userId, messageId);
            // ${result.error}
        }
    });
};