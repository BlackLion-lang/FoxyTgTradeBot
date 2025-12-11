import TelegramBot from "node-telegram-bot-api";
import {
    getBalance,
    getSolPrice,
    getTokenBalance,
    getTokenSecurityInfo,
    isValidSolanaAddress,
} from "../../services/solana";
import { getPairByAddress, fetchPumpFunData } from "../../services/dexscreener";
import {
    formatNumberStyle,
    formatWithSuperscript,
    getCurrentTime,
    getLastUpdatedTime,
    msToTime,
    isMEVProtect,
    getFrenchTime,
    getlocationTime,
} from "../../services/other";
import { getImage } from "../Image/image"
import {
    sendSellMessageWithAddress,
    sendSellMessage,
    editSellMessageWithAddress,
    getSell
} from "../sell";
import { User } from "../../models/user";
import { limitOrderData } from "../../models/limitOrder";
import { connection } from "../../config/connection";
import { LAMPORTS_PER_SOL, Message, PublicKey } from "@solana/web3.js";
import { get } from "node:https";
import { swapToken } from "../../services/jupiter";
import { toTokenPrice } from "@raydium-io/raydium-sdk-v2";
import { DefaultDeserializer } from "node:v8";
import { t } from "../../locales";
import { sendMenu, sendMenuMessage } from "..";
import { TippingSettings } from "../../models/tipSettings";
import { settings } from "../../commands/settings";

// let invest = 0;

export const getBuy = async (userId: number, address: string) => {
    const pairArray = await getPairByAddress(address);
    const pair = pairArray[0];
    // console.log("pair",pair)
    const user = await User.findOne({ userId });
    if (!user) throw "No User";
    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    );
    if (!active_wallet) throw "No active Wallet";
    // const wallet = user?.wallets. || []
    const tokenAddress = pair.baseToken.address;
    const priceUsd = pair.priceUsd;
    const priceNative = pair.priceNative;
    const liquidity = pair?.liquidity?.usd;
    const market_cap = pair?.marketCap;
    // const default_balance = await getBalance(default_wallet.publicKey)
    const symbol = pair.baseToken.symbol;
    const name = pair.baseToken.name;
    // const buy_method = user?.settings.buy_method || "";
    const MaxSupply = pair.priceNative
    const currentSupply = pair.priceNative
    const bonding_curve = Number(currentSupply) / Number(MaxSupply);
    // const bonding_curve = Number((await fetchPumpFunData(address)).bonding_curve);
    const tokenBalance = await getTokenBalance(
        new PublicKey(active_wallet.publicKey),
        new PublicKey(tokenAddress),
    );
    const wallets = user.wallets;
    const dexId = pair.dexId;
    const createDate = pair.pairCreatedAt;
    const now = Date.now();
    const difftime = (now - createDate);
    const { days, hours, minutes, seconds } = msToTime(now - createDate);


    // console.log(`Token Creation Date: ${days}d ${hours}h ${minutes}m ${seconds}s`);

    // console.log("bonding_curve", bonding_curve);

    // active_wallet.positions.push({
    //     tAddress: tokenAddress.toString(),
    // });
    // await user.save();

    const balance = await getBalance(active_wallet.publicKey); // Sol balance maybe

    const tokenSecurityInfo = await getTokenSecurityInfo(address)
    const freezeAuthority = tokenSecurityInfo?.freezeAuthority;
    const mintAuthority = tokenSecurityInfo?.mintAuthority;
    const isSafe = tokenSecurityInfo?.safe || false;

    const sol_price = getSolPrice();



    const freezeStatus = freezeAuthority === null ? "🟢" : "🔴";
    const mintStatus = mintAuthority === null ? "🟢" : "🔴";
    let renounceStatus = "🔴"; // Default to red cross
    if (isSafe) {
        renounceStatus = "🟢"; // Green check if safe
    } else if (freezeAuthority === null && mintAuthority === null) {
        renounceStatus = "🟢"; // both renounced = safer
    } else if (freezeAuthority !== null || mintAuthority !== null) {
        renounceStatus = "⚠️"; // warning: dev still controls something
    }

    let warning = "";

    if (difftime < 1000 * 60 * 60 * user.settings.youngTokenDate) {
        warning = `${await t('buy.p2', userId)}`;
    } else {
        warning = `${await t('buy.p3', userId)}`;
    }

    const text = user.settings.auto_sell.enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
    const status = user.settings.auto_sell.enabled ? "🟢" : "🔴";

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
        `<strong>${await t('buy.p1', userId)}</strong>\n\n` +
        `💎 ${name} | <strong>$${symbol}</strong> \n<code>${tokenAddress}</code>\n\n` +
        `<strong>${warning}</strong> ${days}${await t('buy.p18', userId)} ${hours}h ${minutes}m ${seconds}s ${await t('buy.p17', userId)}\n\n` +
        `${await t('buy.p4', userId)} <strong>$${formatWithSuperscript(pair.priceUsd)}</strong> - ` +
        `${await t('buy.p5', userId)} <strong>$${formatNumberStyle(liquidity)}</strong> - ` +
        `${await t('buy.p6', userId)} <strong>$${formatNumberStyle(market_cap)}</strong>\n\n` +
        `<strong>${renounceStatus}</strong> ${await t('buy.p7', userId)}\n` +
        `<strong>${freezeStatus}</strong> ${await t('buy.p8', userId)}\n` +
        `<strong>${mintStatus}</strong> ${await t('buy.p9', userId)}\n\n` +
        `${await t('buy.p10', userId)} ${bonding_curve * 100}%\n\n` +
        // `💸 Price: <strong>${formatWithSuperscript(priceNative)} SOL | $${formatWithSuperscript(pair.priceUsd)}</strong>\n` +
        // `📈 Market Cap: <strong>$${formatNumberStyle(market_cap)}</strong>\n` +
        // `🏦 Liquidity: <strong>$${formatNumberStyle(liquidity)}</strong>\n\n` +
        `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${balance.toFixed(2)} SOL ($${(balance * sol_price).toFixed(2)} USD)\n` +
        `<code>${active_wallet.publicKey}</code>\n\n` +
        `<strong>${await t('settings.mev', userId)} :</strong> ${p2} ${p1} \n\n` +
        `<strong>${await t('buy.p11', userId)} :</strong>\n` +
        `   <strong>${await t('buy.p12', userId)} :</strong> ${status} ${text}\n` +
        `   <strong>${await t('buy.p13', userId)}</strong> ${user.settings.auto_sell.takeProfitPercent} %\n` +
        `   <strong>${await t('buy.p14', userId)}</strong> ${user.settings.auto_sell.stopLossPercent} %\n\n` +
        // `💰 Token Balance: <strong>${tokenBalance} ${name} | $${(tokenBalance * priceUsd).toFixed(2)}</strong>\n` +
        // `💼 Wallet Balance: <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `${await t('buy.p15', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
        `<strong>${await t('buy.p16', userId)}</strong>`

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
                text: `${await t('buy.p19', userId)}`,
                switch_inline_query: `https://dexscreener.com/solana/${address}`,
            },
        ],
        [
            { text: `💳 ${active_wallet.label} : ${balance.toFixed(2)} SOL ( $${(balance * sol_price).toFixed(2)} )`, callback_data: "wallets_default" },
        ],
        [
            { text: `${await t('buy.settings', userId)}`, callback_data: "settings" },
            {
                text: `💦 ${await t('buy.buy', userId)} : ${user.settings.slippage.buy_slippage}%`,
                callback_data: "settings_buy_slippage"
            }
        ],
        [
            { text: `💰${await t('buy.buy', userId)} ${user?.settings.quick_buy.buy_amount[0]} SOL`, callback_data: "buy_01" },
            { text: `💰${await t('buy.buy', userId)} ${user?.settings.quick_buy.buy_amount[1]} SOL`, callback_data: "buy_05" },
            { text: `💰${await t('buy.buy', userId)} ${user?.settings.quick_buy.buy_amount[2]} SOL`, callback_data: "buy_1" },
        ],
        [
            { text: `💰${await t('buy.buy', userId)} ${user?.settings.quick_buy.buy_amount[3]} SOL`, callback_data: "buy_2" },
            { text: `💰${await t('buy.buy', userId)} ${user?.settings.quick_buy.buy_amount[4]} SOL`, callback_data: "buy_5" },
            { text: `💰${await t('buy.buy', userId)} X SOL`, callback_data: "buy_x" },
        ],
        [
            { text: await t('bundleWallets.bundleBuyButton', userId), callback_data: "bundle_buy" },
        ],
        [
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
            { text: `${await t('refresh', userId)}`, callback_data: "buy_refresh" },
        ],
        // [{ text: "🗑 Close", callback_data: "buy_close" }],
    ];

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const sendBuyMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    bot.sendMessage(
        chatId,
        `${await t('messages.buy', userId)}`,
        {
            parse_mode: "Markdown",
            // reply_markup: {
            //     force_reply: true,
            // },
        },
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
                    const { caption, markup } = await getBuy(userId, address);
                    // const imagePath = "./src/assets/Buy.jpg"; // Ensure the image is in this path
                    bot.deleteMessage(chatId, messageId)
                    bot.sendMessage(chatId, caption, {
                        parse_mode: "HTML",
                        reply_markup: markup,
                    });
                } catch (error) {
                    console.error(error);
                    bot.sendMessage(chatId, `${await t('errors.notToken', userId)}`);
                }
            }
            bot.deleteMessage(chatId, sentMessage.message_id);
            bot.deleteMessage(chatId, reply.message_id);
        });
    });
};

export const editBuyMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    try {
        const { caption, markup } = await getBuy(userId, address);

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
            console.log('Buy message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing buy message:', error);
    }
};

export const sendBuyMessageWithAddress = async (
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
            if (user.settings.auto_sell.enabled || user.sniper.allowAutoSell) {
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

            const { caption, markup } = await getSell(userId, tokenAddress);
            bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup: markup,
            });

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
