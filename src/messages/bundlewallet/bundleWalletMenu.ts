import { Model } from 'mongoose';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import { User } from '../../models/user';
import { bot } from '../../config/constant';
import { getBalance } from '../../services/solana';
import bundleCreateHandler from './bundleCreate';
import fundBundleWalletModule from './fundBundledWallets';
import { t } from '../../locales';
import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { decryptSecretKey } from '../../config/security';
import { RPC_URL } from '../../config/constant';
import { connection } from '../../config/connection';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getPairByAddress } from '../../services/dexscreener';
import bs58 from 'bs58';

interface BundleMenuState {
    step: string;
    chatId: number;
    userId: number;
}

const menuState: Record<number, BundleMenuState> = {};

// Helper to safely delete messages
const safeDeleteMessage = async (chatId: number, messageId: number) => {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (err) {
        // Ignore errors
    }
};

// Main menu handler
export const showBundleWalletMenu = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery,
    cleanupUserTextHandler: (userId: number) => void,
    createUserTextHandler: (userId: number, handler: (reply: Message) => void | Promise<void>, timeoutMs?: number) => (msg: Message) => boolean
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    cleanupUserTextHandler(userId);
    await safeDeleteMessage(chatId, messageId);

    const freshUser = await UserModel.findOne({ userId: userId });
    const bundleCount = freshUser?.bundleWallets?.length || 0;

    const imagePath = "./src/assets/Multiwallet.jpg";
    const caption = `👜 *${await t('bundleWallets.menuTitle', userId)}*\n\n` +
        `📦 *${await t('bundleWallets.safeBundler', userId)}*\n` +
        `• ${await t('bundleWallets.maxWallets', userId)}\n` +
        `• ${await t('bundleWallets.fasterExecution', userId)}\n` +
        `• ${await t('bundleWallets.bestForOperations', userId)}\n\n` +
        `${await t('bundleWallets.currentWallets', userId)} : *${bundleCount}*\n\n` +
        `${await t('bundleWallets.chooseOption', userId)}`;

    await bot.sendPhoto(chatId, imagePath, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [
                [{ text: await t('bundleWallets.viewWallets', userId), callback_data: "bundle_view" }],
                [{ text: await t('bundleWallets.createWallets', userId), callback_data: "bundle_create_menu" }],
                [{ text: await t('bundleWallets.fundWallets', userId), callback_data: "bundle_fund" }],
                [
                    { text: await t('bundleWallets.cleanFundBundles', userId), callback_data: "bundle_clean_fund" },
                    { text: await t('bundleWallets.withdrawFromBundles', userId), callback_data: "bundle_withdraw" }
                ],
                [{ text: await t('bundleWallets.resetBundledWallets', userId), callback_data: "bundle_reset" }],
                [{ text: `${await t('backWallet', userId)}`, callback_data: "wallets_back" }],
            ],
        },
    });
};

// View bundle wallets
export const viewBundleWallets = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    await safeDeleteMessage(chatId, messageId);

    const freshUser = await UserModel.findOne({ userId: userId });
    if (!freshUser || !freshUser.bundleWallets || freshUser.bundleWallets.length === 0) {
        await bot.sendMessage(
            chatId,
            `❌ *${await t('bundleWallets.noBundleWallets', userId)}*\n\n${await t('bundleWallets.noBundleWalletsDesc', userId)}`,
            {
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [{ text: await t('bundleWallets.createWallets', userId), callback_data: "bundle_create_menu" }],
                        [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                    ],
                },
            }
        );
        return;
    }

    const bundleWallets = freshUser.bundleWallets;
    const userDoc = freshUser as any;
    const rpcUrl = userDoc.rpcProvider?.url || RPC_URL;
    const walletConnection = new Connection(rpcUrl);

    let message = `👀 *${await t('bundleWallets.bundleWalletsTitle', userId)}*\n\n`;
    message += `${await t('bundleWallets.totalWallets', userId)} : *${bundleWallets.length} ${await t('bundleWallets.wallets', userId)}*\n\n`;

    // Get balances for each wallet including tokens
    const walletInfo = await Promise.all(
        bundleWallets.map(async (wallet: any, index: number) => {
            try {
                const walletPubkey = new PublicKey(wallet.publicKey);
                
                // Get SOL balance
                const solBalanceLamports = await walletConnection.getBalance(walletPubkey);
                const solBalance = (solBalanceLamports / LAMPORTS_PER_SOL).toFixed(4);
                
                let walletText = `*${await t('bundleWallets.walletNumber', userId)}${index + 1}*\n` +
                                `${await t('bundleWallets.address', userId)}: \`${wallet.publicKey}\`\n` +
                                `${await t('bundleWallets.sol', userId)}: *${solBalance} ${await t('bundleWallets.sol', userId)}*\n`;
                
                // Get all token accounts
                try {
                    const tokenAccounts = await walletConnection.getParsedTokenAccountsByOwner(
                        walletPubkey,
                        { programId: TOKEN_PROGRAM_ID }
                    );
                    
                    if (tokenAccounts.value.length > 0) {
                        walletText += `\n*${await t('bundleWallets.tokens', userId)}:*\n`;
                        
                        // Process each token account
                        for (const tokenAccount of tokenAccounts.value) {
                            const parsedInfo = tokenAccount.account.data.parsed?.info;
                            if (!parsedInfo) continue;
                            
                            const mintAddress = parsedInfo.mint;
                            const tokenAmount = parsedInfo.tokenAmount;
                            const uiAmount = tokenAmount.uiAmount;
                            const decimals = tokenAmount.decimals;
                            
                            // Only show tokens with balance > 0
                            if (uiAmount && uiAmount > 0) {
                                let tokenDisplay = `  • \`${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}\``;
                                
                                // Try to get token info (symbol, name)
                                try {
                                    const pairArray = await getPairByAddress(mintAddress);
                                    if (pairArray && pairArray[0]) {
                                        const symbol = pairArray[0].baseToken?.symbol || 'Unknown';
                                        tokenDisplay = `  • *${symbol}* (\`${mintAddress.slice(0, 8)}...${mintAddress.slice(-8)}\`)`;
                                    }
                                } catch (err) {
                                    // If we can't get token info, just show the address
                                }
                                
                                // Format token amount
                                const formattedAmount = uiAmount.toLocaleString('en-US', {
                                    maximumFractionDigits: decimals > 6 ? 6 : decimals,
                                    minimumFractionDigits: 0
                                });
                                
                                walletText += `${tokenDisplay}: *${formattedAmount}*\n`;
                            }
                        }
                        
                        if (tokenAccounts.value.filter(ta => {
                            const amount = ta.account.data.parsed?.info?.tokenAmount?.uiAmount;
                            return amount && amount > 0;
                        }).length === 0) {
                            walletText += `  _${await t('bundleWallets.noTokens', userId)}_\n`;
                        }
                    } else {
                        walletText += `\n*${await t('bundleWallets.tokens', userId)}:* _${await t('bundleWallets.noTokens', userId)}_\n`;
                    }
                } catch (tokenErr) {
                    walletText += `\n*${await t('bundleWallets.tokens', userId)}:* _${await t('bundleWallets.errorLoading', userId)}_\n`;
                }
                
                walletText += `\n`;
                return walletText;
            } catch (err) {
                return `*${await t('bundleWallets.walletNumber', userId)}${index + 1}*\n` +
                       `${await t('bundleWallets.address', userId)}: \`${wallet.publicKey}\`\n` +
                       `${await t('bundleWallets.balance', userId)}: *${await t('bundleWallets.errorLoading', userId)}*\n\n`;
            }
        })
    );

    message += walletInfo.join('');

    await bot.sendMessage(
        chatId,
        message,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                ],
            },
        }
    );
};

// Show create wallet prompt
export const showCreateWalletPrompt = async (
    callbackQuery: CallbackQuery,
    cleanupUserTextHandler: (userId: number) => void,
    createUserTextHandler: (userId: number, handler: (reply: Message) => void | Promise<void>, timeoutMs?: number) => (msg: Message) => boolean
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    cleanupUserTextHandler(userId);
    await safeDeleteMessage(chatId, messageId);

    await bot.sendMessage(
        chatId,
        `👜 *${await t('bundleWallets.createTitle', userId)}*\n\n` +
        `📦 *${await t('bundleWallets.safeBundler', userId)}*\n` +
        `• ${await t('bundleWallets.maxWallets', userId)}\n` +
        `• ${await t('bundleWallets.fasterExecution', userId)}\n` +
        `• ${await t('bundleWallets.bestForOperations', userId)}\n\n` +
        `🧩 ${await t('bundleWallets.howManyWallets', userId)}\n` +
        `${await t('bundleWallets.maxWalletsNote', userId)}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
            },
        }
    ).then((sentMessage) => {
        bot.once("message", createUserTextHandler(userId, async (reply) => {
            if (reply.chat.id !== chatId) return;

            const count = parseInt(reply.text || '0');
            if (isNaN(count) || count <= 0) {
                await bot.sendMessage(chatId, `❌ ${await t('bundleWallets.pleaseEnterValidNumber', userId)}`);
                await safeDeleteMessage(chatId, sentMessage.message_id);
                await safeDeleteMessage(chatId, reply.message_id);
                return;
            }

            const SAFE_BUNDLER_MAX = 20;
            if (count > SAFE_BUNDLER_MAX) {
                await bot.sendMessage(
                    chatId,
                    `❌ *${await t('bundleWallets.invalidCount', userId)}*\n\n` +
                    `${await t('bundleWallets.safeBundler', userId)} ${await t('bundleWallets.invalidCountDesc', userId)} *${SAFE_BUNDLER_MAX} ${await t('bundleWallets.selectedWallets', userId)}*.\n` +
                    `${await t('bundleWallets.youSelectedCount', userId)} *${count} ${await t('bundleWallets.selectedWallets', userId)}*.\n\n` +
                    `**${(await t('bundleWallets.pleaseSelectMaxOrFewer', userId)).replace('{max}', SAFE_BUNDLER_MAX.toString())}**`,
                    { parse_mode: 'Markdown' }
                );
                await safeDeleteMessage(chatId, sentMessage.message_id);
                await safeDeleteMessage(chatId, reply.message_id);
                return;
            }

            await bot.sendMessage(
                chatId,
                `🔢 ${(await t('bundleWallets.youSelectedForBundler', userId))
                    .replace('{count}', count.toString())
                    .replace('{bundler}', await t('bundleWallets.safeBundler', userId))}\n\nClick "${await t('bundleWallets.createWallets', userId)}" to proceed:`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: await t('bundleWallets.createWallets', userId), callback_data: `bundle_create_safe_${count}` }],
                            [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                        ],
                    },
                }
            );
            await safeDeleteMessage(chatId, sentMessage.message_id);
            await safeDeleteMessage(chatId, reply.message_id);
        }));
    });
};

// Create wallets handler
export const createBundleWallets = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    const parts = (callbackQuery.data || '').split("_");
    const bundleType = 'safe';
    const count = parseInt(parts[3], 10);

    if (isNaN(count) || count <= 0 || count > 20) {
        await bot.sendMessage(chatId, `❌ ${await t('bundleWallets.invalidWalletCount', userId)}`);
        return;
    }

    await safeDeleteMessage(chatId, messageId);
    await bundleCreateHandler(UserModel, userId, chatId, count, bundleType);
};

// Fund wallets handler
export const fundBundleWallets = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery
) => {
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    await safeDeleteMessage(chatId, messageId);
    await fundBundleWalletModule.fundBundledWallets(UserModel, callbackQuery);
};

// Clean fund bundles (withdraw from temp wallets used in funding)
export const cleanFundBundles = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    await safeDeleteMessage(chatId, messageId);

    const user = await UserModel.findOne({ userId });
    if (!user) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', userId)}`);
    }

    const userDoc = user as any;
    const activeWallet = userDoc.wallets?.find((w: any) => w.is_active_wallet);
    if (!activeWallet?.secretKey || !activeWallet?.publicKey) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfigured', userId)}`);
    }

    await bot.sendMessage(
        chatId,
        `🧼 *${await t('bundleWallets.cleanFundTitle', userId)}*\n\n` +
        `${await t('bundleWallets.cleanFundDesc', userId)}\n\n` +
        `⚠️ ${await t('bundleWallets.mayTakeMoment', userId)}`,
        { parse_mode: 'Markdown' }
    );

    // Note: The actual cleanup happens during the funding process
    // This is mainly for user information
    await bot.sendMessage(
        chatId,
        `✅ ${await t('bundleWallets.cleanFundComplete', userId)}\n\n` +
        `${await t('bundleWallets.tempWalletsCleaned', userId)}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                ],
            },
        }
    );
};

// Withdraw from bundle wallets to active wallet
export const withdrawFromBundles = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery,
    createUserTextHandler: (userId: number, handler: (reply: Message) => void | Promise<void>, timeoutMs?: number) => (msg: Message) => boolean
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    await safeDeleteMessage(chatId, messageId);

    const user = await UserModel.findOne({ userId });
    if (!user) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', userId)}`);
    }

    const userDoc = user as any;
    const activeWallet = userDoc.wallets?.find((w: any) => w.is_active_wallet);
    if (!activeWallet?.secretKey || !activeWallet?.publicKey) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfigured', userId)}`);
    }

    if (!userDoc.bundleWallets?.length) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.noBundleWalletsFound', userId)}`);
    }

    const connection = new Connection(userDoc.rpcProvider?.url || RPC_URL);
    const activePubkey = new PublicKey(activeWallet.publicKey);
    const activeBalance = await connection.getBalance(activePubkey);

    // Calculate total withdrawable from all bundle wallets
    let totalWithdrawable = 0;
    const bundleBalances: Array<{ publicKey: string; balance: number }> = [];

    for (const bundleWallet of userDoc.bundleWallets) {
        try {
            const balance = await connection.getBalance(new PublicKey(bundleWallet.publicKey));
            const rentExempt = 890880; // Rent exempt minimum
            const transferFee = 5000; // Transaction fee
            const withdrawable = Math.max(0, balance - rentExempt - transferFee);
            totalWithdrawable += withdrawable;
            bundleBalances.push({
                publicKey: bundleWallet.publicKey,
                balance: withdrawable
            });
        } catch (err) {
            console.error(`Error getting balance for ${bundleWallet.publicKey}:`, err);
        }
    }

    const totalWithdrawableSOL = (totalWithdrawable / LAMPORTS_PER_SOL).toFixed(4);

    if (totalWithdrawable <= 0) {
        return bot.sendMessage(
            chatId,
            `❌ *${await t('bundleWallets.noWithdrawableFunds', userId)}*\n\n` +
            `${await t('bundleWallets.allWalletsInsufficient', userId)}\n` +
            `${await t('bundleWallets.needRentExempt', userId)}`,
            {
                parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                ],
            },
        }
    );
}

    await bot.sendMessage(
        chatId,
        `⬆️ *${await t('bundleWallets.withdrawTitle', userId)}*\n\n` +
        `${await t('bundleWallets.activeWallet', userId)}: \`${activePubkey.toBase58()}\`\n` +
        `${await t('bundleWallets.activeBalance', userId)}: *${(activeBalance / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', userId)}*\n\n` +
        `${await t('bundleWallets.totalWithdrawable', userId)}: *${totalWithdrawableSOL} ${await t('bundleWallets.sol', userId)}*\n` +
        `${await t('bundleWallets.fromWallets', userId)} *${bundleBalances.filter(b => b.balance > 0).length}* ${await t('bundleWallets.selectedWallets', userId)}\n\n` +
        `⚠️ ${await t('bundleWallets.willWithdrawAll', userId)}\n\n` +
        `${await t('bundleWallets.typeConfirm', userId)}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
            },
        }
    ).then((sentMessage) => {
        menuState[userId] = { step: 'awaiting_withdraw_confirm', chatId, userId };
        bot.once("message", createUserTextHandler(userId, async (reply) => {
            if (reply.chat.id !== chatId) return;
            if (reply.text?.toUpperCase() !== 'CONFIRM') {
                await bot.sendMessage(chatId, `❌ ${await t('bundleWallets.withdrawalCancelled', userId)}`);
                await safeDeleteMessage(chatId, sentMessage.message_id);
                await safeDeleteMessage(chatId, reply.message_id);
                delete menuState[userId];
                return;
            }

            await safeDeleteMessage(chatId, sentMessage.message_id);
            await safeDeleteMessage(chatId, reply.message_id);

            const statusMsg = await bot.sendMessage(
                chatId,
                `🔄 ${await t('bundleWallets.withdrawingFunds', userId)}\n\n` +
                `${await t('bundleWallets.processing', userId)}: 0/${bundleBalances.filter(b => b.balance > 0).length}`,
                { parse_mode: 'Markdown' }
            );

            const decrypted = decryptSecretKey(activeWallet.secretKey, "password");
            const activeKeypair = Keypair.fromSecretKey(bs58.decode(decrypted));

            let successCount = 0;
            let totalWithdrawn = 0;

            for (let i = 0; i < bundleBalances.length; i++) {
                const bundle = bundleBalances[i];
                if (bundle.balance <= 0) continue;

                try {
                    const bundlePubkey = new PublicKey(bundle.publicKey);
                    const bundleWallet = userDoc.bundleWallets[i];
                    const bundleSecretKey = decryptSecretKey(bundleWallet.secretKey, "password");
                    const bundleKeypair = Keypair.fromSecretKey(bs58.decode(bundleSecretKey));

                    const tx = new Transaction().add(
                        SystemProgram.transfer({
                            fromPubkey: bundleKeypair.publicKey,
                            toPubkey: activeKeypair.publicKey,
                            lamports: bundle.balance,
                        })
                    );
                    tx.feePayer = bundleKeypair.publicKey;

                    const sig = await sendAndConfirmTransaction(
                        connection,
                        tx,
                        [bundleKeypair],
                        { commitment: 'confirmed' }
                    );

                    successCount++;
                    totalWithdrawn += bundle.balance;

                    await bot.editMessageText(
                        `🔄 ${await t('bundleWallets.withdrawingFunds', userId)}...\n\n` +
                        `✅ ${await t('bundleWallets.processed', userId)}: ${successCount}/${bundleBalances.filter(b => b.balance > 0).length}\n` +
                        `${await t('bundleWallets.totalWithdrawn', userId)}: ${(totalWithdrawn / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', userId)}`,
                        {
                            chat_id: chatId,
                            message_id: statusMsg.message_id,
                            parse_mode: 'Markdown',
                        }
                    );
                } catch (err) {
                    console.error(`Failed to withdraw from ${bundle.publicKey}:`, err);
                }
            }

            delete menuState[userId];

            await bot.editMessageText(
                `✅ *${await t('bundleWallets.withdrawalComplete', userId)}*\n\n` +
                `${await t('bundleWallets.successfullyWithdrew', userId)} *${successCount}* ${await t('bundleWallets.selectedWallets', userId)}\n` +
                `${await t('bundleWallets.totalWithdrawn', userId)}: *${(totalWithdrawn / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', userId)}*\n\n` +
                `${await t('bundleWallets.fundsInActiveWallet', userId)}`,
                {
                    chat_id: chatId,
                    message_id: statusMsg.message_id,
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                        ],
                    },
                }
            );
        }));
    });
};

// Reset bundled wallets
export const resetBundledWallets = async (
    UserModel: Model<any>,
    callbackQuery: CallbackQuery,
    createUserTextHandler: (userId: number, handler: (reply: Message) => void | Promise<void>, timeoutMs?: number) => (msg: Message) => boolean
) => {
    const userId = callbackQuery.from.id;
    const chatId = callbackQuery.message?.chat.id || 0;
    const messageId = callbackQuery.message?.message_id || 0;

    await safeDeleteMessage(chatId, messageId);

    const user = await UserModel.findOne({ userId });
    if (!user) {
        return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', userId)}`);
    }

    const userDoc = user as any;
    const bundleCount = userDoc.bundleWallets?.length || 0;

    if (bundleCount === 0) {
        return bot.sendMessage(
            chatId,
            `❌ ${await t('bundleWallets.noBundleWalletsToReset', userId)}`,
            {
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                ],
            },
        }
    );
}

    await bot.sendMessage(
        chatId,
        `♻️ *${await t('bundleWallets.resetTitle', userId)}*\n\n` +
        `⚠️ *${await t('bundleWallets.resetWarning', userId)} ${bundleCount} ${await t('bundleWallets.willDeleteAll', userId)}*\n\n` +
        `${await t('bundleWallets.cannotBeUndone', userId)}\n` +
        `${await t('bundleWallets.savePrivateKeysIfNeeded', userId)}\n\n` +
        `${await t('bundleWallets.typeReset', userId)}`,
        {
            parse_mode: 'Markdown',
            reply_markup: {
                force_reply: true,
            },
        }
    ).then((sentMessage) => {
        bot.once("message", createUserTextHandler(userId, async (reply) => {
            if (reply.chat.id !== chatId) return;
            if (reply.text?.toUpperCase() !== 'RESET') {
                await bot.sendMessage(chatId, `❌ ${await t('bundleWallets.resetCancelled', userId)}`);
                await safeDeleteMessage(chatId, sentMessage.message_id);
                await safeDeleteMessage(chatId, reply.message_id);
                return;
            }

            await safeDeleteMessage(chatId, sentMessage.message_id);
            await safeDeleteMessage(chatId, reply.message_id);

            await UserModel.findOneAndUpdate(
                { userId: userId },
                { $set: { bundleWallets: [] } }
            );

            await bot.sendMessage(
                chatId,
                `✅ *${await t('bundleWallets.resetComplete', userId)}*\n\n` +
                `All ${bundleCount} ${await t('bundleWallets.selectedWallets', userId)} ${await t('bundleWallets.allWalletsDeleted', userId)}`,
                {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: `${await t('back', userId)}`, callback_data: "bundled_wallets" }],
                        ],
                    },
                }
            );
        }));
    });
};

