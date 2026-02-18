import TelegramBot from "node-telegram-bot-api"
import { User } from "../../models/user"
import { Token } from "../../models/token"
import { getBalance, getEtherPrice } from "../../services/ethereum/etherscan"
import { swapExactETHForTokensUsingUniswapV2_ } from "../../services/ethereum/swap"
import { decryptSecretKey } from "../../config/security"
import { walletScanTxUrl } from "../../utils/ethereum"
import { t } from "../../locales"
import { ethers } from "ethers"
import { isEvmAddress } from "../../utils/ethereumUtils"
import { getTokenBalancWithContract } from "../../services/ethereum/contract"
import { TippingSettings } from "../../models/tipSettings"
import { limitOrderData } from "../../models/limitOrder"
import { formatNumberStyle } from "../../services/other"
import { getPairInfoWithTokenAddress, newTokenRegistered } from "../../services/ethereum/dexscreener"

export const sendEthereumBuyMessage = async (
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
            disable_web_page_preview: true
        },
    ).then((sentMessage) => {
        bot.once('text', async (reply: TelegramBot.Message) => {
            if (reply.from?.id !== userId) return;
            const address = reply.text || "";
            if (!isEvmAddress(address)) {
                const errorMessage = await bot.sendMessage(
                    chatId,
                    `${await t('errors.invalidAddress', userId)}`,
                    {
                        disable_web_page_preview: true
                    }
                );
                setTimeout(async () => {
                    bot.deleteMessage(chatId, errorMessage.message_id).catch(() => {});
                }, 5000);
            } else {
                try {
                    const { Buy } = await import("../../commands/ethereum/buy");
                    await bot.deleteMessage(chatId, messageId).catch(() => {});
                    await Buy(bot, chatId, userId, address);
                } catch (error) {
                    console.error(error);
                    await bot.sendMessage(chatId, `${await t('errors.notToken', userId)}`, {
                        disable_web_page_preview: true
                    });
                }
            }
            await bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
            await bot.deleteMessage(chatId, reply.message_id).catch(() => {});
        });
    });
}

export const editEthereumBuyMessage = async (
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
            disable_web_page_preview: true
        },
    ).then((sentMessage) => {
        bot.once('text', async (reply: TelegramBot.Message) => {
            if (reply.from?.id !== userId) return;
            const address = reply.text || "";
            if (!isEvmAddress(address)) {
                const errorMessage = await bot.sendMessage(
                    chatId,
                    `${await t('errors.invalidAddress', userId)}`,
                    {
                        disable_web_page_preview: true
                    }
                );
                setTimeout(async () => {
                    bot.deleteMessage(chatId, errorMessage.message_id).catch(() => {});
                }, 5000);
            } else {
                try {
                    await editBuyMessageWithAddress(bot, chatId, userId, messageId, address);
                } catch (error) {
                    console.error(error);
                    await bot.sendMessage(chatId, `${await t('errors.notToken', userId)}`, {
                        disable_web_page_preview: true
                    });
                }
            }
            await bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
            await bot.deleteMessage(chatId, reply.message_id).catch(() => {});
        });
    });
}

export const editBuyMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    try {
        const { BuyEdit } = await import("../../commands/ethereum/buy");
        await BuyEdit(bot, chatId, userId, messageId, address);
    } catch (error: any) {
        if (error?.message && (error.message.includes('message is not modified') || error.message.includes('message to edit not found'))) {
            console.log('Buy message is already up to date or not found');
            return;
        }
        console.error('Error editing buy message:', error);
    }
}

export const sendEthereumBuyMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    tokenAddress: string,
    ethAmount: number,
) => {
    const user = await User.findOne({ userId });
    if (!user) throw "No User";

    const active_wallet = user.ethereumWallets.find(
        (wallet) => wallet.is_active_wallet,
    );

    if (!active_wallet) {
        await bot.sendMessage(chatId, `❌ No active wallet found.`, {
            disable_web_page_preview: true
        });
        return;
    }

    const eth_price = await getEtherPrice();
    const balance = await getBalance(active_wallet.publicKey || "");
    
    let token = await Token.findOne({ address: { $regex: new RegExp(`^${tokenAddress}$`, "i") } });
    if (!token) {
        token = await newTokenRegistered(tokenAddress);
        if (!token) {
            await bot.sendMessage(chatId, `❌ ${await t('errors.notToken', userId)}.`, {
                disable_web_page_preview: true
            });
            return;
        }
    }

    const text = `${await t('quickBuy.p7', userId)}\n\n` +
        `Token : <code>${tokenAddress}</code>\n\n` +
        `${await t('quickBuy.p14', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(4)} ETH</strong> ($${(balance * eth_price).toFixed(2)})\n` +
        `<code>${active_wallet?.publicKey}</code>\n\n` +
        `🟡 <strong><em>${await t('quickBuy.p8', userId)}</em></strong>\n` +
        `${ethAmount} ETH ⇄\n` +
        `${await t('quickBuy.p9', userId)} : ${user.settings.slippage_eth?.buy_slippage_eth || 0.5} % \n\n` +
        `<strong><em>${await t('quickBuy.p16', userId)}</em></strong>`
    
    const sent = bot.sendMessage(
        chatId,
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${await t('quickBuy.viewToken', userId)}`, url: `https://etherscan.io/token/${tokenAddress}` },
                    ],
                    [
                        { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                    ]
                ]
            },
            disable_web_page_preview: true
        },
    );
    
    setTimeout(async () => {
        bot.deleteMessage(chatId, (await sent).message_id).catch(() => { });
    }, 30000);

    try {
        const slippage = BigInt(Math.floor((user.settings.slippage_eth?.buy_slippage_eth || 0.5) * 100000))
        
        // Check if auto gas is enabled, use recommended price if enabled
        let gas_amount: number;
        const autoGasEnabled = (user.settings as any).auto_gas_eth;
        if (autoGasEnabled && autoGasEnabled !== 'disabled') {
            // Use recommended gas price based on speed setting
            const { getRecommendedGasPrice } = await import("../../services/ethereum/etherscan");
            const gasSpeed = autoGasEnabled || "medium";
            gas_amount = await getRecommendedGasPrice(gasSpeed);
        } else {
            // Use manual gas setting
            gas_amount = user.settings.option_gas_eth || 10;
        }
        
        const secretKey = decryptSecretKey(active_wallet.secretKey);
        const amount = ethers.parseUnits(ethAmount.toString(), 18);
        const deadline = Math.floor(Date.now() / 1000) + 1200;
        
        const result = await swapExactETHForTokensUsingUniswapV2_({
            index: 0,
            amount: amount,
            token_address: tokenAddress,
            pair_address: token.pairAddress || "",
            slippage: slippage,
            gas_amount: gas_amount,
            dexId: token.dex_name || "Uniswap V2",
            secretKey: secretKey,
            deadline: deadline
        });

        if (result && result.success) {
            const eth_price = await getEtherPrice();
            const updatedBalance = await getBalance(active_wallet.publicKey || "");
            const txHash = result.hash || '';
            
            // Get fresh token info for accurate display
            let tokenInfo: any = null;
            try {
                const pairInfo = await getPairInfoWithTokenAddress(tokenAddress);
                if (pairInfo) {
                    tokenInfo = {
                        priceUsd: pairInfo.priceUsd || token?.priceUsd || 0,
                        marketCap: pairInfo.marketCap || token?.market_cap || 0,
                        symbol: pairInfo.baseToken?.symbol || token?.symbol || 'TOKEN',
                        name: pairInfo.baseToken?.name || token?.name || 'Token'
                    };
                } else {
                    tokenInfo = {
                        priceUsd: token?.priceUsd || 0,
                        marketCap: token?.market_cap || 0,
                        symbol: token?.symbol || 'TOKEN',
                        name: token?.name || 'Token'
                    };
                }
            } catch (error) {
                console.error('Error fetching token info:', error);
                tokenInfo = {
                    priceUsd: token?.priceUsd || 0,
                    marketCap: token?.market_cap || 0,
                    symbol: token?.symbol || 'TOKEN',
                    name: token?.name || 'Token'
                };
            }
            
            // Get token balance after buy
            const tokenBalance = await getTokenBalancWithContract(tokenAddress, active_wallet.publicKey || "");
            // Calculate token amount received (ETH amount / token price)
            const tokenAmountReceived = tokenInfo.priceUsd > 0 ? (ethAmount * eth_price / tokenInfo.priceUsd) : 0;
            
            // Get admin fee settings
            const settings = await TippingSettings.findOne();
            let adminFeePercent = 0;
            if (user.userId !== 7994989802 && user.userId !== 2024002049 && settings) {
                // Use Ethereum-specific fee percentage
                adminFeePercent = settings.feePercentageEth / 100;
            }
            
            // Add to trade history
            if (!active_wallet.tradeHistory) {
                (active_wallet as any).tradeHistory = [];
            }
            (active_wallet.tradeHistory as any[]).push({
                token_address: tokenAddress,
                transaction_type: "buy",
                amount: ethAmount * eth_price, // USD spent
                token_price: tokenInfo.priceUsd,
                token_amount: tokenAmountReceived, // Token amount received
                token_balance: tokenBalance,
                mc: tokenInfo.marketCap,
                date: Date.now().toString(),
                name: tokenInfo.name,
                tip: ethAmount * eth_price * adminFeePercent,
                pnl: true
            });
            
            // Create auto-sell order if enabled
            if (user.settings.auto_sell?.enabled_ethereum) {
                // Get Ethereum-specific TP/SL values
                const takeProfitPercent = user.settings.auto_sell.takeProfitPercent_ethereum ?? 10;
                const stopLossPercent = user.settings.auto_sell.stopLossPercent_ethereum ?? -40;
                
                const existingOrder = await limitOrderData.findOne({
                    user_id: userId,
                    token_mint: tokenAddress,
                    wallet: active_wallet.publicKey,
                    status: "Pending",
                });

                const newTargetPrice1 = ((takeProfitPercent + 100) * tokenInfo.priceUsd) / 100;
                const newTargetPrice2 = ((100 - Math.abs(stopLossPercent)) * tokenInfo.priceUsd) / 100;

                if (existingOrder) {
                    // Update existing order
                    existingOrder.token_amount = tokenBalance;
                    existingOrder.target_price1 = newTargetPrice1;
                    existingOrder.target_price2 = newTargetPrice2;
                    existingOrder.Tp = takeProfitPercent;
                    existingOrder.Sl = stopLossPercent;
                    await existingOrder.save();
                } else {
                    // Create new order
                    const orderData = {
                        user_id: userId,
                        wallet: active_wallet.publicKey,
                        token_mint: tokenAddress,
                        token_amount: tokenBalance,
                        Tp: takeProfitPercent,
                        Sl: stopLossPercent,
                        target_price1: newTargetPrice1,
                        target_price2: newTargetPrice2,
                        status: "Pending",
                    };
                    const limitOrder = new limitOrderData(orderData);
                    await limitOrder.save();
                }
            }
            
            await user.save();
            
            // Delete pending message
            setTimeout(async () => {
                try {
                    await bot.deleteMessage(chatId, (await sent).message_id);
                } catch (e) {
                    // Ignore if already deleted or not found
                }
            }, 30000);
            
            // Format confirmation message matching Solana style
            const caption_finish = `${await t('quickBuy.p7', userId)}\n\n` +
                `Token : <code>${tokenAddress}</code>\n\n` +
                `${await t('quickBuy.p14', userId)} : ${active_wallet?.label || 'Wallet'} - <strong>${updatedBalance.toFixed(4)} ETH</strong> ($${(updatedBalance * eth_price).toFixed(2)})\n` +
                `<code>${active_wallet?.publicKey}</code>\n\n` +
                `🟢 <strong><em>${await t('quickBuy.p8', userId)}</em></strong>\n` +
                `${ethAmount} ETH ⇄ ${tokenAmountReceived.toFixed(2)} ${tokenInfo.symbol}\n` +
                `${await t('quickBuy.p11', userId)} ${formatNumberStyle(tokenInfo.marketCap || 0)}\n\n` +
                `<strong><em>${await t('quickBuy.p16', userId)}</em></strong> - <a href="${walletScanTxUrl(txHash)}">${await t('quickBuy.p16', userId)}</a>`
            
            await bot.sendMessage(chatId, caption_finish, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `${await t('quickBuy.viewToken', userId)}`, url: `https://etherscan.io/token/${tokenAddress}` },
                            { text: `${await t('quickBuy.positions', userId)}`, callback_data: "positions" },
                            { text: `${await t('quickBuy.sell', userId)}`, callback_data: `sellToken_eth_${tokenAddress}` },
                        ],
                        [
                            { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                        ]
                    ]
                }
            });

            console.log("debug -> sellMenu")

            // Automatically open sell menu after successful buy (similar to Solana)
            const { Sell } = await import("../../commands/ethereum/sell");
            await Sell(bot, chatId, userId, tokenAddress);
        }
    } catch (error: any) {
        console.error('Ethereum buy error:', error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        await bot.sendMessage(chatId, `❌ ${await t('errors.transactionFailed', userId)}: ${errorMessage}`, {
            disable_web_page_preview: true
        });
    }
};
