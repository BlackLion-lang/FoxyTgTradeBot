import { Model } from 'mongoose';
import { CallbackQuery } from 'node-telegram-bot-api';
import { User } from '../../../models/user';
import { bot } from '../../../config/constant';
import { swapToken } from '../../../services/jupiter';
import { getTokenBalance } from '../../../services/solana';
import { PublicKey, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { RPC_URL } from '../../../config/constant';
import { t } from '../../../locales';

const safeDeleteMessage = async (chatId: number, messageId: number) => {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (err) {
    }
};

export const handleBundleBuy = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery,
    tokenAddress: string
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    const user = await UserModel.findOne({ userId });
    if (!user) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', userId)}`);
    }

    const userDoc = user as any;
    const bundleWallets = userDoc.bundleWallets || [];
    
    if (bundleWallets.length === 0) {
        return bot.sendMessage(
            chatId,
            `❌ *${await t('bundleWallets.noBundleWalletsForBuy', userId)}*\n\n${await t('bundleWallets.needCreateFirst', userId)}\n\n${await t('bundleWallets.goToCreate', userId)}`,
            { parse_mode: 'Markdown' }
        );
    }

    // Execute directly with all balance - no input needed
    await executeBundleBuyAllBalance(UserModel, userId, chatId, messageId, tokenAddress, bundleWallets);
};

export const handleBundleSell = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery,
    tokenAddress: string
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    const user = await UserModel.findOne({ userId });
    if (!user) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', userId)}`);
    }

    const userDoc = user as any;
    const bundleWallets = userDoc.bundleWallets || [];
    
    if (bundleWallets.length === 0) {
        return bot.sendMessage(
            chatId,
            `❌ *${await t('bundleWallets.noBundleWalletsForBuy', userId)}*\n\n${await t('bundleWallets.needCreateFirst', userId)}`,
            { parse_mode: 'Markdown' }
        );
    }

    await executeBundleSellAllBalance(UserModel, userId, chatId, messageId, tokenAddress, bundleWallets);
};

const executeBundleBuyAllBalance = async (
    UserModel: Model<any>,
    userId: number,
    chatId: number,
    messageId: number,
    tokenAddress: string,
    bundleWallets: any[]
) => {
    const user = await UserModel.findOne({ userId });
    if (!user) return;

    const userDoc = user as any;
    const activeWallet = userDoc.wallets?.find((w: any) => w.is_active_wallet);
    if (!activeWallet) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfiguredBuy', userId)}`);
    }

    const slippage = userDoc.settings?.slippage?.buy_slippage || 50;
    const fee = userDoc.settings?.fee_setting?.buy_fee || 0;
    const connection = new Connection(userDoc.rpcProvider?.url || RPC_URL);

    const walletBalances: Array<{ wallet: any; balance: number; availableBalance: number }> = [];
    
    for (const bundleWallet of bundleWallets) {
        try {
            const balance = await connection.getBalance(new PublicKey(bundleWallet.publicKey));
            const balanceSOL = balance / LAMPORTS_PER_SOL;
            
            const rentExempt = 890880; // Rent exempt minimum
            const transferFee = 5000; // Transaction fee
            const availableLamports = Math.max(0, balance - rentExempt - transferFee);
            const availableBalanceSOL = availableLamports / LAMPORTS_PER_SOL;
            
            if (availableBalanceSOL >= 0.001) {
                walletBalances.push({ 
                    wallet: bundleWallet, 
                    balance: balanceSOL,
                    availableBalance: availableBalanceSOL
                });
            }
        } catch (err) {
            console.error(`Error getting balance for ${bundleWallet.publicKey}:`, err);
        }
    }

    if (walletBalances.length === 0) {
        const needCreateFirst = await t('bundleWallets.needCreateFirst', userId);
        return bot.sendMessage(
            chatId,
            `❌ *${await t('bundleWallets.insufficientBalanceForBuy', userId)}*\n\n` +
            `None of your bundle wallets have enough SOL to execute this buy.\n` +
            `${await t('bundleWallets.needAtLeast', userId)}`,
            { parse_mode: 'Markdown' }
        );
    }

    const statusMsg = await bot.sendMessage(
        chatId,
        `👜 *${await t('bundleWallets.bundleBuyStarted', userId)}*\n\n` +
        `${await t('bundleWallets.token', userId)}: \`${tokenAddress}\`\n` +
        `${await t('bundleWallets.usingAllBalance', userId)}\n` +
        `${await t('bundleWallets.walletsWithBalance', userId)}: *${walletBalances.length}/${bundleWallets.length}*\n\n` +
        `${await t('bundleWallets.processing', userId)}: 0/${walletBalances.length}`,
        { parse_mode: 'Markdown' }
    );

    let successCount = 0;
    let failCount = 0;
    const results: Array<{ wallet: string; success: boolean; signature?: string; error?: string }> = [];

    for (let i = 0; i < walletBalances.length; i++) {
        const { wallet: bundleWallet, availableBalance } = walletBalances[i];
        
        try {
            const result = await swapToken(
                userId,
                bundleWallet.publicKey,
                tokenAddress,
                availableBalance,
                'buy',
                slippage,
                fee * 10 ** 11,
                0
            );

            if (result.success && result.signature) {
                successCount++;
                results.push({
                    wallet: bundleWallet.publicKey,
                    success: true,
                    signature: result.signature
                });
            } else {
                failCount++;
                results.push({
                    wallet: bundleWallet.publicKey,
                    success: false,
                    error: result.error || 'Unknown error'
                });
            }
        } catch (err: any) {
            failCount++;
            results.push({
                wallet: bundleWallet.publicKey,
                success: false,
                error: err.message || 'Transaction failed'
            });
        }

        await bot.editMessageText(
            `👜 *${await t('bundleWallets.bundleBuy', userId)}*\n\n` +
            `${await t('bundleWallets.processing', userId)}: ${i + 1}/${walletBalances.length}\n` +
            `✅ ${await t('bundleWallets.success', userId)}: ${successCount}\n` +
            `❌ ${await t('bundleWallets.failed', userId)}: ${failCount}`,
            {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            }
        );
    }

    let totalBought = 0;
    results.filter(r => r.success).forEach((r, idx) => {
        const walletData = walletBalances.find(wb => wb.wallet.publicKey === r.wallet);
        if (walletData) {
            totalBought += walletData.availableBalance;
        }
    });

    let summary = `👜 *${await t('bundleWallets.bundleBuyComplete', userId)}*\n\n` +
        `✅ ${await t('bundleWallets.successful', userId)}: *${successCount}* ${await t('bundleWallets.wallets', userId)}\n` +
        `❌ ${await t('bundleWallets.failed', userId)}: *${failCount}* ${await t('bundleWallets.wallets', userId)}\n` +
        `${await t('bundleWallets.totalBought', userId)}: *${totalBought.toFixed(4)} ${await t('bundleWallets.sol', userId)}*\n\n`;

    if (successCount > 0) {
        summary += `*${await t('bundleWallets.successfulTransactions', userId)}:*\n`;
        results.filter(r => r.success).slice(0, 5).forEach((r, idx) => {
            summary += `${idx + 1}. [View TX](https://solscan.io/tx/${r.signature})\n`;
        });
        if (successCount > 5) {
            summary += `... and ${successCount - 5} more\n`;
        }
    }

    if (failCount > 0) {
        summary += `\n*${await t('bundleWallets.failedWallets', userId)}:*\n`;
        results.filter(r => !r.success).slice(0, 3).forEach((r, idx) => {
            summary += `${idx + 1}. \`${r.wallet.slice(0, 8)}...\`: ${r.error}\n`;
        });
    }

    await bot.editMessageText(summary, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    });
};

const executeBundleSellAllBalance = async (
    UserModel: Model<any>,
    userId: number,
    chatId: number,
    messageId: number,
    tokenAddress: string,
    bundleWallets: any[]
) => {
    const user = await UserModel.findOne({ userId });
    if (!user) return;

    const userDoc = user as any;
    const activeWallet = userDoc.wallets?.find((w: any) => w.is_active_wallet);
    if (!activeWallet) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfiguredBuy', userId)}`);
    }

    const slippage = userDoc.settings?.slippage?.sell_slippage || 50;
    const fee = userDoc.settings?.fee_setting?.sell_fee || 0;
    const connection = new Connection(userDoc.rpcProvider?.url || RPC_URL);

    const statusMsg = await bot.sendMessage(
        chatId,
        `👜 *${await t('bundleWallets.bundleSellStarted', userId)}*\n\n` +
        `${await t('bundleWallets.token', userId)}: \`${tokenAddress}\`\n` +
        `${await t('bundleWallets.selling', userId)}: *100%* ${await t('bundleWallets.percentOfBalance', userId)}\n` +
        `${await t('bundleWallets.wallets', userId)}: *${bundleWallets.length}*\n\n` +
        `${await t('bundleWallets.checkingBalances', userId)}`,
        { parse_mode: 'Markdown' }
    );

    const walletBalances: Array<{ wallet: any; balance: number }> = [];
    
    for (const bundleWallet of bundleWallets) {
        try {
            const balance = await getTokenBalance(
                new PublicKey(bundleWallet.publicKey),
                new PublicKey(tokenAddress)
            );
            if (balance > 0) {
                walletBalances.push({ wallet: bundleWallet, balance });
            }
        } catch (err) {
            console.error(`Error getting balance for ${bundleWallet.publicKey}:`, err);
        }
    }

    if (walletBalances.length === 0) {
        return bot.editMessageText(
            `❌ *${await t('bundleWallets.noTokenBalance', userId)}*\n\n${await t('bundleWallets.noneHaveToken', userId)}`,
            {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            }
        );
    }

    await bot.editMessageText(
        `👜 *${await t('bundleWallets.bundleSell', userId)}*\n\n` +
        `${await t('bundleWallets.foundTokensIn', userId)} *${walletBalances.length}* ${await t('bundleWallets.wallets', userId)}\n` +
        `${await t('bundleWallets.processing', userId)}: 0/${walletBalances.length}`,
        {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown'
        }
    );

    let successCount = 0;
    let failCount = 0;
    const results: Array<{ wallet: string; success: boolean; signature?: string; error?: string }> = [];

    for (let i = 0; i < walletBalances.length; i++) {
        const { wallet, balance } = walletBalances[i];
        const tokenAmount = balance;
        
        try {
            const result = await swapToken(
                userId,
                wallet.publicKey,
                tokenAddress,
                100,
                'sell',
                slippage,
                fee * 10 ** 11,
                tokenAmount
            );

            if (result.success && result.signature) {
                successCount++;
                results.push({
                    wallet: wallet.publicKey,
                    success: true,
                    signature: result.signature
                });
            } else {
                failCount++;
                results.push({
                    wallet: wallet.publicKey,
                    success: false,
                    error: result.error || 'Unknown error'
                });
            }
        } catch (err: any) {
            failCount++;
            results.push({
                wallet: wallet.publicKey,
                success: false,
                error: err.message || 'Transaction failed'
            });
        }

        await bot.editMessageText(
            `👜 *${await t('bundleWallets.bundleSell', userId)}*\n\n` +
            `${await t('bundleWallets.processing', userId)}: ${i + 1}/${walletBalances.length}\n` +
            `✅ ${await t('bundleWallets.success', userId)}: ${successCount}\n` +
            `❌ ${await t('bundleWallets.failed', userId)}: ${failCount}`,
            {
                chat_id: chatId,
                message_id: statusMsg.message_id,
                parse_mode: 'Markdown'
            }
        );
    }

    let summary = `👜 *${await t('bundleWallets.bundleSellComplete', userId)}*\n\n` +
        `${await t('bundleWallets.sold', userId)}: *100%* ${await t('bundleWallets.percentOfBalance', userId)}\n` +
        `✅ ${await t('bundleWallets.successful', userId)}: *${successCount}* ${await t('bundleWallets.wallets', userId)}\n` +
        `❌ ${await t('bundleWallets.failed', userId)}: *${failCount}* ${await t('bundleWallets.wallets', userId)}\n\n`;

    if (successCount > 0) {
        summary += `*${await t('bundleWallets.successfulTransactions', userId)}:*\n`;
        results.filter(r => r.success).slice(0, 5).forEach((r, idx) => {
            summary += `${idx + 1}. [View TX](https://solscan.io/tx/${r.signature})\n`;
        });
        if (successCount > 5) {
            summary += `... and ${successCount - 5} more\n`;
        }
    }

    if (failCount > 0) {
        summary += `\n*${await t('bundleWallets.failedWallets', userId)}:*\n`;
        results.filter(r => !r.success).slice(0, 3).forEach((r, idx) => {
            summary += `${idx + 1}. \`${r.wallet.slice(0, 8)}...\`: ${r.error}\n`;
        });
    }

    await bot.editMessageText(summary, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
    });
};

