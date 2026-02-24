import TelegramBot from "node-telegram-bot-api"
import { User } from "../../models/user"
import { Token } from "../../models/token"
import { getBalance, getEtherPrice } from "../../services/ethereum/etherscan"
import { swapExactTokenForETHUsingUniswapV2_ } from "../../services/ethereum/swap"
import { decryptSecretKey } from "../../config/security"
import { walletScanTxUrl } from "../../utils/ethereum"
import { t } from "../../locales"
import { ethers } from "ethers"
import { isEvmAddress } from "../../utils/ethereumUtils"
import { getTokenBalancWithContract } from "../../services/ethereum/contract"
import { TippingSettings } from "../../models/tipSettings"
import { limitOrderData } from "../../models/limitOrder"
import { formatNumberStyle, getCurrentTime, getFrenchTime, getlocationTime } from "../../services/other"
import { getPairInfoWithTokenAddress, newTokenRegistered } from "../../services/ethereum/dexscreener"
import { getImage } from "../Image/image"
import { getCloseButton } from "../../utils/markup"

export const editEthereumSellMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    address: string,
) => {
    try {
        const { SellEdit } = await import("../../commands/ethereum/sell");
        await SellEdit(bot, chatId, userId, messageId, address);
    } catch (error: any) {
        if (error?.message && (error.message.includes('message is not modified') || error.message.includes('message to edit not found'))) {
            console.log('Sell message is already up to date or not found');
            return;
        }
        console.error('Error editing sell message:', error);
    }
}

export const sendEthereumSellMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    bot.sendMessage(
        chatId,
        `${await t('messages.sell', userId)}`,
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
                    const { Sell } = await import("../../commands/ethereum/sell");
                    await bot.deleteMessage(chatId, messageId).catch(() => {});
                    await Sell(bot, chatId, userId, address);
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

export const sendEthereumSellMessageWithAddress = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    tokenAddress: string,
    sellPercent: number,
    tokenBalance: number,
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
    
    const tokenAmountToSell = (tokenBalance * sellPercent) / 100;
    
    const text = `${await t('quickSell.p7', userId)}\n\n` +
        `Token : <code>${tokenAddress}</code>\n\n` +
        `${await t('quickSell.p18', userId)} : ${active_wallet?.label} - <strong>${balance.toFixed(4)} ETH</strong> ($${(balance * eth_price).toFixed(2)})\n` +
        `<code>${active_wallet?.publicKey}</code>\n\n` +
        `${await t('quickSell.tokenBalance', userId)} <strong>${tokenBalance.toFixed(2)} ${token.symbol || 'TOKEN'}</strong>\n` +
        `${await t('quickSell.selling', userId)} <strong>${tokenAmountToSell.toFixed(2)} ${token.symbol || 'TOKEN'} (${sellPercent}%)</strong>\n\n` +
        `🟡 <strong><em>${await t('quickSell.p8', userId)}</em></strong>\n` +
        `${await t('quickSell.p11', userId)} : ${user.settings.slippage_eth?.sell_slippage_eth || 0.5} % \n\n` +
        `<strong><em>${await t('quickSell.p19', userId)}</em></strong>`
    
    const sent = bot.sendMessage(
        chatId,
        text,
        {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: `${await t('quickSell.viewToken', userId)}`, url: `https://etherscan.io/token/${tokenAddress}` },
                    ],
                    [
                        await getCloseButton(userId)
                    ]
                ]
            },
            disable_web_page_preview: true
        },
    );
    
    setTimeout(async () => {
        bot.deleteMessage(chatId, (await sent).message_id).catch(() => { });
    }, 20000);

    try {
        const slippage = BigInt(Math.floor((user.settings.slippage_eth?.sell_slippage_eth || 0.5) * 100000))
        
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
        
        const tokenDecimals = token.decimal || 18;
        
        const amount = ethers.parseUnits(tokenAmountToSell.toString(), tokenDecimals);
        
        const deadline = Math.floor(Date.now() / 1000) + 1200;
        
        const result = await swapExactTokenForETHUsingUniswapV2_({
            index: 0,
            amount: amount,
            token_address: tokenAddress,
            pair_address: token.pairAddress || "",
            slippage: slippage,
            gas_amount: gas_amount,
            dexId: token.dex_name || "Uniswap V2",
            secretKey: secretKey,
            deadline: deadline,
            userId: userId
        });

        if (result && result.success) {
            const eth_price = await getEtherPrice();
            const updatedBalance = await getBalance(active_wallet.publicKey || "");
            const txHash = result.hash || '';
            // Extract ETH amount from swap_result object
            const ethReceivedWei = result.expectedAmountOut || 0n;
            const ethReceived = Number(ethReceivedWei) / 1e18;
            const ethReceivedNum = ethReceived;
            
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
            
            // Get remaining token balance after sell
            const remainingTokenBalance = await getTokenBalancWithContract(tokenAddress, active_wallet.publicKey || "");
            // Calculate token amount sold for display (matching Solana format)
            const tokenAmountSold = tokenAmountToSell;
            
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
                transaction_type: "sell",
                amount: sellPercent, // Percentage sold (0-100) - matching Solana structure
                token_price: tokenInfo.priceUsd,
                token_amount: tokenAmountSold, // Token amount sold
                token_balance: remainingTokenBalance, // Remaining balance after sell
                mc: tokenInfo.marketCap,
                date: Date.now().toString(),
                name: tokenInfo.name,
                tip: ethReceivedNum * eth_price * adminFeePercent,
                pnl: true
            });
            
            // Update or remove limit order if exists
            const existingOrder = await limitOrderData.findOne({
                user_id: userId,
                token_mint: tokenAddress,
                wallet: active_wallet.publicKey,
                status: "Pending",
            });
            
            if (existingOrder) {
                if (remainingTokenBalance <= 0.00001) {
                    // All tokens sold, mark order as success
                    existingOrder.status = "Success";
                    await existingOrder.save();
                } else {
                    // Update token amount
                    existingOrder.token_amount = remainingTokenBalance;
                    await existingOrder.save();
                }
            }
            
            await user.save();
            
            // Delete pending message
            try {
                await bot.deleteMessage(chatId, (await sent).message_id);
            } catch (e) {
                // Ignore if already deleted or not found
            }
            
            // Calculate USD value of tokens sold (matching Solana: priceUsd * tokenAmount)
            const tokenSoldUsd = tokenAmountSold * tokenInfo.priceUsd;
            
            // Calculate PnL for image generation (similar to Solana)
            let invest = 0;
            let selltoken = 0;
            let pnl = 0;
            let pnlpercent = 0;
            
            // Group trades by token
            const grouped: Record<string, any[]> = {};
            for (const trade of active_wallet.tradeHistory || []) {
                const tokenAddr = trade.token_address;
                if (!tokenAddr) continue; // Skip trades without token address
                if (!grouped[tokenAddr]) grouped[tokenAddr] = [];
                grouped[tokenAddr].push(trade);
            }
            
            // PNL calculation maps
            const tokenProfitMap: Record<string, number> = {};
            const usdInvestedMap: Record<string, number> = {};
            const sellUsdMap: Record<string, number> = {};
            
            // Calculate PNL per token (only for tokens with pnl = true)
            for (const [tokenAddr, trades] of Object.entries(grouped)) {
                // Filter trades where pnl = true
                const activeTrades = trades.filter((t: any) => t.pnl === true);
                if (activeTrades.length === 0) continue;
                
                let totalProfit = 0;
                let totalUsdInvested = 0;
                let totalSellUsd = 0;
                
                for (const trade of activeTrades) {
                    if (trade.transaction_type === "buy") {
                        totalProfit -= trade.amount; // USD spent
                        totalUsdInvested += trade.amount;
                    } else if (trade.transaction_type === "sell") {
                        // For sell: amount is percentage (0-100), token_amount is token amount sold, token_price is price per token
                        const usdReceived = (trade.token_amount || 0) * (trade.amount || 0) * (trade.token_price || 0) * (adminFeePercent + 1) / 100;
                        totalProfit += usdReceived; // USD received
                        totalSellUsd += usdReceived;
                    }
                }
                
                tokenProfitMap[tokenAddr] = totalProfit;
                usdInvestedMap[tokenAddr] = totalUsdInvested;
                sellUsdMap[tokenAddr] = totalSellUsd;
            }
            
            // Calculate totals for the sold token
            const tokenAddressKey = tokenAddress || '';
            const tokenProfit = tokenProfitMap[tokenAddressKey] ?? 0;
            const usdInvested = usdInvestedMap[tokenAddressKey] ?? 0;
            const sellUsd = sellUsdMap[tokenAddressKey] ?? 0;
            
            // PNL calculation
            const totalPNL = sellUsd - usdInvested;
            const pnlPercent = usdInvested > 0 ? totalPNL * 100 / usdInvested : 0;
            
            // Update totals for image/dashboard
            invest = usdInvested;
            pnl = totalPNL;
            pnlpercent = pnlPercent;
            selltoken = sellUsd;
            
            // Format confirmation message matching Solana style
            const caption_finish = `${await t('quickSell.p7', userId)}\n\n` +
                `Token : <code>${tokenAddress}</code>\n\n` +
                `${await t('quickSell.p18', userId)} : ${active_wallet?.label || 'Wallet'} - <strong>${updatedBalance.toFixed(4)} ETH</strong> ($${(updatedBalance * eth_price).toFixed(2)})\n` +
                `<code>${active_wallet?.publicKey}</code>\n\n` +
                `🟢 <strong><em>${await t('quickSell.p8', userId)}</em></strong>\n` +
                `${await t('quickSell.p13', userId)} ${remainingTokenBalance.toFixed(2)} ${tokenInfo.symbol}\n` +
                `${await t('quickSell.p14', userId)} ${tokenAmountSold.toFixed(2)} ${tokenInfo.symbol} ⇄ ${tokenSoldUsd.toFixed(2)} USD\n` +
                `${await t('quickSell.p15', userId)} ${formatNumberStyle(tokenInfo.marketCap || 0)}\n\n` +
                `<strong><em>${await t('quickSell.p19', userId)}</em></strong> - <a href="${walletScanTxUrl(txHash)}">${await t('quickSell.p19', userId)}</a>`
            
            await bot.sendMessage(chatId, caption_finish, {
                parse_mode: 'HTML',
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `${await t('quickSell.viewToken', userId)}`, url: `https://etherscan.io/token/${tokenAddress}` },
                            { text: `${await t('quickSell.positions', userId)}`, callback_data: "positions" },
                            { text: `${await t('quickSell.buy', userId)}`, callback_data: `buyToken_eth_${tokenAddress}` },
                        ],
                        [
                            await getCloseButton(userId)
                        ]
                    ]
                }
            });
            
            // Generate PnL image if image_activation is enabled and selling 100%
            if (user.settings.image_activation && sellPercent == 100) {
                const imagePath = `./src/assetsOut/${getlocationTime(Date.now()).toString()}.jpg`;
                
                //@ts-ignore
                function shortenUsername(username: string, maxLength = 15) {
                    if (!username) return '';
                    if (username.length <= maxLength) return username;
                    return username.slice(0, maxLength - 1) + '…';
                }
                
                const displayName = shortenUsername(user.username || '');
                const displayTokenName = shortenUsername(tokenInfo.name || '');
                
                await getImage(
                    `@${displayName}`,
                    `Date de vente : UTC : ${getCurrentTime()}\n                         FR : ${getFrenchTime()}`,
                    `${displayTokenName} / $${tokenInfo.symbol}`,
                    `${(invest / eth_price).toFixed(4)} ETH - (${invest.toFixed(4)} USD)`,
                    `${(selltoken / eth_price).toFixed(4)} ETH - (${selltoken.toFixed(4)} USD)`,
                    `${((selltoken - invest) / eth_price).toFixed(2)} ETH - (${(selltoken - invest).toFixed(2)} USD)`,
                    `${pnlpercent.toFixed(2)}% - (${pnl.toFixed(2)} USD)`,
                    imagePath
                );
                
                // Send PnL generation message
                const sent = await bot.sendMessage(chatId, `${await t('messages.pnl', userId)}`, { parse_mode: "HTML" });
                setTimeout(async () => {
                    await bot.deleteMessage(chatId, sent.message_id).catch(() => {});
                }, 3000);
                
                // Send the PnL image
                const caption = `${await t('sell.p14', userId)}`;
                await bot.sendPhoto(chatId, imagePath, {
                    caption,
                    parse_mode: "HTML",
                });
            }
            
            // Change pnl=false for all trades of this token when selling 100%
            if (active_wallet?.tradeHistory?.length > 0 && sellPercent == 100) {
                active_wallet?.tradeHistory.forEach((trade: any) => {
                    if (trade.token_address === tokenAddress) {
                        trade.pnl = false;
                    }
                });
                await user.save();
            }
        }
    } catch (error: any) {
        console.error('Ethereum sell error:', error);
        const errorMessage = error?.message || error?.toString() || "Unknown error";
        await bot.sendMessage(chatId, `❌ ${await t('errors.transactionFailed', userId)}: ${errorMessage}`, {
            disable_web_page_preview: true
        });
    }
};
