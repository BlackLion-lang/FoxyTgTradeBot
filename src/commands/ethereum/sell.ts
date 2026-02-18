import TelegramBot from "node-telegram-bot-api"
import { dismissOptions, formatNumber, walletDexscreenerUrl, walletScanUrl } from "../../utils/ethereumUtils"
import { User } from "../../models/user"
import { Token } from "../../models/token"
import { newTokenRegistered } from "../../services/ethereum/dexscreener"
import { getBalance, getEtherPrice } from "../../services/ethereum/etherscan"
import { getTokenBalancWithContract } from "../../services/ethereum/contract"
import { t } from "../../locales"
import { getLastUpdatedTime, formatNumberStyle, formatWithSuperscript } from "../../services/other"

export async function Sell(bot: TelegramBot, chatId: number, userId: number, address: string) {
    try {
        const user = await User.findOne({userId})
        if(!user) {
            await bot.sendMessage(chatId, `❌ User not found.`, dismissOptions);
            return;
        }
        const settings = user.settings || {};
        const wallets = user.ethereumWallets || [];
        
        let token = await Token.findOne({ address: { $regex: new RegExp(`^${address}$`, "i") } })
        if(!token) {
            token = await newTokenRegistered(address)
            if(!token) {
                await bot.sendMessage(chatId, `❌ Not a valid token:${address}`, dismissOptions)
                return
            }
        }

        // Get active wallet
        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        if (!active_wallet) {
            await bot.sendMessage(chatId, `❌ No active wallet found.`, dismissOptions);
            return;
        }

        const active_wallet_balance = await getBalance(active_wallet.publicKey || '')
        const eth_price = await getEtherPrice()
        const estimatedGasFeeEth = 0.0004; // Estimated gas fee per transaction
        const estimatedGasFeeUsd = estimatedGasFeeEth * eth_price;
        const chainName = 'ETH'

        // Get token balance for active wallet
        const tokenBalance = await getTokenBalancWithContract(address, active_wallet.publicKey || '')
        let tokenPriceUsd = token?.priceUsd
        const tokenSymbol = token?.symbol || 'TOKEN'

        // If price is missing or 0, try to fetch fresh data
        if (!tokenPriceUsd || tokenPriceUsd === 0) {
            try {
                const { getPairInfoWithTokenAddress } = await import("../../services/ethereum/dexscreener");
                const pairInfo = await getPairInfoWithTokenAddress(address);
                if (pairInfo?.priceUsd) {
                    tokenPriceUsd = pairInfo.priceUsd;
                    // Update token in database
                    token.priceUsd = pairInfo.priceUsd;
                    token.liquidity = pairInfo.liquidity?.usd || token.liquidity;
                    token.market_cap = pairInfo.marketCap || token.market_cap;
                    await token.save();
                }
            } catch (error) {
                console.error('Error fetching fresh token price:', error);
            }
        }

        const enabled = user.settings.auto_sell?.enabled_ethereum ?? false;
        const text = enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const status = enabled ? "🟢" : "🔴"
        const p1 = user.settings.mev ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const p2 = user.settings.mev ? "🟢" : "🔴"

        // Calculate profit from trade history (similar to Solana)
        // Group trades by token address
        const grouped: Record<string, any[]> = {};
        for (const trade of active_wallet.tradeHistory || []) {
            const tokenAddr = trade?.token_address;
            if (!tokenAddr) continue;
            if (!grouped[tokenAddr]) {
                grouped[tokenAddr] = [];
            }
            grouped[tokenAddr].push(trade);
        }

        // Calculate profit maps
        const tokenProfitMap: Record<string, number> = {};
        const usdMap: Record<string, number> = {};

        for (const [tokenAddr, trades] of Object.entries(grouped)) {
            let profit = 0;
            let usd = 0;
            
            for (const trade of trades) {
                if (trade.transaction_type === "buy") {
                    // Subtract gas fee from buy amount (actual cost = amount - gas fee, as gas reduces net investment)
                    const actualCost = trade.amount - estimatedGasFeeUsd;
                    profit -= actualCost; // USD spent after accounting for gas
                    usd += trade.amount; // Track invested amount without gas for percentage calculation
                } else if (trade.transaction_type === "sell") {
                    // For sell: amount is percentage (0-100), token_amount is token amount sold, token_price is price per token
                    // Subtract gas fee from sell amount (actual received = usdReceived - gas fee)
                    const usdReceived = (trade.token_amount || 0) * (trade.amount || 0) * (trade.token_price || 0) / 100;
                    const actualReceived = usdReceived - estimatedGasFeeUsd;
                    profit += actualReceived; // USD received after gas
                }
            }

            tokenProfitMap[tokenAddr] = profit;
            usdMap[tokenAddr] = usd;
        }

        // Calculate total profit for this token (including current token balance value)
        const tokenProfit = tokenProfitMap[address] || 0;
        const sendUsd = usdMap[address] || 0;
        const totalprofit = tokenProfit + tokenBalance * (tokenPriceUsd || 0);
        const icon = totalprofit < 0 ? "🔴" : "🟢";

        // Build caption
        const priceDisplay = tokenPriceUsd ? formatWithSuperscript(tokenPriceUsd.toString()) : '0'
        const tokenValueUsd = tokenPriceUsd && tokenBalance ? (tokenBalance * tokenPriceUsd).toFixed(2) : '0.00'

        let caption = `<strong>${await t('sell.p1', userId)}</strong>\n\n` +
            `💎 ${token?.name || 'Token'} | <strong>$${tokenSymbol}</strong>\n` +
            `<code>${address}</code>\n\n` +
            `${await t('sell.p2', userId)} <strong>$${priceDisplay}</strong> - ` +
            `${await t('sell.p3', userId)} <strong>$${formatNumberStyle(token?.liquidity || 0)}</strong> - ` +
            `${await t('sell.p4', userId)} <strong>$${formatNumberStyle(token?.market_cap || 0)}</strong>\n\n` +
            `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${active_wallet_balance.toFixed(4)} ${chainName} ($${(active_wallet_balance * eth_price).toFixed(2)} USD)\n` +
            `<code>${active_wallet.publicKey}</code>\n\n` +
            // `<strong>${await t('settings.mev', userId)} : </strong>${p2} ${p1}\n\n` +
            `<strong>${await t('sell.p13', userId)}</strong> ${status} ${text}\n` +
            `   <strong>${await t('buy.p13', userId)}</strong> ${user.settings.auto_sell?.takeProfitPercent_ethereum ?? 10} %\n` +
            `   <strong>${await t('buy.p14', userId)}</strong> ${user.settings.auto_sell?.stopLossPercent_ethereum ?? -40} %\n\n` +
            `${await t('sell.p8', userId)} <strong>${tokenBalance.toFixed(2)} ${tokenSymbol} | $${tokenValueUsd}</strong>\n` +
            (tokenBalance > 0 ? `${icon} ${await t('sell.p9', userId)} : ${totalprofit.toFixed(2)} USD (${sendUsd > 0 ? (totalprofit * 100 / sendUsd).toFixed(2) : '0.00'}%)\n` : '') +
            `\n${await t('sell.p11', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
            `<strong>${await t('sell.p12', userId)}</strong>`

        // Build markup - matching Solana's sell UI structure
        const options: TelegramBot.InlineKeyboardButton[][] = [
            [
                {
                    text: "Etherscan",
                    url: walletScanUrl(address),
                },
                {
                    text: "DexScreener",
                    url: walletDexscreenerUrl(address),
                },
            ],
            [
                {
                    text: `${await t('sell.p15', userId)}`,
                    switch_inline_query: walletDexscreenerUrl(address),
                },
            ],
            [
                { text: `💳 ${active_wallet.label || 'Wallet'} : ${active_wallet_balance.toFixed(4)} ${chainName} ( $${(active_wallet_balance * eth_price).toFixed(2)} )`, callback_data: "wallets_default" },
            ],
            [
                { text: `${await t('sell.settings', userId)}`, callback_data: "settings" },
                {
                    text: `💦 ${await t('sell.sell', userId)} : ${settings.slippage_eth?.sell_slippage_eth || 0.5} %`,
                    callback_data: "settings_sell_slippage_eth",
                }
            ],
            // Gas fee selection buttons
            (() => {
                const gasValues = settings.gas_values_eth || [10, 50, 100];
                const currentGas = settings.option_gas_eth || 10;
                return [
                    {
                        text: (currentGas !== gasValues[0] && currentGas !== gasValues[1] && currentGas !== gasValues[2]) 
                            ? `⛽ ${currentGas} Gwei 🟢` 
                            : `⛽ Gas`,
                        callback_data: "settings_sell_gas_eth"
                    },
                    {
                        text: currentGas === gasValues[0] ? `${gasValues[0]} 🟢` : `${gasValues[0]}`,
                        callback_data: "sell_gas_eth_0"
                    },
                    {
                        text: currentGas === gasValues[1] ? `${gasValues[1]} 🟢` : `${gasValues[1]}`,
                        callback_data: "sell_gas_eth_1"
                    },
                    {
                        text: currentGas === gasValues[2] ? `${gasValues[2]} 🟢` : `${gasValues[2]}`,
                        callback_data: "sell_gas_eth_2"
                    }
                ];
            })(),
            [
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[0] || 10}%`, callback_data: "sell_10" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell?.sell_percent?.[1] || 20}%`, callback_data: "sell_20" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell?.sell_percent?.[2] || 50}%`, callback_data: "sell_50" },
            ],
            [
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell?.sell_percent?.[3] || 75}%`, callback_data: "sell_75" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell?.sell_percent?.[4] || 100}%`, callback_data: "sell_100" },
                { text: `💰${await t('sell.sell', userId)} X %`, callback_data: "sell_x" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('refresh', userId)}`, callback_data: "sell_refresh" },
            ],
        ]

        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: options,
        }

        bot.sendMessage(chatId, caption, {
            parse_mode: 'HTML',
            reply_markup: newMarkup,
            disable_web_page_preview: true
        }).then(async sentMessage => {
            if (user.manual_message_id) {
                bot.deleteMessage(chatId, user.manual_message_id).catch(() => {});
            }
            user.manual_message_id = sentMessage.message_id;
            await user.save()
        })
    } catch (error) {
        console.error('Ethereum sell error:', error);
        await bot.sendMessage(chatId, `❌ Error: Could not process sell for token ${address}.`, dismissOptions);
    }
}

export async function SellEdit(bot: TelegramBot, chatId: number, userId: number, messageId: number, address: string) {
    try {
        const user = await User.findOne({userId})
        if(!user) throw "No User Found"
        const wallets = user.ethereumWallets || []
        const settings = user.settings || {}

        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        if (!active_wallet) throw "No active Wallet"

        let token = await Token.findOne({ address: { $regex: new RegExp(`^${address}$`, "i") } }) 
        if(!token) {
            token = await newTokenRegistered(address)
            if(!token) return
        } 

        const active_wallet_balance = await getBalance(active_wallet.publicKey || '')
        const eth_price = await getEtherPrice()
        const estimatedGasFeeEth = 0.0004; // Estimated gas fee per transaction
        const estimatedGasFeeUsd = estimatedGasFeeEth * eth_price;
        const chainName = 'ETH'

        // Get token balance for active wallet
        const tokenBalance = await getTokenBalancWithContract(address, active_wallet.publicKey || '')
        let tokenPriceUsd = token?.priceUsd
        const tokenSymbol = token?.symbol || 'TOKEN'

        // If price is missing or 0, try to fetch fresh data
        if (!tokenPriceUsd || tokenPriceUsd === 0) {
            try {
                const { getPairInfoWithTokenAddress } = await import("../../services/ethereum/dexscreener");
                const pairInfo = await getPairInfoWithTokenAddress(address);
                if (pairInfo?.priceUsd) {
                    tokenPriceUsd = pairInfo.priceUsd;
                    // Update token in database
                    token.priceUsd = pairInfo.priceUsd;
                    token.liquidity = pairInfo.liquidity?.usd || token.liquidity;
                    token.market_cap = pairInfo.marketCap || token.market_cap;
                    await token.save();
                }
            } catch (error) {
                console.error('Error fetching fresh token price:', error);
            }
        }

        const enabled = user.settings.auto_sell?.enabled_ethereum ?? false;
        const text = enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const status = enabled ? "🟢" : "🔴"
        const p1 = user.settings.mev ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const p2 = user.settings.mev ? "🟢" : "🔴"

        // Calculate profit from trade history (similar to Solana)
        // Group trades by token address
        const grouped: Record<string, any[]> = {};
        for (const trade of active_wallet.tradeHistory || []) {
            const tokenAddr = trade?.token_address;
            if (!tokenAddr) continue;
            if (!grouped[tokenAddr]) {
                grouped[tokenAddr] = [];
            }
            grouped[tokenAddr].push(trade);
        }

        // Calculate profit maps
        const tokenProfitMap: Record<string, number> = {};
        const usdMap: Record<string, number> = {};

        for (const [tokenAddr, trades] of Object.entries(grouped)) {
            let profit = 0;
            let usd = 0;
            
            for (const trade of trades) {
                if (trade.transaction_type === "buy") {
                    const actualCost = trade.amount - estimatedGasFeeUsd;
                    profit -= actualCost; // USD spent after accounting for gas
                    usd += trade.amount; // Track invested amount without gas for percentage calculation
                } else if (trade.transaction_type === "sell") {
                    const usdReceived = (trade.token_amount || 0) * (trade.amount || 0) * (trade.token_price || 0) / 100;
                    const actualReceived = usdReceived - estimatedGasFeeUsd;
                    profit += actualReceived; // USD received after gas
                }
            }

            tokenProfitMap[tokenAddr] = profit;
            usdMap[tokenAddr] = usd;
        }

        // Calculate total profit for this token (including current token balance value)
        const tokenProfit = tokenProfitMap[address] || 0;
        const sendUsd = usdMap[address] || 0;
        const totalprofit = tokenProfit + tokenBalance * (tokenPriceUsd || 0);
        const icon = totalprofit < 0 ? "🔴" : "🟢";

        // Build caption
        const priceDisplay = tokenPriceUsd ? formatWithSuperscript(tokenPriceUsd.toString()) : '0'
        const tokenValueUsd = tokenPriceUsd && tokenBalance ? (tokenBalance * tokenPriceUsd).toFixed(2) : '0.00'

        let caption = `<strong>${await t('sell.p1', userId)}</strong>\n\n` +
            `💎 ${token?.name || 'Token'} | <strong>$${tokenSymbol}</strong>\n` +
            `<code>${address}</code>\n\n` +
            `${await t('sell.p2', userId)} <strong>$${priceDisplay}</strong> - ` +
            `${await t('sell.p3', userId)} <strong>$${formatNumberStyle(token?.liquidity || 0)}</strong> - ` +
            `${await t('sell.p4', userId)} <strong>$${formatNumberStyle(token?.market_cap || 0)}</strong>\n\n` +
            `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${active_wallet_balance.toFixed(4)} ${chainName} ($${(active_wallet_balance * eth_price).toFixed(2)} USD)\n` +
            `<code>${active_wallet.publicKey}</code>\n\n` +
            `<strong>${await t('sell.p13', userId)}</strong> ${status} ${text}\n` +
            `   <strong>${await t('buy.p13', userId)}</strong> ${user.settings.auto_sell?.takeProfitPercent_ethereum ?? 10} %\n` +
            `   <strong>${await t('buy.p14', userId)}</strong> ${user.settings.auto_sell?.stopLossPercent_ethereum ?? -40} %\n\n` +
            `${await t('sell.p8', userId)} <strong>${tokenBalance.toFixed(2)} ${tokenSymbol} | $${tokenValueUsd}</strong>\n` +
            (tokenBalance > 0 ? `${icon} ${await t('sell.p9', userId)} : ${totalprofit.toFixed(2)} USD (${sendUsd > 0 ? (totalprofit * 100 / sendUsd).toFixed(2) : '0.00'}%)\n` : '') +
            `\n${await t('sell.p11', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
            `<strong>${await t('sell.p12', userId)}</strong>`

        // Build markup - matching Solana's sell UI structure
        const options: TelegramBot.InlineKeyboardButton[][] = [
            [
                {
                    text: "Etherscan",
                    url: walletScanUrl(address),
                },
                {
                    text: "DexScreener",
                    url: walletDexscreenerUrl(address),
                },
            ],
            [
                {
                    text: `${await t('sell.p15', userId)}`,
                    switch_inline_query: walletDexscreenerUrl(address),
                },
            ],
            [
                { text: `💳 ${active_wallet.label || 'Wallet'} : ${active_wallet_balance.toFixed(4)} ${chainName} ( $${(active_wallet_balance * eth_price).toFixed(2)} )`, callback_data: "wallets_default" },
            ],
            [
                { text: `${await t('sell.settings', userId)}`, callback_data: "settings" },
                {
                    text: `💦 ${await t('sell.sell', userId)} : ${settings.slippage_eth?.sell_slippage_eth || 0.5} %`,
                    callback_data: "settings_sell_slippage_eth",
                }
            ],
            // Gas fee selection buttons
            (() => {
                const gasValues = settings.gas_values_eth || [10, 50, 100];
                const currentGas = settings.option_gas_eth || 10;
                return [
                    {
                        text: (currentGas !== gasValues[0] && currentGas !== gasValues[1] && currentGas !== gasValues[2]) 
                            ? `⛽ ${currentGas} Gwei 🟢` 
                            : `⛽ Gas`,
                        callback_data: "settings_sell_gas_eth"
                    },
                    {
                        text: currentGas === gasValues[0] ? `${gasValues[0]} 🟢` : `${gasValues[0]}`,
                        callback_data: "sell_gas_eth_0"
                    },
                    {
                        text: currentGas === gasValues[1] ? `${gasValues[1]} 🟢` : `${gasValues[1]}`,
                        callback_data: "sell_gas_eth_1"
                    },
                    {
                        text: currentGas === gasValues[2] ? `${gasValues[2]} 🟢` : `${gasValues[2]}`,
                        callback_data: "sell_gas_eth_2"
                    }
                ];
            })(),
            [
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[0] || 10}%`, callback_data: "sell_10" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[1] || 20}%`, callback_data: "sell_20" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[2] || 50}%`, callback_data: "sell_50" },
            ],
            [
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[3] || 75}%`, callback_data: "sell_75" },
                { text: `💰${await t('sell.sell', userId)} ${settings.quick_sell_eth?.sell_percent_eth?.[4] || 100}%`, callback_data: "sell_100" },
                { text: `💰${await t('sell.sell', userId)} X %`, callback_data: "sell_x" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('refresh', userId)}`, callback_data: "sell_refresh" },
            ],
        ]

        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: options,
        }

        // Try editing as text first, fall back to caption if needed
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'HTML',
                reply_markup: newMarkup,
                disable_web_page_preview: true
            })
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: 'HTML',
                    reply_markup: newMarkup 
                })
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Sell message is already up to date');
            return;
        }
        console.error('Error editing sell message:', error);
    }
}

