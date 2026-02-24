import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import { CommandHandler } from "./commands";
import {
    ComputeBudgetProgram,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    sendAndConfirmTransaction,
    SystemProgram,
    Transaction,
    TransactionMessage,
    VersionedTransaction,
} from "@solana/web3.js";
import { connection } from "./config/connection";
import { bot } from "./config/constant";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array } from "./config/security";
import {
    getBalance,
    getSolanaPrice,
    getSolPrice,
    getTokenBalance,
    getTokenPriceInSOL,
    isValidPrivateKey,
    isValidSolanaAddress,
    setSolPrice,
    walletCreate,
    walletFromPrvKey,
} from "./services/solana";
import { editWalletsMessage, sendWalletsMessageWithImage, sendWalletsMessage } from "./messages/solana/wallets";
import { editWalletsMessage as editEthereumWalletsMessage } from "./messages/ethereum/wallets";
import { isEvmAddress } from "./utils/ethereum";
import { getBalance as getEthereumBalance } from "./services/ethereum/etherscan";
import { transferETH } from "./services/ethereum/transfer";
import { editMenuMessage, sendAdminPanelMessage, sendWelcomeMessage, sendAddUserMessage, sendAddSniperUserMessage, sendMenuMessage, sendMenuMessageWithImage, editAdminPanelMessage, sendMenu, sendSnippingSettingsMessage, editSnippingSettingsMessage } from "./messages";
import {
    extractTokenAddress,
    extractTokenAddress_,
    hasSpecialCharacters,
    isMEVProtect,
} from "./services/other";
import { walletBackButton, walletsBackMarkup, getCloseButton } from "./utils/markup";
import { getUserChain } from "./utils/chain";
import { User } from "./models/user";
import { PendingUser } from "./models/pendingUser";
import { limitOrderData } from "./models/limitOrder";
import bs58 from "bs58";
import {
    editWithdrawWalletsMessage,
    sendWithdrawWalletsMessage,
} from "./messages/solana/wallets/withdraw";
import { editSwitchWalletsMessage, sendSwitchWalletsMessage } from "./messages/solana/wallets/switch";
import { editHelpMessage, sendHelpMessageWithImage } from "./messages/help";
import { getPairByAddress, getTokenInfo, getTokenPrice, setTokenPrice } from "./services/dexscreener";
import {
    editBuyMessageWithAddress,
    getBuy,
    sendBuyMessage,
    sendBuyMessageWithAddress,
} from "./messages/solana/buy";
// import {
//     editSniperSell,
//     getSniperSell,
//     sendSniperBuyWithAddress,
//     sendSniperSellMessage,
// } from "./messages/sniper/sniper_token";
import {
    sendSellMessageWithAddress,
    sendSellMessage,
    editSellMessageWithAddress,
    getSell
} from "./messages/solana/sell";
import {
    sendAutoSellMessage,
    editAutoSellMessage,
    editMessageReplyMarkup
} from './messages/solana/settings/auto_sell';
import { swapToken } from "./services/jupiter";
import { runSniper } from "./services/sniper";
import { editPositionsMessage, sendPositionsMessageWithImage, getPositions } from './messages/solana/positions';
import { editSettingsMessage, sendSettingsMessage, sendSettingsMessageWithImage } from "./messages/solana/settings";
import { TokenAmount } from "@raydium-io/raydium-sdk-v2";
import { editprofitLevelMessage, editProfitlevelMessageReplyMarkup } from './messages/solana/settings/profitLevel';
import { editFeeAutoMessage, editFeeAutoMessageEth, editFeeMessage, sendFeeAutoMessage, sendFeeMessage } from './messages/solana/settings/fee';
import { WhiteListUser } from "./models/whitelist";
import { SniperWhitelist } from "./models/sniperWhitelist";
import { SubscribeModel } from "./models/subscribe";
import { editRenameWalletMessage, sendRenameWalletMessage } from "./messages/solana/wallets/rename";
import { editRenameWalletMessage as editRenameEthereumWalletMessage, sendRenameWalletMessage as sendRenameEthereumWalletMessage } from "./messages/ethereum/wallets/rename";
import { editSlippageMessage, sendSlippageMessage } from './messages/solana/settings/slippage';
import { editQuickBuyMessage, sendQuickBuyMessage } from './messages/solana/settings/quick_buy';
import { editQuickSellMessage, sendQuickSellMessage } from './messages/solana/settings/quick_sell';
// import { editPresetsMessage } from './messages/solana/settings/presets';
import { getCreateWallet } from './messages/solana/wallets/create';
import { getCreateWallet as getCreateEthereumWallet } from './messages/ethereum/wallets/create';
// import { editDefaultWalletMessage } from './messages/solana/wallets/default';
import { getImportWallet } from './messages/solana/wallets/import';
import { getImportWallet as getImportEthereumWallet } from './messages/ethereum/wallets/import';
import { isExistWallet, isExistWalletWithName, txnMethod } from './utils/config';
import { editDeleteWalletMessage, sendDeleteWalletMessage } from './messages/solana/wallets/delete';
import { editDeleteWalletMessage as editDeleteEthereumWalletMessage, sendDeleteWalletMessage as sendDeleteEthereumWalletMessage } from './messages/ethereum/wallets/delete';
import { getWithdrawWallet } from './messages/solana/wallets/withdraw';
import { editPrivateKeyWalletMessage, sendPrivateKeyWalletMessage, sendPrivateKeyWalletMessageWithImage } from './messages/solana/wallets/private_key';
import { editPrivateKeyWalletMessage as editPrivateKeyEthereumWalletMessage, sendPrivateKeyWalletMessage as sendPrivateKeyEthereumWalletMessage, sendPrivateKeyWalletMessageWithImage as sendPrivateKeyEthereumWalletMessageWithImage } from './messages/ethereum/wallets/private_key';
import { editSwitchWalletsMessage as editSwitchEthereumWalletsMessage, sendSwitchWalletsMessage as sendSwitchEthereumWalletsMessage } from './messages/ethereum/wallets/switch';
import { editWithdrawWalletsMessage as editWithdrawEthereumWalletsMessage, sendWithdrawWalletsMessage as sendWithdrawEthereumWalletsMessage } from './messages/ethereum/wallets/withdraw';
import { editDefaultWalletMessage as editDefaultEthereumWalletMessage, sendDefaultWalletMessage as sendDefaultEthereumWalletMessage } from './messages/ethereum/wallets/default';
import { editDefaultWalletMessage, sendDefaultWalletMessage } from './messages/solana/wallets/default';
import { sendWalletsMessageWithImage as sendEthereumWalletsMessageWithImage } from './messages/ethereum/wallets';
import * as bundleWalletMenu from './messages/solana/bundlewallet/bundleWalletMenu';
import fundBundleWalletModule from './messages/solana/bundlewallet/fundBundledWallets';
import * as bundleBuySell from './messages/solana/bundlewallet/bundleBuySell';
import { send } from "process";
import { editLanguageMessage, sendLanguageMessage } from "./messages/solana/settings/language";
import { resourceLimits } from "worker_threads";
import { isNamedTupleMember } from "typescript";
import { settings } from "./commands/settings";
import { sendProfitLevelMessage } from "./messages/solana/settings/profitLevel";
import { updateTransferHookInstructionData } from "@solana/spl-token";
import { setUserLanguage, t } from "./locales";
import { error } from "console";
import { TippingSettings } from "./models/tipSettings";
import { editReferralMessage, sendReferralMessage, sendReferralsListMessage, editReferralsListMessage } from "./messages/referral";
import { editTrendingPageMessage, sendTrendingPageMessage } from "./messages/solana/trendingCoins";
import { editSniperMessage, sendSniperMessageeWithImage } from "./messages/solana/sniper/sniper";
import { sendTokenListMessage, editTokenListMessage } from "./messages/solana/sniper/tokenDetection";
import { handleSubscriptionAction, sendSubscriptionOptions } from "./subscribe";
import { sendEthereumBuyMessageWithAddress } from "./messages/ethereum/buy";
import { swapExactTokenForETHUsingUniswapV2_ } from "./services/ethereum/swap";
import { getPairInfoWithTokenAddress } from "./services/ethereum/dexscreener";
import { getEtherPrice } from "./services/ethereum/etherscan";
import { getTokenBalancWithContract } from "./services/ethereum/contract";
import { editEthereumPositionsMessage, sendEthereumPositionsMessageWithImage, getEthereumPositions } from "./messages/ethereum/positions";
import { Token } from "./models/token";
import { ethers } from "ethers";


const userRefreshCounts = new Map(); // key: userId, value: { count: number, lastReset: timestamp }

dotenv.config();

interface UserLocalDataDictionary {
    [key: number]: {
        withdraw: {
            address: string;
            amount: number;
        };
    };
}
export const userLocalData: UserLocalDataDictionary = {};

interface NumericDictionary {
    [key: number]: number;
}
export const userCurrentShow: NumericDictionary = {};

interface CurrentOpenedDictionary {
    [key: number]: number;
}

export const userCurrentOpened: CurrentOpenedDictionary = {};

const getSubscriptionRequiredMessage = async (userId: number) => {
    return `❌ ${await t('subscribe.subscriptionRequired', userId)}\n\n💳 ${await t('subscribe.pressSubscribe', userId)}`;
};

const getSubscriptionRequiredMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    return {
        inline_keyboard: [
            [{ text: await t('subscribe.subscribeButton', userId), callback_data: "subscribe" }],
            [{ text: await t('subscribe.backToMenu', userId), callback_data: "menu_back" }],
        ],
    };
};

const hasActiveSubscription = async (telegramId: number): Promise<boolean> => {
    const subscription = await SubscribeModel.findOne({ telegramId, active: true })
        .sort({ expiresAt: -1 })
        .lean();

    if (!subscription) {
        return false;
    }

    if (typeof subscription.expiresAt === "number" && subscription.expiresAt > 0) {
        return subscription.expiresAt > Date.now();
    }

    return true;
};

const isSniperWhitelisted = async (userId: number): Promise<boolean> => {
    const whitelisted = await SniperWhitelist.findOne({ userId });
    return !!whitelisted;
};

const ensureSubscriptionForSniper = async (
    botInstance: TelegramBot,
    chatId: number,
    telegramId: number,
): Promise<boolean> => {
    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings.sniperSubscriptionRequired) {
        return true;
    }
    const active = await hasActiveSubscription(telegramId);
    if (active) {
        return true;
    }
    await sendSubscriptionOptions(botInstance, chatId, telegramId);
    return false;
};

type WalletType = {
    label: string;
    publicKey: string;
    secretKey: string;
};

export const sendMessageToUser = async (userId: number, message: string, options: any = {}) => {
    try {
        await bot.sendMessage(userId, message, options);
    } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error);
    }
};

bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const chatId = msg.chat.id;
    const arg = match?.[1] || "";
    console.log("Start command arg:", chatId);

    if (arg.startsWith("ref_")) {
        console.log("start with referral Id");
        const referrerId = arg.replace("ref_", "");
        if (referrerId && referrerId !== fromId) {
            const pendingReferrer = referrerId;
            const referuser = await User.findOne({ userId: pendingReferrer });
            const user = await User.findOne({ userId: fromId });
            const userId = Number(fromId);
            bot.sendMessage(chatId, `${await t('messages.referral3', userId)} ${referuser?.username}`);
            let pendingUser = await PendingUser.findOne({ userId: fromId });
            if (!pendingUser) {
                pendingUser = new PendingUser();
                pendingUser.userId = fromId;
            }
            // Only set pending referral if user doesn't already have a referral set
            if (user && user.referredIdBy && user.referredIdBy !== "None") {
                console.log("User already has a referral set, not overwriting");
            } else {
                pendingUser.username = msg.from?.username || "";
                pendingUser.firstName = msg.from?.first_name || "";
                pendingUser.pendingReferrer = pendingReferrer;
                pendingUser.date = String(Date.now());
                await pendingUser.save();
                console.log("Saved pending referral:", {
                    userId: fromId,
                    pendingReferrer: pendingReferrer,
                    username: pendingUser.username
                });
            }
        }
    } else {
        let pendingUser = await PendingUser.findOne({ userId: fromId });
        if (!pendingUser) {
            pendingUser = new PendingUser({
                userId: fromId,
                username: msg.from?.username || "",
                firstName: msg.from?.first_name || "",
                date: String(Date.now()),
            });
            await pendingUser.save();
        }
    }

    CommandHandler.start(bot, msg, match);
});

bot.onText(/\/wallets/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.wallets(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.wallets(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});
bot.onText(/\/settings/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.settings(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.settings(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});

bot.onText(/\/menu/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.menus(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.menus(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});

bot.onText(/\/positions/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.positions(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.positions(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});

bot.onText(/\/help/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.help(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.help(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});

bot.onText(/\/chains/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.chain(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.chain(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});

bot.onText(/\/sniper/, async (msg, match) => {
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    let allowed: boolean;
    if (userId !== null && userId !== undefined) {
        const isWhitelisted = await isSniperWhitelisted(userId);
        if (isWhitelisted) {
            allowed = true;
        } else {
            allowed = await ensureSubscriptionForSniper(bot, msg.chat.id, userId);
        }
    } else {
        allowed = await ensureSubscriptionForSniper(bot, msg.chat.id, userId);
    }

    if (!allowed) {
        return;
    }

    const isWhitelisted = whiteListUsers.some((u) => {
        const whitelistUsername = u.telegramId.startsWith('@')
            ? u.telegramId.slice(1)
            : u.telegramId;

        const userName = msg.chat?.username || "";
        return whitelistUsername === userName;
    });
    if (!settings.WhiteListUser) {
        CommandHandler.sniperCommand(bot, msg, match);
    }
    else {
        if (isWhitelisted) {
            CommandHandler.sniperCommand(bot, msg, match);
        } else {
            await bot.sendMessage(msg.chat.id, `${await t('messages.accessDenied', userId)}`);
        }
    }
});


bot.on("polling_error", (error: any) => {
    console.error("Polling error:", error);

    if (error.code === "ETELEGRAM" && error.message?.includes("409 Conflict")) {
        console.error("⚠️ Multiple bot instances detected! Make sure only one instance is running.");
        console.error("💡 Solution: Stop all bot processes and restart only one instance.");
    }
});

const userLastMessage = new Map();
const userLastTokens = new Map();

const activeTextHandlers = new Map<number, NodeJS.Timeout>(); // user_id -> timeout

const createUserTextHandler = (targetUserId: number, handler: (reply: TelegramBot.Message) => void | Promise<void>, timeoutMs: number = 300000) => {
    cleanupUserTextHandler(targetUserId);

    const wrappedHandler = (msg: TelegramBot.Message) => {
        if (msg.from?.id === targetUserId) {
            cleanupUserTextHandler(targetUserId);
            handler(msg);
            return true;
        }
        return false;
    };

    const timeout = setTimeout(() => {
        cleanupUserTextHandler(targetUserId);
    }, timeoutMs);

    activeTextHandlers.set(targetUserId, timeout);

    return wrappedHandler;
};

const cleanupUserTextHandler = (userId: number) => {
    const timeout = activeTextHandlers.get(userId);
    if (timeout) {
        clearTimeout(timeout);
        activeTextHandlers.delete(userId);
    }
};

const safeDeleteMessage = async (bot: TelegramBot, chatId: number, messageId: number) => {
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch (error: any) {
        if (error.response?.body?.description?.includes('message to delete not found') ||
            error.message?.includes('message to delete not found')) {
            return;
        }
        console.error('Error deleting message:', error.message);
    }
};

const safeEditMessage = async (bot: TelegramBot, chatId: number, messageId: number, editFn: () => Promise<any>) => {
    try {
        await editFn();
    } catch (error: any) {
        if (error.response?.body?.description?.includes('message to edit not found') ||
            error.response?.body?.description?.includes('message is not modified') ||
            error.message?.includes('message to edit not found') ||
            error.message?.includes('message is not modified')) {
            return;
        }
        console.error('Error editing message:', error.message);
    }
};

bot.on("callback_query", async (callbackQuery) => {
    console.log("debug callback_query", `\x1b[35m${callbackQuery.data}\x1b[0m`);
    try {
        const sel_action = callbackQuery.data;
        const callbackQueryDate = callbackQuery?.message?.date || 0;
        const ctx = callbackQuery.message;
        const text = ctx?.text || "";
        const from = callbackQuery.from;
        const channelType = ctx?.chat.type;
        const caption = callbackQuery.message?.caption || "";
        const solanaAddress = text.match(/([A-Za-z0-9]{32,44})/)?.[1] || "";
        const ethAddress = text.match(/(0x[a-fA-F0-9]{40})/)?.[1] || "";
        const tokenAddress = ethAddress || solanaAddress;

        const SPAM_LIMIT = 10;
        const SPAM_WINDOW_MS = 30 * 1000; // 

        if (tokenAddress) {
            console.log("Extracted Token Address:", tokenAddress);
        } else {
            console.log("No Token Address Found in Caption");
        }

        const userId = from.id;

        const navigationActions = ["menu_back", "buy_back", "sell_back", "wallets_back", "settings_back",
            "settings_fee_back", "menu_close", "welcome", "buy", "sell", "wallets", "settings", "positions",
            "help", "sniper", "trending_coin", "referral_system"];
        if (navigationActions.includes(sel_action || "")) {
            cleanupUserTextHandler(userId);
        }
        const users = await User.findOne({ userId });
        if (!users) return; // Skip if user doesn't exist
        let tokenBalance: any;
        if (users.language === "en") {
            tokenBalance = text.match(
                /💰 Token Balance : ([\d.]+) [A-Za-z0-9 ]+/
            )?.[1];
        } else {
            tokenBalance = text.match(
                /💰 Solde en tokens : ([\d.]+) [A-Za-z0-9 ]+/
            )?.[1];
        }
        const solAmount = caption.match(/Wallet Balance: ([\d.]+) SOL/)?.[1];
        const callbackQueryId = callbackQuery.id;
        const currentKeyboard = callbackQuery.message?.reply_markup;
        const chatId = ctx?.chat.id || 0;
        const messageId = ctx?.message_id || 0;

        const subscriptionHandled = await handleSubscriptionAction({
            bot,
            action: sel_action,
            chatId,
            telegramId: userId,
            callbackQueryId,
        });
        if (subscriptionHandled) {
            return;
        }

        const settings = await TippingSettings.findOne() || new TippingSettings();
        if (!settings) throw new Error("Tipping settings not found!");

        if (sel_action === "admin_panel") {
            console.log('debug-> admin panel messsage');
            await safeDeleteMessage(bot, chatId, messageId);
            sendAdminPanelMessage(bot, chatId, userId);
        }

        if (sel_action === "add_user") {
            bot.sendMessage(
                chatId,
                `${await t('messages.addRemoveUser', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                        } else {
                            sendAddUserMessage(
                                bot,
                                chatId,
                                userId,
                                inputUserId
                            );
                        }
                        // sendMenuMessage(bot, chatId, userId, messageId);
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
            return;
        }

        if (sel_action === "remove_user") {
            bot.sendMessage(
                chatId,
                `${await t('messages.addRemoveUser', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                            await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                            await safeDeleteMessage(bot, chatId, reply.message_id);
                            return;
                        }

                        try {
                            const targetUser = await WhiteListUser.findOne({ telegramId: inputUserId });

                            if (!targetUser) {
                                const errorMessage = bot.sendMessage(chatId, `${await t('errors.targetUser', userId)}`);
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, (await errorMessage).message_id);
                                }, 5000);
                            } else {
                                await WhiteListUser.deleteOne({ telegramId: inputUserId });
                                const sentMessage = await bot.sendMessage(chatId, `${await t('messages.removed1', userId)} ${inputUserId} ${await t('messages.removed2', userId)}`);
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, (await sentMessage).message_id);
                                }, 5000);
                            }
                        } catch (err) {
                            console.error('Error removing user:', err);
                            bot.sendMessage(chatId, `${await t('errors.removederror', userId)}`);
                        }

                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
            return;
        }

        if (sel_action === "snipping_settings") {
            if (messageId) {
                await safeDeleteMessage(bot, chatId, messageId);
            }
            sendSnippingSettingsMessage(bot, chatId, userId);
            return;
        }

        if (sel_action === "snipping_toggle_subscription") {
            settings.sniperSubscriptionRequired = !settings.sniperSubscriptionRequired;
            await settings.save();
            editSnippingSettingsMessage(bot, chatId, userId, messageId);
            return;
        }

        if (sel_action === "add_sniper_user") {
            bot.sendMessage(
                chatId,
                `${await t('messages.addRemoveSniperUser', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                        } else {
                            sendAddSniperUserMessage(
                                bot,
                                chatId,
                                userId,
                                inputUserId
                            );
                            if (messageId) {
                                setTimeout(() => {
                                    editSnippingSettingsMessage(bot, chatId, userId, messageId).catch(() => { });
                                }, 2000);
                            }
                        }
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
            return;
        }

        if (sel_action === "remove_sniper_user") {
            bot.sendMessage(
                chatId,
                `${await t('messages.addRemoveSniperUser', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                            await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                            await safeDeleteMessage(bot, chatId, reply.message_id);
                            return;
                        }

                        try {
                            const resolveUserId = async (input: string): Promise<number | null> => {
                                const userIdNum = parseInt(input);
                                if (!isNaN(userIdNum)) {
                                    return userIdNum;
                                }
                                const username = input.startsWith('@') ? input.slice(1) : input;
                                const user = await User.findOne({ username: username });
                                if (user && user.userId) {
                                    return user.userId;
                                }
                                return null;
                            };

                            const resolvedUserId = await resolveUserId(inputUserId);

                            if (resolvedUserId === null) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.userNotFound', userId)}`);
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, errorMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                const targetUser = await SniperWhitelist.findOne({ userId: resolvedUserId });

                                if (!targetUser) {
                                    const errorMessage = await bot.sendMessage(chatId, `${await t('errors.targetSniperUser', userId)}`);
                                    setTimeout(async () => {
                                        bot.deleteMessage(chatId, errorMessage.message_id).catch(() => { });
                                    }, 5000);
                                } else {
                                    await SniperWhitelist.deleteOne({ userId: resolvedUserId });
                                    const sentMessage = await bot.sendMessage(chatId, `${await t('messages.removedSniperUser1', userId)} ${inputUserId} ${await t('messages.removedSniperUser2', userId)}`);
                                    setTimeout(async () => {
                                        bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                                    }, 5000);
                                    if (messageId) {
                                        setTimeout(() => {
                                            editSnippingSettingsMessage(bot, chatId, userId, messageId).catch(() => { });
                                        }, 2000);
                                    }
                                }
                            }
                        } catch (err) {
                            console.error('Error removing sniper user:', err);
                            bot.sendMessage(chatId, `${await t('errors.removederror', userId)}`);
                        }

                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
            return;
        }

        if (sel_action === "admin_referral") {
            const userChain = await getUserChain(userId);
            const referralMessage = userChain === "ethereum"
                ? await t('messages.enterreferral_ethereum', userId)
                : await t('messages.enterreferral', userId);
            const sent = bot.sendMessage(
                chatId,
                referralMessage,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidsettings', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidsettings', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            settings.referralReward = newdate;
                                            await settings.save();
                                            editSettingsMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.referralReward = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "admin_referralSettings") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.enterreferralSettings', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidsettings', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidsettings', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            settings.referralSettings = newdate;
                                            await settings.save();
                                            editSettingsMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.referralSettings = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "admin_tip_percentage") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.entertip', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0 || date > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.iinvalidtip', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidtip', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            settings.feePercentage = newdate;
                                            await settings.save();
                                            editSettingsMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.feePercentage = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "admin_tip_percentage_eth") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.entertip', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0 || date > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.iinvalidtip', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidtip', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            settings.feePercentageEth = newdate;
                                            await settings.save();
                                            editAdminPanelMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.feePercentageEth = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        const setWalletLimit = async (
            promptKey: 'messages.walletLimitSolana' | 'messages.walletLimitEthereum',
            field: 'walletsSolana' | 'walletsEthereum',
        ) => {
            const sent = bot.sendMessage(chatId, `${await t(promptKey, userId)}`).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 1 || date > 100) {
                            bot.sendMessage(chatId, `${await t('errors.invalidwallets', userId)}`).then((newSentMessage) => {
                                setTimeout(() => safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { }), 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(chatId, `${await t('errors.invalidwallets', userId)}`);
                                        } else {
                                            (settings as unknown as Record<string, number>)[field] = newdate;
                                            await settings.save();
                                            editAdminPanelMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            (settings as unknown as Record<string, number>)[field] = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        };
        if (sel_action === "admin_wallets_solana") {
            await setWalletLimit('messages.walletLimitSolana', 'walletsSolana');
        }
        if (sel_action === "admin_wallets_ethereum") {
            await setWalletLimit('messages.walletLimitEthereum', 'walletsEthereum');
        }

        if (sel_action === "admin_subscription_price_week") {
            const sent = bot.sendMessage(
                chatId,
                await t('snippingSettings.enterSubscriptionPriceWeek', userId),
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const price = Number(reply.text || "");
                        if (isNaN(price) || price < 0) {
                            bot.sendMessage(
                                chatId,
                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newPrice = Number(newReply.text || "");
                                        if (isNaN(newPrice) || newPrice < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                                            );
                                        } else {
                                            settings.subscriptionPriceWeek = newPrice;
                                            await settings.save();
                                            editAdminPanelMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.subscriptionPriceWeek = price;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "admin_subscription_price_month") {
            const sent = bot.sendMessage(
                chatId,
                await t('snippingSettings.enterSubscriptionPriceMonth', userId),
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const price = Number(reply.text || "");
                        if (isNaN(price) || price < 0) {
                            bot.sendMessage(
                                chatId,
                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newPrice = Number(newReply.text || "");
                                        if (isNaN(newPrice) || newPrice < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                                            );
                                        } else {
                                            settings.subscriptionPriceMonth = newPrice;
                                            await settings.save();
                                            editAdminPanelMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.subscriptionPriceMonth = price;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "admin_subscription_price_year") {
            const sent = bot.sendMessage(
                chatId,
                await t('snippingSettings.enterSubscriptionPriceYear', userId),
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const price = Number(reply.text || "");
                        if (isNaN(price) || price < 0) {
                            bot.sendMessage(
                                chatId,
                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newPrice = Number(newReply.text || "");
                                        if (isNaN(newPrice) || newPrice < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                await t('snippingSettings.invalidSubscriptionPrice', userId),
                                            );
                                        } else {
                                            settings.subscriptionPriceYear = newPrice;
                                            await settings.save();
                                            editAdminPanelMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            settings.subscriptionPriceYear = price;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 2000);
                    }),
                );
            });
        }

        if (sel_action === "whitelist_active") {
            settings.WhiteListUser = !settings.WhiteListUser;
            await settings.save();
            editAdminPanelMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "admin_refresh") {
            editAdminPanelMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "admin_wallet_name") {
            bot.sendMessage(
                chatId,
                `${await t('messages.renameWallet1', userId)}`,
            ).then((sentMessage) => {
                bot.once("text", createUserTextHandler(userId, async (reply) => {
                    const label = reply.text || "";

                    await safeDeleteMessage(bot, chatId, reply.message_id);
                    await safeDeleteMessage(bot, chatId, sentMessage.message_id);

                    if (hasSpecialCharacters(label)) {
                        bot.sendMessage(
                            chatId,
                            `${await t('messages.importwallet1', userId)}`,
                        );
                    } else if (isExistWalletWithName(wallets, label)) {
                        bot.sendMessage(
                            chatId,
                            `${await t('messages.importwallet2', userId)}`,
                        );
                    } else {
                        settings.adminSolAddress.label = label;
                        await settings.save();

                        editAdminPanelMessage(bot, chatId, userId, messageId);
                    }
                }));
            });
        }

        if (sel_action === "admin_wallet") {
            bot.sendMessage(
                chatId,
                `${await t('messages.importwallet5', userId)}`,
            ).then((sentMessage) => {
                bot.once("text", createUserTextHandler(userId, async (reply) => {
                    const label = reply.text || "";
                    if (hasSpecialCharacters(label)) {
                        bot.sendMessage(
                            chatId,
                            `${await t('messages.importwallet1', userId)}`,
                        );
                    } else if (isExistWalletWithName(wallets, label)) {
                        bot.sendMessage(
                            chatId,
                            `${await t('messages.importwallet2', userId)}`,
                        );
                    } else {
                        bot.sendMessage(
                            chatId,
                            `${await t('messages.importwallet3', userId)}`,
                        ).then((sentMessage2) => {
                            bot.once("text", createUserTextHandler(userId, async (reply2) => {
                                const input = reply2.text || "";
                                if (isValidPrivateKey(input)) {
                                    const { publicKey } = walletFromPrvKey(input);
                                    const balance = await getBalance(publicKey);
                                    console.log(balance);
                                    const sol_price = getSolPrice();
                                    if (isExistWallet(wallets, publicKey)) {
                                        bot.sendMessage(
                                            chatId,
                                            `${await t('messages.importwallet4', userId)}`,
                                        );
                                        setTimeout(() => {
                                            bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => { });
                                        }, 5000);
                                    } else {
                                        const secretKey = encryptSecretKey(input)
                                        settings.adminSolAddress.label = label;
                                        settings.adminSolAddress.balance = balance;
                                        settings.adminSolAddress.publicKey = publicKey;
                                        settings.adminSolAddress.secretKey = secretKey;
                                        await settings.save();
                                        editAdminPanelMessage(bot, chatId, userId, messageId);
                                    }
                                } else
                                    bot.sendMessage(
                                        chatId,
                                        `${await t('errors.invalidPrivateKey', userId)}`);
                                bot.deleteMessage(chatId, reply2.message_id);
                                bot.deleteMessage(chatId, sentMessage2.message_id);
                            }));
                        });
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }
                }));
            });
        }

        const user = await User.findOne({ userId });
        if (!user) throw "No User";
        const userChain = await getUserChain(userId);
        let wallets = userChain === "ethereum" ? (user?.ethereumWallets || []) : (user?.wallets || []);

        if (!wallets || wallets.length === 0) {
            if (userChain === "ethereum") {
                const { walletCreate: ethereumWalletCreate } = await import("./services/ethereum/wallet");
                const { getBalance: getEthereumBalance } = await import("./services/ethereum/etherscan");
                const { publicKey, secretKey } = ethereumWalletCreate();
                const balance = await getEthereumBalance(publicKey);
                user.ethereumWallets.push({
                    publicKey,
                    secretKey,
                    is_active_wallet: true,
                    balance: balance.toString(),
                    label: "Start Wallet"
                });
                await user.save();
                wallets = user.ethereumWallets;
            } else {
                const { walletCreate } = await import("./services/solana");
                const { getBalance } = await import("./services/solana");
                const { publicKey, secretKey } = walletCreate();
                const balance = await getBalance(publicKey);
                user.wallets.push({
                    publicKey,
                    secretKey,
                    is_active_wallet: true,
                    balance: balance.toString()
                });
                await user.save();
                wallets = user.wallets;
            }
        }

        let active_wallet = wallets.find((wallet) => wallet.is_active_wallet);

        if (!active_wallet && wallets.length > 0) {
            if (userChain === "ethereum") {
                user.ethereumWallets[0].is_active_wallet = true;
            } else {
                user.wallets[0].is_active_wallet = true;
            }
            await user.save();
            active_wallet = wallets[0];
        }

        if (!active_wallet) throw "No active Wallet";
        const publicKey = active_wallet?.publicKey;
        if (!publicKey) throw "No publicKey";

        const userTelegramId = callbackQuery.from.username || "";
        const whiteListUsers = await WhiteListUser.find({});

        const isWhitelisted = whiteListUsers.some((u) => {
            const whitelistUsername = u.telegramId.startsWith('@') ? u.telegramId.slice(1) : u.telegramId;
            const currentUsername = userTelegramId.startsWith('@') ? userTelegramId.slice(1) : userTelegramId;

            return whitelistUsername === currentUsername;
        });

        if (userId === 7994989802 || userId === 2024002049) { }
        else {
            if (!isWhitelisted && settings.WhiteListUser) {
                userLocalData[userId] = {
                    withdraw: {
                        address: "",
                        amount: 0,
                    },
                };
                sendWelcomeMessage(bot, chatId, userId, messageId, userTelegramId);
                await bot.answerCallbackQuery(callbackQueryId, {
                    text: await t('messages.accessDenied'),
                    show_alert: true,
                });
                return;
            }
        }

        const currentTime = Math.floor(Date.now() / 1000);
        if (sel_action === "welcome") {
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            sendWelcomeMessage(bot, chatId, userId, messageId, userTelegramId);
        }

        if (sel_action === "login") {
            if (isWhitelisted) {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.successLog', userId)} ${user.username}!`,
                );
                editMenuMessage(bot, chatId, userId, messageId);

                return;
            } else {
                bot.sendMessage(
                    chatId,
                    `${await t('errors.logError', userId)}`,
                );
                return;
            }
        }

        if (sel_action === "referral_system") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendReferralMessage(bot, chatId, userId);
        }

        if (sel_action === "referral_wallet") {
            const sent = bot.sendMessage(
                chatId,
                `${await t(`${await t('referral.message1', userId)}`, userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const address = String(reply.text || "");
                        if (!isValidSolanaAddress(address)) {
                            bot.sendMessage(
                                chatId,
                                `${await t('referral.message2', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 6000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newaddress = String(newReply.text || "");
                                        if (!isValidSolanaAddress(newaddress)) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('referral.message3', userId)}`,
                                            );
                                        } else {
                                            user.referrer_wallet = newaddress;
                                            await user.save();
                                            editReferralMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.referrer_wallet = address;
                            await user.save();
                            editReferralMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "share_link") {
            const referralLink = `https://t.me/Tcfl_trade_bot?start=ref_${userId}`;
            // const referralLink = `https://t.me/Eniybot?start=ref_${userId}`;
            const message = `${await t('referral.shareMessage1', userId)}\n` +
                `${await t('referral.shareMessage2', userId)}\n\n` +
                `${await t('referral.shareMessage3', userId)}\n${referralLink}`;
            const markup = {
                inline_keyboard: [
                    [
                        {
                            text: `${await t('referral.share1', userId)}`,
                            switch_inline_query: message
                        },
                        await getCloseButton(userId),
                    ]
                ]
            };
            bot.sendMessage(chatId, message, {
                parse_mode: "HTML",
                reply_markup: markup
            });
        }

        if (sel_action === "referral_view_list") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendReferralsListMessage(bot, chatId, userId, 0);
        }

        if (sel_action === "referral_back") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendReferralMessage(bot, chatId, userId);
        }

        if (sel_action && sel_action.startsWith("referral_list_page_")) {
            const pageMatch = sel_action.match(/referral_list_page_(\d+)/);
            if (pageMatch) {
                const page = parseInt(pageMatch[1], 10);
                editReferralsListMessage(bot, chatId, userId, messageId, page);
            }
        }

        if (sel_action === "menu_back") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            sendMenu(bot, chatId, userId, messageId);
        }
        if (sel_action === "menu_close") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
        }
        if (sel_action === "select_chain") {
            await safeDeleteMessage(bot, chatId, messageId);
            CommandHandler.chain(bot, { chat: { id: chatId }, from: { id: userId } } as TelegramBot.Message, null);
        }
        if (sel_action === "select_chain_solana" || sel_action === "select_chain_ethereum") {
            const user = await User.findOne({ userId });
            if (!user) {
                await bot.answerCallbackQuery(callbackQueryId, { text: "User not found" });
                return;
            }
            const newChain = sel_action === "select_chain_solana" ? "solana" : "ethereum";
            user.chain = newChain;
            await user.save();
            await bot.answerCallbackQuery(callbackQueryId, { text: `Switched to ${newChain === "solana" ? "Solana" : "Ethereum"}` });
            await safeDeleteMessage(bot, chatId, messageId);
            CommandHandler.chain(bot, { chat: { id: chatId }, from: { id: userId } } as TelegramBot.Message, null);
        }
        if (sel_action === "back_to_menu") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendMenu(bot, chatId, userId, messageId);
        }
        if (sel_action === "buy") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const { sendEthereumBuyMessage } = await import("./messages/ethereum/buy");
                sendEthereumBuyMessage(bot, chatId, userId, messageId);
            } else {
                sendBuyMessage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action === "buy_refresh" || sel_action === "buy_back") {
            if (sel_action === "buy_back") {
                cleanupUserTextHandler(userId);
            }

            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }
            console.log('debug buy_refresh', sel_action);

            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const messageText = text || caption || "";
                const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                    const { BuyEdit: EthereumBuyEdit } = await import("./commands/ethereum/buy");
                    await EthereumBuyEdit(bot, chatId, userId, messageId, ethTokenAddress);
                } else {
                    await bot.answerCallbackQuery(callbackQuery.id, {
                        text: "❌ Could not find Ethereum token address in message",
                    });
                }
            } else {
                await editBuyMessageWithAddress(bot, chatId, userId, messageId, tokenAddress);
            }
            return;
        }

        if (sel_action === "manual_refresh") {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }
            console.log('debug manual_refresh', sel_action);

            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const refreshMessageId = user.manual_message_id || messageId;
                if (refreshMessageId) {
                    try {
                        const messageText = text || caption || "";
                        const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                        const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                        if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                            const { BuyEdit: EthereumBuyEdit } = await import("./commands/ethereum/buy");
                            await EthereumBuyEdit(bot, chatId, userId, refreshMessageId, ethTokenAddress);
                        } else {
                            await bot.answerCallbackQuery(callbackQuery.id, {
                                text: "❌ Could not find Ethereum token address in message",
                            });
                        }
                    } catch (error) {
                        console.error('Error refreshing buy menu:', error);
                    }
                }
            }
            return;
        }

        if (sel_action === "manual_refresh") {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }

            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const refreshMessageId = user.manual_message_id || messageId;
                if (refreshMessageId) {
                    try {
                        const messageText = text || caption || "";
                        const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                        const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                        if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                            const { BuyEdit: EthereumBuyEdit } = await import("./commands/ethereum/buy");
                            await EthereumBuyEdit(bot, chatId, userId, refreshMessageId, ethTokenAddress);
                        } else {
                            await bot.answerCallbackQuery(callbackQuery.id, {
                                text: "❌ Could not find Ethereum token address in message",
                            });
                        }
                    } catch (error) {
                        console.error('Error refreshing buy menu:', error);
                    }
                }
            }
            return;
        }

        if (sel_action === "sell_refresh" || sel_action === "sell_back") {
            if (sel_action === "sell_back") {
                cleanupUserTextHandler(userId);
            }
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }
            console.log('debug sell_refresh', sel_action);

            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const messageText = text || caption || "";
                const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                    const { SellEdit: EthereumSellEdit } = await import("./commands/ethereum/sell");
                    await EthereumSellEdit(bot, chatId, userId, messageId, ethTokenAddress);
                } else {
                    await bot.answerCallbackQuery(callbackQuery.id, {
                        text: "❌ Could not find Ethereum token address in message",
                    });
                }
            } else {
                await editSellMessageWithAddress(bot, chatId, userId, messageId, tokenAddress);
            }
            return;
        }

        if ((sel_action ?? "").startsWith("sniper_buy_")) {
            const indexStr = sel_action?.replace("sniper_buy_", "") || "";
            const tokenIndex = Number(indexStr) - 1;
            const sniperTokenList = users?.sniper?.tokenlist || [];

            if (isNaN(tokenIndex) || tokenIndex < 0 || tokenIndex >= sniperTokenList.length) {
                await bot.answerCallbackQuery(callbackQueryId, {
                    text: `${await t('errors.notToken', userId)}`,
                    show_alert: true,
                });
                return;
            }

            const targetTokenAddress = sniperTokenList[tokenIndex];
            const sniperBuyAmount = Number(users?.sniper?.buy_amount)

            if (sniperBuyAmount <= 0) {
                await bot.answerCallbackQuery(callbackQueryId, {
                    text: `${await t('errors.invalidAmount', userId)}`,
                    show_alert: true,
                });
                return;
            }

            await sendBuyMessageWithAddress(
                bot,
                chatId,
                userId,
                messageId,
                targetTokenAddress,
                sniperBuyAmount,
            );
            return;
        }

        type BuyAction =
            | "buy_01"
            | "buy_05"
            | "buy_1"
            | "buy_2"
            | "buy_5"
            | "buy_x";

        function handleBuyAction(
            sel_action: BuyAction,
            bot: any,
            chatId: number,
            userId: number,
            messageId: number,
            tokenAddress: string,
        ): void {
            const getTokenPercent = (
                action: BuyAction,
            ): number | "custom" | null => {
                const buy_amount = user?.settings.quick_buy?.buy_amount || [0.1, 0.5, 1, 2, 5];
                switch (action) {
                    case "buy_01": return Number(buy_amount[0]) || 0.1;
                    case "buy_05": return Number(buy_amount[1]) || 0.5;
                    case "buy_1": return Number(buy_amount[2]) || 1;
                    case "buy_2": return Number(buy_amount[3]) || 2;
                    case "buy_5": return Number(buy_amount[4]) || 5;
                    default: return null;
                }
            };

            const buySolAmount = getTokenPercent(sel_action);
            if (buySolAmount === null || buySolAmount === "custom" || isNaN(Number(buySolAmount)) || Number(buySolAmount) <= 0) {
                console.error(`Invalid buy amount for action: ${sel_action}`);
                return;
            }
            sendBuyMessageWithAddress(
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
                Number(buySolAmount),
            );
        }

        if (sel_action && sel_action.startsWith("buy_amount_")) {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const amountIndex = sel_action.split("buy_amount_")[1];
                let ethAmount: number;

                if (amountIndex === "x") {
                    const buyXMessage = await t('messages.buy_x_ethereum', userId);
                    bot.sendMessage(chatId, buyXMessage).then((sentMessage) => {
                        bot.once('text',
                            createUserTextHandler(userId, async (reply) => {
                                const tradeAmount = Number(reply.text || "");
                                if (isNaN(tradeAmount) || tradeAmount <= 0) {
                                    bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)}`);
                                    return;
                                } else {
                                    await sendEthereumBuyMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, tradeAmount);
                                }
                                await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                                await safeDeleteMessage(bot, chatId, reply.message_id);
                            }),
                        );
                    });
                    return;
                } else if (amountIndex === "max") {
                    const active_wallet = user.ethereumWallets.find(w => w.is_active_wallet);
                    if (!active_wallet) {
                        await bot.sendMessage(chatId, `❌ No active wallet found.`);
                        return;
                    }
                    const { getBalance } = await import("./services/ethereum/etherscan");
                    const balance = await getBalance(active_wallet.publicKey || "");
                    ethAmount = balance * 0.95;
                } else {
                    const index = Number(amountIndex);
                    const buy_amount = user.settings.quick_buy_eth?.buy_amount_eth || [0.1, 0.2, 0.5, 1, 2];
                    ethAmount = buy_amount[index] || buy_amount[0];
                }
                await sendEthereumBuyMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, ethAmount);
                return;
            }
        }

        if (sel_action && sel_action.startsWith("buy_") && sel_action !== "buy_x" && sel_action !== "buy_amount_x" && !sel_action.startsWith("buy_amount_") && !sel_action.startsWith("buy_gas_eth_")) {
            handleBuyAction(
                sel_action as BuyAction,
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
            );
        }

        if (sel_action === "buy_x") {
            const userChain = await getUserChain(userId);
            const buyXMessage = userChain === "ethereum"
                ? await t('messages.buy_x_ethereum', userId)
                : await t('messages.buy_x', userId);
            bot.sendMessage(
                chatId,
                buyXMessage,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                console.log('debug buy_x sel_action', sel_action);
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const tradeAmount = Number(reply.text || "");
                        if (isNaN(tradeAmount) || tradeAmount <= 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            );
                            return;
                        } else {
                            const userChain = await getUserChain(userId);
                            if (userChain === "ethereum") {
                                await sendEthereumBuyMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, tradeAmount);
                            } else {
                                await sendBuyMessageWithAddress(
                                    bot,
                                    chatId,
                                    userId,
                                    messageId,
                                    tokenAddress,
                                    tradeAmount,
                                );
                            }
                        }
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
        }

        const dangerZoneMessage =
            `<strong>${await t('dangerZoneMessage.p1', userId)}</strong>\n\n` +
            `${await t('dangerZoneMessage.p2', userId)}\n` +
            `<strong>${await t('dangerZoneMessage.p3', userId)}</strong> ${await t('dangerZoneMessage.p4', userId)}\n\n` +
            `<strong>${await t('dangerZoneMessage.p5', userId)}</strong>\n` +
            `${await t('dangerZoneMessage.p6', userId)}`;

        if (sel_action === "sell") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const { sendEthereumSellMessage } = await import("./messages/ethereum/sell");
                sendEthereumSellMessage(bot, chatId, userId, messageId);
            } else {
                sendSellMessage(bot, chatId, userId, messageId);
            }
        }

        type SellAction =
            | "sell_10"
            | "sell_20"
            | "sell_50"
            | "sell_75"
            | "sell_100"
            | "sell_x";

        function handleSellAction(
            sel_action: SellAction,
            bot: any,
            chatId: number,
            userId: number,
            messageId: number,
            tokenAddress: string,
        ): void {
            const getTokenPercent = (
                action: SellAction,
            ): number | "custom" | null => {
                switch (action) {
                    case "sell_10":
                        return Number(user?.settings.quick_sell.sell_percent[0]);
                    case "sell_20":
                        return Number(user?.settings.quick_sell.sell_percent[1]);
                    case "sell_50":
                        return Number(user?.settings.quick_sell.sell_percent[2]);
                    case "sell_75":
                        return Number(user?.settings.quick_sell.sell_percent[3]);
                    case "sell_100":
                        return Number(user?.settings.quick_sell.sell_percent[4]);
                    case "sell_x":
                        return "custom";
                    default:
                        return null;
                }
            };

            const sellPercent = getTokenPercent(sel_action);
            sendSellMessageWithAddress(
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
                Number(sellPercent),
                Number(tokenBalance)
            );
        }

        if ((sel_action === "sell_10" || sel_action === "sell_20" || sel_action === "sell_50" || sel_action === "sell_75" || sel_action === "sell_100" || sel_action === "sell_x")) {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                let sellPercent: number;

                if (sel_action === "sell_x") {
                    bot.sendMessage(chatId, `${await t('messages.sell_x', userId)}`).then((sentMessage) => {
                        bot.once('text',
                            createUserTextHandler(userId, async (reply) => {
                                const tokenSellPercent = Number(reply.text || "");
                                if (isNaN(tokenSellPercent) || tokenSellPercent < 0 || tokenSellPercent > 100) {
                                    bot.sendMessage(chatId, `${await t('errors.invalidSellPercent', userId)}`);
                                    return;
                                } else {
                                    const active_wallet = user.ethereumWallets.find(w => w.is_active_wallet);
                                    if (!active_wallet) {
                                        await bot.sendMessage(chatId, `❌ No active wallet found.`);
                                        return;
                                    }
                                    const { getTokenBalancWithContract } = await import("./services/ethereum/contract");
                                    const tokenBalance = await getTokenBalancWithContract(tokenAddress, active_wallet.publicKey || '');
                                    const { sendEthereumSellMessageWithAddress } = await import("./messages/ethereum/sell");
                                    await sendEthereumSellMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, tokenSellPercent, tokenBalance);
                                }
                                await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                                await safeDeleteMessage(bot, chatId, reply.message_id);
                            }),
                        );
                    });
                    return;
                } else {
                    const sell_percent = user.settings.quick_sell_eth?.sell_percent_eth || [10, 20, 50, 75, 100];
                    switch (sel_action) {
                        case "sell_10": sellPercent = sell_percent[0] || 10; break;
                        case "sell_20": sellPercent = sell_percent[1] || 20; break;
                        case "sell_50": sellPercent = sell_percent[2] || 50; break;
                        case "sell_75": sellPercent = sell_percent[3] || 75; break;
                        case "sell_100": sellPercent = sell_percent[4] || 100; break;
                        default: sellPercent = 10;
                    }
                }

                const active_wallet = user.ethereumWallets.find(w => w.is_active_wallet);
                if (!active_wallet) {
                    await bot.sendMessage(chatId, `❌ No active wallet found.`);
                    return;
                }
                const { getTokenBalancWithContract } = await import("./services/ethereum/contract");
                const tokenBalance = await getTokenBalancWithContract(tokenAddress, active_wallet.publicKey || '');

                const { sendEthereumSellMessageWithAddress } = await import("./messages/ethereum/sell");
                await sendEthereumSellMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, sellPercent, tokenBalance);
                return;
            } else {
                // Handle Solana users
                if (sel_action === "sell_x") {
                    // sell_x is handled separately below
                    return;
                }
                
                let sellPercent: number;
                const sell_percent = user.settings.quick_sell?.sell_percent || [10, 20, 50, 75, 100];
                switch (sel_action) {
                    case "sell_10": sellPercent = sell_percent[0] || 10; break;
                    case "sell_20": sellPercent = sell_percent[1] || 20; break;
                    case "sell_50": sellPercent = sell_percent[2] || 50; break;
                    case "sell_75": sellPercent = sell_percent[3] || 75; break;
                    case "sell_100": sellPercent = sell_percent[4] || 100; break;
                    default: sellPercent = 10;
                }
                
                await sendSellMessageWithAddress(
                    bot,
                    chatId,
                    userId,
                    messageId,
                    tokenAddress,
                    sellPercent,
                    Number(tokenBalance)
                );
                return;
            }
        }

        if (sel_action && sel_action.startsWith("sell_") && sel_action !== "sell_x" && sel_action !== "sell_10" && sel_action !== "sell_20" && sel_action !== "sell_50" && sel_action !== "sell_75" && sel_action !== "sell_100" && !sel_action?.startsWith("sell_gas_eth_")) {
            handleSellAction(
                sel_action as SellAction,
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
            );
        }

        if (sel_action === "sell_x") {
            const userChain = await getUserChain(userId);
            bot.sendMessage(
                chatId,
                `${await t('messages.sell_x', userId)}`,
                // { reply_markup: { force_reply: true } },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const tokenSellPercent = Number(reply.text || "");
                        if (
                            isNaN(tokenSellPercent) ||
                            tokenSellPercent <= 0 ||
                            tokenSellPercent > 100
                        ) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSellAmount', userId)}`,
                            );
                        } else {
                            if (userChain === "ethereum") {
                                const active_wallet = user.ethereumWallets.find(w => w.is_active_wallet);
                                if (!active_wallet) {
                                    await bot.sendMessage(chatId, `❌ No active wallet found.`);
                                    return;
                                }
                                const { getTokenBalancWithContract } = await import("./services/ethereum/contract");
                                const tokenBalance = await getTokenBalancWithContract(tokenAddress, active_wallet.publicKey || '');
                                const { sendEthereumSellMessageWithAddress } = await import("./messages/ethereum/sell");
                                await sendEthereumSellMessageWithAddress(bot, chatId, userId, messageId, tokenAddress, tokenSellPercent, tokenBalance);
                            } else {
                                await sendSellMessageWithAddress(
                                    bot,
                                    chatId,
                                    userId,
                                    messageId,
                                    tokenAddress,
                                    tokenSellPercent,
                                    Number(tokenBalance),
                                );
                            }
                        }
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }),
                );
            });
            return;
        }

        if (sel_action === "bundle_buy") {
            const user = await User.findOne({ userId });
            if (user && user.chain === "ethereum") {
                await bot.answerCallbackQuery(callbackQueryId, { text: "Bundle functions are only available for Solana" });
                return;
            }
            await bundleBuySell.handleBundleBuy(User, callbackQuery, tokenAddress);
            return;
        }

        if (sel_action === "bundle_sell") {
            const user = await User.findOne({ userId });
            if (user && user.chain === "ethereum") {
                await bot.answerCallbackQuery(callbackQueryId, { text: "Bundle functions are only available for Solana" });
                return;
            }
            await bundleBuySell.handleBundleSell(User, callbackQuery, tokenAddress);
            return;
        }

        if (sel_action === "wallets") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            if (userChain === "ethereum") {
                sendEthereumWalletsMessageWithImage(bot, chatId, userId, messageId);
            } else {
                sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            }
        }
        if (sel_action === "wallets_refresh" || sel_action === "wallets_back") {
            if (sel_action === "wallets_back") {
                cleanupUserTextHandler(userId);
            }
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }

            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                editEthereumWalletsMessage(bot, chatId, userId, messageId);
            } else {
                editWalletsMessage(bot, chatId, userId, messageId);
            }
            if (sel_action === "wallets_back") {
                await safeDeleteMessage(bot, chatId, messageId);
                if (userChain === "ethereum") {
                    sendEthereumWalletsMessageWithImage(bot, chatId, userId, messageId);
                } else {
                    sendWalletsMessageWithImage(bot, chatId, userId, messageId);
                }
            }
            if (sel_action === "wallets_refresh") {
                console.log('debug wallets_refresh', sel_action);
                if (userChain === "ethereum") {
                    editEthereumWalletsMessage(bot, chatId, userId, messageId);
                } else {
                    editWalletsMessage(bot, chatId, userId, messageId);
                }
            }
            return;
        }

        if (sel_action === "wallets_deposit") {
            bot.sendMessage(
                chatId,
                `To deposit SOL to your wallet, send it to the following address:\n<code>${publicKey}</code>`,
                { parse_mode: "HTML" },
            );
            return;
        }

        if (sel_action === "wallets_withdraw") {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendWithdrawEthereumWalletsMessage(bot, chatId, userId);
            } else {
                sendWithdrawWalletsMessage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action?.startsWith('wallets_withdraw_confirm_')) {
            const parts = sel_action.split('wallets_withdraw_confirm_')[1].split('_');
            const index = Number(parts[0]);
            const ethToAddress = parts[1] || null;
            const ethAmount = parts[2] ? Number(parts[2]) : null;

            const userChain = await getUserChain(userId);

            if (userChain === "ethereum") {
                const wallet = user.ethereumWallets[index];
                if (!wallet) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }

                let finalAmount = ethAmount;
                let finalAddress = ethToAddress;

                if (!finalAmount) {
                    const amountMatch = text.match(/([\d.]+)\s*(ETH|eth)/i);
                    finalAmount = amountMatch ? Number(amountMatch[1]) : null;
                }

                if (!finalAddress) {
                    const addressMatch = text.match(/(0x[a-fA-F0-9]{40})/);
                    finalAddress = addressMatch ? addressMatch[1] : null;
                }

                if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
                    bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)}`);
                    return;
                }

                if (!finalAddress || !isEvmAddress(finalAddress)) {
                    bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)}`);
                    return;
                }

                try {
                    await transferETH(bot, chatId, userId, finalAmount, index, finalAddress);
                    editEthereumWalletsMessage(bot, chatId, userId, messageId);
                } catch (error) {
                    console.error('Ethereum withdraw error:', error);
                    bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)}`);
                }
                return;
            }

            const toAddressMatch = text.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
            const amountMatch = text.match(/([\d.]+)\s*SOL/i);

            const solToAddress = toAddressMatch ? toAddressMatch[1] : null;
            const amountStr = amountMatch ? amountMatch[1] : null;
            console.log(solToAddress, amountStr)
            const wallet = user.wallets[index]
            if (amountStr !== null) {
                const amount = Number(amountStr)
                bot.sendMessage(chatId, `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟡 ${await t('withdrawal.p2', userId)}</em></strong>
${amount} SOL ⇄ <code>${solToAddress}  </code>

<strong><em>🟡 ${await t('withdrawal.p3', userId)}</em> — ${await t('withdrawal.p4', userId)}</strong>`, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('withdrawal.view', userId)}`, url: `https://solscan.io/tx/` }
                            ]
                        ]
                    }
                })

                let decrypted: string;
                try {
                    decrypted = decryptSecretKey(wallet.secretKey);
                } catch (error: any) {
                    console.error(`[${new Date().toLocaleString()}] ❌ Failed to decrypt wallet secret key for wallet ${wallet.publicKey}:`, error.message);
                    bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)} - ${await t('errors.decryptionFailed', userId) || 'Decryption failed. Please re-import this wallet.'}`);
                    return;
                }

                let senderKeypair: Keypair;
                try {
                    senderKeypair = Keypair.fromSecretKey(bs58.decode(decrypted));
                } catch (error: any) {
                    console.error(`[${new Date().toLocaleString()}] ❌ Failed to create keypair from decrypted key for wallet ${wallet.publicKey}:`, error.message);
                    bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)} - ${await t('errors.invalidKeyFormat', userId) || 'Invalid key format. Please re-import this wallet.'}`);
                    return;
                }

                const receiverPublicKey = new PublicKey(solToAddress || '')

                const balance = await connection.getBalance(senderKeypair.publicKey);
                const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
                const maxSendable = Math.max(balance - rentExempt - 10000, 0);

                let amountInLamports = Math.floor((amount || 0) * LAMPORTS_PER_SOL);
                if (amountInLamports > maxSendable) {
                    amountInLamports = maxSendable;
                }

                if (amountInLamports <= 0) {
                    throw new Error("Not enough balance to send after rent exemption.");
                }

                console.log('Sending (lamports):', amountInLamports);

                const latestBlockhash = await connection.getLatestBlockhash("finalized");

                const instructions = [
                    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2000 }),
                    ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
                    SystemProgram.transfer({
                        fromPubkey: senderKeypair.publicKey,
                        toPubkey: receiverPublicKey,
                        lamports: amountInLamports,
                    }),
                ];

                const message = new TransactionMessage({
                    payerKey: senderKeypair.publicKey,
                    recentBlockhash: latestBlockhash.blockhash,
                    instructions,
                }).compileToV0Message();

                const tx = new VersionedTransaction(message);
                tx.sign([senderKeypair]);

                const sim = await connection.simulateTransaction(tx, {
                    sigVerify: false,
                    replaceRecentBlockhash: true,
                });
                if (sim.value.err) {
                    console.error("Simulation failed:", sim.value.err);
                    throw new Error("Simulation failed");
                }

                console.log("Simulation OK. Sending transaction...");

                const signature = await connection.sendRawTransaction(tx.serialize(), {
                    skipPreflight: false,
                    preflightCommitment: "processed",
                });
                console.log("Tx signature:", signature);

                const confirmation = await connection.confirmTransaction(
                    {
                        signature,
                        blockhash: latestBlockhash.blockhash,
                        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
                    },
                    "confirmed"
                );
                if (confirmation.value.err) {
                    bot.sendMessage(chatId, `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🔴 ${await t('withdrawal.p2', userId)}</em></strong>
${amount} SOL ⇄ <code>${solToAddress}</code>

<strong><em>🔴 ${await t('withdrawal.p5', userId)}</em> — <a href="https://solscan.io/tx/${signature}">${await t('withdrawal.p4', userId)}</a></strong>`, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${await t('withdrawal.view', userId)}`, url: `https://solscan.io/tx/${signature}` }
                                ]
                            ]
                        }
                    })
                    sendWalletsMessageWithImage(bot, chatId, userId, messageId);
                } else {
                    bot.sendMessage(chatId, `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟢 ${await t('withdrawal.p2', userId)}</em></strong>
${amount} SOL ⇄ <code>${solToAddress}</code>

<strong><em>🟢 ${await t('withdrawal.p6', userId)}</em> — <a href="https://solscan.io/tx/${signature}">${await t('withdrawal.p4', userId)}</a></strong>`, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${await t('withdrawal.view', userId)}`, url: `https://solscan.io/tx/${signature}` }
                                ]
                            ]
                        }
                    })
                    sendWalletsMessageWithImage(bot, chatId, userId, messageId);
                }
            } else {
                bot.sendMessage(chatId, `${await t('errors.invalidWithdrawal', userId)}`)
            }

        } else if (sel_action?.startsWith('wallets_withdraw_')) {
            const index = Number(sel_action.split('wallets_withdraw_')[1])
            if (!isNaN(index)) {
                const userChain = await getUserChain(userId);
                const withdrawMessage = userChain === "ethereum"
                    ? await t('messages.withdraw1_ethereum', userId)
                    : await t('messages.withdraw1', userId);
                const wallet = userChain === "ethereum" ? user.ethereumWallets[index] : user.wallets[index];

                if (!wallet) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }

                bot.sendMessage(chatId, withdrawMessage)
                    .then((sentMessage1) => {
                        bot.once('text', createUserTextHandler(userId, async (reply) => {
                            const amount = Number(reply.text || "");
                            if (isNaN(amount) || amount <= 0) {
                                bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)}`);
                                return;
                            }

                            await safeDeleteMessage(bot, chatId, reply.message_id);
                            bot.deleteMessage(chatId, sentMessage1.message_id).catch(() => { });

                            if (userChain === "ethereum") {
                                const balance = await getEthereumBalance(wallet.publicKey);
                                const maxSendable = balance;

                                if (amount > balance) {
                                    bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)} - ${await t('subscribe.insufficientEth', userId)}`);
                                    return;
                                }

                                bot.sendMessage(chatId, `${await t('messages.withdraw2', userId)}`)
                                    .then(sentMessage2 => {
                                        bot.once('text', createUserTextHandler(userId, async neewReply => {
                                            const address = neewReply.text?.trim() || '';

                                            bot.deleteMessage(chatId, neewReply.message_id).catch(() => { });
                                            bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => { });

                                            if (isEvmAddress(address)) {
                                                const currencySymbol = await t('currencySymbol_ethereum', userId);
                                                bot.sendMessage(chatId, `<strong>${await t('withdrawal.p7', userId)}
${await t('messages.fee', userId)}

• ${await t('withdrawal.p8', userId)} : <code>${wallet.publicKey.slice(0, 6)}...${wallet.publicKey.slice(-4)} — ${wallet.label}</code>
• ${await t('withdrawal.p9', userId)} : <code>${address}</code>

• ${await t('withdrawal.p10', userId)} <code>${amount} ${currencySymbol}</code>

${await t('withdrawal.p11', userId)}</strong>`, {
                                                    parse_mode: 'HTML',
                                                    reply_markup: {
                                                        inline_keyboard: [
                                                            [
                                                                { text: `${await t('withdrawal.confirm', userId)}`, callback_data: `wallets_withdraw_confirm_${index}_${address}_${amount}` },
                                                                { text: `${await t('backWallet', userId)}`, callback_data: 'wallets_back' }
                                                            ]
                                                        ]
                                                    }
                                                })
                                            } else {
                                                bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)}`)
                                            }
                                        }));
                                    });
                            } else {
                                let decrypted: string;
                                try {
                                    decrypted = decryptSecretKey(wallet.secretKey);
                                } catch (error: any) {
                                    console.error(`[${new Date().toLocaleString()}] ❌ Failed to decrypt wallet secret key for wallet ${wallet.publicKey}:`, error.message);
                                    bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)} - ${await t('errors.decryptionFailed', userId) || 'Decryption failed. Please re-import this wallet.'}`);
                                    return;
                                }

                                let senderKeypair: Keypair;
                                try {
                                    senderKeypair = Keypair.fromSecretKey(bs58.decode(decrypted));
                                } catch (error: any) {
                                    console.error(`[${new Date().toLocaleString()}] ❌ Failed to create keypair from decrypted key for wallet ${wallet.publicKey}:`, error.message);
                                    bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)} - ${await t('errors.invalidKeyFormat', userId) || 'Invalid key format. Please re-import this wallet.'}`);
                                    return;
                                }

                                const balance = await connection.getBalance(senderKeypair.publicKey);
                                const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
                                const availableLamports = Math.max(amount * LAMPORTS_PER_SOL - rentExempt - 10000, 0);
                                const maxSendable = (availableLamports / LAMPORTS_PER_SOL) > 0 ? availableLamports / LAMPORTS_PER_SOL : 0;

                                bot.sendMessage(chatId, `${await t('messages.withdraw2', userId)}`)
                                    .then(sentMessage2 => {
                                        bot.once('text', createUserTextHandler(userId, async neewReply => {
                                            const address = neewReply.text || ''

                                            bot.deleteMessage(chatId, neewReply.message_id).catch(() => { });
                                            bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => { });

                                            if (isValidSolanaAddress(address)) {
                                                const currencySymbol = await t('currencySymbol_solana', userId);
                                                bot.sendMessage(chatId, `<strong>${await t('withdrawal.p7', userId)}
${await t('messages.fee', userId)}

• ${await t('withdrawal.p8', userId)} : <code>${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)} — ${wallet.label}</code>
• ${await t('withdrawal.p9', userId)} : <code>${address}</code>

• ${await t('withdrawal.p10', userId)} <code>${maxSendable} ${currencySymbol}</code>

${await t('withdrawal.p11', userId)}</strong>`, {
                                                    parse_mode: 'HTML',
                                                    reply_markup: {
                                                        inline_keyboard: [
                                                            [
                                                                { text: `${await t('withdrawal.confirm', userId)}`, callback_data: `wallets_withdraw_confirm_${index}` },
                                                                { text: `${await t('backWallet', userId)}`, callback_data: 'wallets_back' }
                                                            ]
                                                        ]
                                                    }
                                                })
                                            } else {
                                                bot.sendMessage(chatId, `${await t('errors.invalidwallet', userId)}`)
                                            }
                                        }));
                                    });
                            }
                        }));
                    });
            }
        }
        if (
            sel_action === "wallets_switch" ||
            sel_action === "wallets_switch_refresh"
        ) {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendSwitchEthereumWalletsMessage(bot, chatId, userId, messageId);
            } else {
                sendSwitchWalletsMessage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "wallets_create") {
            const userChain = await getUserChain(userId);
            const maxSolana = (settings as { walletsSolana?: number }).walletsSolana ?? settings.wallets;
            const maxEthereum = (settings as { walletsEthereum?: number }).walletsEthereum ?? settings.wallets;
            if (userChain === "ethereum") {
                const count = (user.ethereumWallets || []).length;
                if (count >= maxEthereum) {
                    await bot.sendMessage(chatId, `${await t('errors.walletLimitEthereum', userId)} ${maxEthereum} Ethereum wallets.`);
                    return;
                }
                getCreateEthereumWallet(bot, chatId, userId);
            } else {
                const count = (user.wallets || []).length;
                if (count >= maxSolana) {
                    await bot.sendMessage(chatId, `${await t('errors.walletLimitSolana', userId)} ${maxSolana} Solana wallets.`);
                    return;
                }
                getCreateWallet(bot, chatId, userId);
            }
            return;
        }

        if (sel_action === 'wallets_import') {
            const userChain = await getUserChain(userId);
            const maxSolana = (settings as { walletsSolana?: number }).walletsSolana ?? settings.wallets;
            const maxEthereum = (settings as { walletsEthereum?: number }).walletsEthereum ?? settings.wallets;
            if (userChain === "ethereum") {
                const count = (user.ethereumWallets || []).length;
                if (count >= maxEthereum) {
                    await bot.sendMessage(chatId, `${await t('errors.walletLimitEthereum', userId)} ${maxEthereum} Ethereum wallets.`);
                    return;
                }
                getImportEthereumWallet(bot, chatId, userId);
            } else {
                const count = (user.wallets || []).length;
                if (count >= maxSolana) {
                    await bot.sendMessage(chatId, `${await t('errors.walletLimitSolana', userId)} ${maxSolana} Solana wallets.`);
                    return;
                }
                getImportWallet(bot, chatId, userId);
            }
            return;
        }

        if (sel_action?.startsWith("wallets_switch_index_")) {
            const index = Number(sel_action.split("wallets_switch_index_")[1]);
            const userChain = await getUserChain(userId);

            if (userChain === "ethereum") {
                user.ethereumWallets.forEach(w => w.is_active_wallet = false);
                if (user.ethereumWallets[index]) {
                    user.ethereumWallets[index].is_active_wallet = true;
                }
                await user.save();
                editSwitchEthereumWalletsMessage(bot, chatId, userId, messageId);
            } else {
                active_wallet.is_active_wallet = false;
                wallets[index].is_active_wallet = true;
                await user.save();
                editSwitchWalletsMessage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "wallets_export") {
            const imagePath = "./src/assets/privateKey.jpg"; // Ensure the image is in this path
            await safeDeleteMessage(bot, chatId, messageId);
            bot.sendPhoto(chatId, imagePath, {
                caption: dangerZoneMessage,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: `${await t('cancel', userId)}`, callback_data: "wallets_export_cancel" },
                            { text: `${await t('dangerZoneMessage.exportPrivateKey', userId)}`, callback_data: "wallets_private_key" },
                        ],
                    ],
                },
            });
            return;
        }

        if (sel_action === "wallets_export_cancel") {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendEthereumWalletsMessageWithImage(bot, chatId, userId, messageId);
            } else {
                sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "wallets_private_key") {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendPrivateKeyEthereumWalletMessageWithImage(bot, chatId, userId, messageId);
            } else {
                sendPrivateKeyWalletMessageWithImage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action?.startsWith("wallets_private_key_")) {
            await safeDeleteMessage(bot, chatId, messageId);
            const index = Number(sel_action.split("wallets_private_key_")[1]);
            const userChain = await getUserChain(userId);
            const user = await User.findOne({ userId });

            let selectedWallet;
            if (userChain === "ethereum") {
                if (!user || !user.ethereumWallets || !user.ethereumWallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.invalidselection', userId)}`);
                    return;
                }
                selectedWallet = user.ethereumWallets[index];
            } else {
                if (!user || !user.wallets || !user.wallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.invalidselection', userId)}`);
                    return;
                }
                selectedWallet = user.wallets[index];
            }

            if (!selectedWallet) {
                bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                return;
            }

            const { secretKey, publicKey, label } = selectedWallet;
            let decrypted: string;
            try {
                decrypted = decryptSecretKey(secretKey);
            } catch (error: any) {
                console.error(`[${new Date().toLocaleString()}] ❌ Failed to decrypt wallet secret key for wallet ${publicKey}:`, error.message);
                bot.sendMessage(chatId, `${await t('errors.invalidsecretkey', userId)} - ${await t('errors.decryptionFailed', userId) || 'Decryption failed. Please re-import this wallet.'}`);
                return;
            }
            if (!decrypted || !publicKey) {
                bot.sendMessage(chatId, `${await t('errors.invalidsecretkey', userId)}`);
                return;
            }

            const userChain2 = await getUserChain(userId);
            const imagePath = "./src/assets/privateKey.jpg";
            function escapeMarkdownV2(text: string): string {
                return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            }
            const safeTxLink = userChain2 === "ethereum"
                ? escapeMarkdownV2(`https://etherscan.io/address/${publicKey}`)
                : escapeMarkdownV2(`https://solscan.io/account/${publicKey}`);
            const message = `[${await t('privateKey.p4', userId)}](${safeTxLink})`;

            bot.sendPhoto(
                chatId,
                imagePath,
                {
                    caption:
                        `*${await t('privateKey.p1', userId)}* *${label || "(no name)"}*\n
*${await t('privateKey.p2', userId)}* \`${publicKey}\`\n
${await t('privateKey.p3', userId)}
||${decrypted}|| 

_${message}_

__${await t('privateKey.p5', userId)}__
${await t('privateKey.p6', userId)}
${await t('privateKey.p7', userId)}`,
                    parse_mode: "MarkdownV2",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('privateKey.revealKey', userId)}`, callback_data: `copy_to_clipboard_${index}` },
                            ],
                        ],
                    },
                },
            );
            return;
        }

        if (sel_action?.startsWith("copy_to_clipboard_")) {
            await safeDeleteMessage(bot, chatId, messageId);
            const index = Number(sel_action.split("copy_to_clipboard_")[1]);
            const userChain = await getUserChain(userId);
            const user = await User.findOne({ userId });

            if (!user) {
                bot.sendMessage(chatId, `${await t('errors.invalidUser', userId)}`);
                return;
            }

            let selectedWallet;
            let scanBaseUrl: string;

            if (userChain === "ethereum") {
                if (!user.ethereumWallets || !user.ethereumWallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.invalidCopy1', userId)}`);
                    return;
                }
                selectedWallet = user.ethereumWallets[index];
                scanBaseUrl = "https://etherscan.io/address/";
            } else {
                if (!user.wallets || !user.wallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.invalidCopy1', userId)}`);
                    return;
                }
                selectedWallet = user.wallets[index];
                scanBaseUrl = "https://solscan.io/account/";
            }

            if (!selectedWallet) {
                bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                return;
            }

            const { secretKey, publicKey, label } = selectedWallet;
            let decrypted: string;
            try {
                decrypted = decryptSecretKey(secretKey);
            } catch (error: any) {
                console.error(`[${new Date().toLocaleString()}] ❌ Failed to decrypt wallet secret key for wallet ${publicKey}:`, error.message);
                bot.sendMessage(chatId, `${await t('errors.invalidCopy2', userId)} - ${await t('errors.decryptionFailed', userId) || 'Decryption failed. Please re-import this wallet.'}`);
                return;
            }

            if (!decrypted) {
                bot.sendMessage(chatId, `${await t('errors.invalidCopy2', userId)}`);
                return;
            }

            const imagePath = "./src/assets/privateKey.jpg";
            function escapeMarkdownV2(text: string): string {
                return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            }
            const safeTxLink = escapeMarkdownV2(`${scanBaseUrl}${publicKey}`);
            const message = `[${await t('privateKey.p4', userId)}](${safeTxLink})`;

            bot.sendPhoto(
                chatId,
                imagePath,
                {
                    caption:
                        `*${await t('privateKey.p1', userId)}* *${label || "(no name)"}*\n
*${await t('privateKey.p2', userId)}* \`${publicKey}\`\n
${await t('privateKey.p3', userId)}
\`${decrypted}\` 

_${message}_

__${await t('privateKey.p5', userId)}__
${await t('privateKey.p6', userId)}
${await t('privateKey.p7', userId)}`,
                    parse_mode: "MarkdownV2",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('privateKey.deleteMessage', userId)}`, callback_data: "wallets_export_confirm_delete" },
                            ],
                        ],
                    },
                },
            );
            return;
        }

        if (sel_action === "wallets_export_confirm_delete") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            return;
        }

        if (sel_action === "wallets_rename") {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendRenameEthereumWalletMessage(bot, chatId, userId, messageId);
            } else {
                sendRenameWalletMessage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action?.startsWith("wallets_rename_")) {
            const index = Number(sel_action.split("wallets_rename_")[1]);
            const userChain = await getUserChain(userId);
            bot.sendMessage(
                chatId,
                `${await t('messages.renameWallet1', userId)}`,
                { reply_markup: { force_reply: true } },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const newName = reply.text?.trim();
                        if (!newName) {
                            bot.sendMessage(chatId, `${await t('errors.invalidwWalletName1', userId)}`);
                        } else {
                            if (userChain === "ethereum") {
                                if (user.ethereumWallets[index]) {
                                    user.ethereumWallets[index].label = newName;
                                }
                            } else {
                                if (user.wallets[index]) {
                                    user.wallets[index].label = newName;
                                }
                            }
                            await user.save();
                            const sent = await bot.sendMessage(
                                chatId,
                                `${await t('messages.renameWallet2', userId)} "<b>${newName}</b>".`,
                                { parse_mode: "HTML" }
                            );
                            setTimeout(() => {
                                bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                            }, 5000);
                            if (userChain === "ethereum") {
                                editRenameEthereumWalletMessage(bot, chatId, userId, messageId);
                            } else {
                                editRenameWalletMessage(bot, chatId, userId, messageId);
                            }
                        }
                        await safeDeleteMessage(bot, chatId, sentMessage.message_id);
                        await safeDeleteMessage(bot, chatId, reply.message_id);
                    }));
            });
            return;
        }

        if (sel_action === "wallets_delete") {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendDeleteEthereumWalletMessage(bot, chatId, userId, messageId);
            } else {
                sendDeleteWalletMessage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "wallets_delete_cancel") {
            await safeDeleteMessage(bot, chatId, messageId);
            return;
        }

        if (sel_action === "wallets_back") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendEthereumWalletsMessageWithImage(bot, chatId, userId, messageId);
            } else {
                sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "wallets_default") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                sendDefaultEthereumWalletMessage(bot, chatId, userId, messageId);
            } else {
                sendDefaultWalletMessage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action?.startsWith("wallets_default_")) {
            const index = Number(sel_action.split("wallets_default_")[1]);
            const userChain = await getUserChain(userId);
            const user = await User.findOne({ userId });

            if (!user) {
                bot.sendMessage(chatId, `${await t('errors.invalidUser', userId)}`);
                return;
            }

            if (userChain === "ethereum") {
                if (!user.ethereumWallets || !user.ethereumWallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                user.ethereumWallets.forEach(w => w.is_active_wallet = false);
                user.ethereumWallets[index].is_active_wallet = true;
                await user.save();
                editDefaultEthereumWalletMessage(bot, chatId, userId, messageId);
            } else {
                if (!user.wallets || !user.wallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                user.wallets.forEach(w => w.is_active_wallet = false);
                user.wallets[index].is_active_wallet = true;
                await user.save();
                editDefaultWalletMessage(bot, chatId, userId, messageId);
            }
            return;
        }

        if (sel_action === "bundled_wallets") {
            const user = await User.findOne({ userId });
            if (user && user.chain === "ethereum") {
                await bot.answerCallbackQuery(callbackQueryId, { text: "Bundle functions are only available for Solana" });
                return;
            }
            await bundleWalletMenu.showBundleWalletMenu(User, callbackQuery, cleanupUserTextHandler, createUserTextHandler);
            return;
        }

        if (sel_action === "bundle_view") {
            await bundleWalletMenu.viewBundleWallets(User, callbackQuery);
            return;
        }

        if (sel_action === "bundle_create_menu") {
            await bundleWalletMenu.showCreateWalletPrompt(callbackQuery, cleanupUserTextHandler, createUserTextHandler);
            return;
        }

        if (sel_action?.startsWith("bundle_create_")) {
            await bundleWalletMenu.createBundleWallets(User, callbackQuery);
            return;
        }

        if (sel_action === "bundle_fund") {
            await bundleWalletMenu.fundBundleWallets(User, callbackQuery);
            return;
        }

        if (sel_action === "bundle_withdraw") {
            await bundleWalletMenu.withdrawFromBundles(User, callbackQuery, createUserTextHandler);
            return;
        }

        if (sel_action === "bundle_reset") {
            await bundleWalletMenu.resetBundledWallets(User, callbackQuery, createUserTextHandler);
            return;
        }

        if (sel_action === "bundle_keys_delete") {
            await safeDeleteMessage(bot, chatId, messageId);
            return;
        }

        if (sel_action?.startsWith("wallets_delete_confirm_")) {
            const indexStr = sel_action.replace("wallets_delete_confirm_", "");
            const index = parseInt(indexStr, 10);
            const userChain = await getUserChain(userId);

            if (userChain === "ethereum") {
                if (isNaN(index) || index < 0 || index >= (user.ethereumWallets?.length || 0)) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                if (!user || !user.ethereumWallets || user.ethereumWallets.length === 1) {
                    const error = await bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    setTimeout(async () => {
                        bot.deleteMessage(chatId, error.message_id);
                    }, 5000);
                    return;
                }
                const wallet = user.ethereumWallets[index];
                user.ethereumWallets.splice(index, 1);
                await user.save();
                const sent = await bot.sendMessage(
                    chatId,
                    `${await t('messages.deleteWallet1', userId)} "<b>${wallet.label}</b>" ${await t('messages.deleteWallet2', userId)}\n\n${await t('messages.deleteWallet3', userId)}`,
                    { parse_mode: "HTML" }
                );
                if (messageId > 0) {
                    try {
                        await bot.deleteMessage(chatId, messageId);
                    } catch (e) { }
                }
                setTimeout(() => {
                    bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                }, 5000);
                const userChain2 = await getUserChain(userId);
                if (userChain2 === "ethereum") {
                    sendDeleteEthereumWalletMessage(bot, chatId, userId, messageId);
                } else {
                    sendDeleteWalletMessage(bot, chatId, userId, messageId);
                }
                return;
            } else {
                if (isNaN(index) || index < 0 || index >= user.wallets.length) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                if (!user || !user.wallets || user.wallets.length === 1) {
                    const error = await bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    setTimeout(async () => {
                        bot.deleteMessage(chatId, error.message_id);
                    }, 5000);
                    return;
                }
                const wallet = user.wallets[index];
                user.wallets.splice(index, 1);
                await user.save();
                const sent = await bot.sendMessage(
                    chatId,
                    `${await t('messages.deleteWallet1', userId)} "<b>${wallet.label}</b>" ${await t('messages.deleteWallet2', userId)}\n\n${await t('messages.deleteWallet3', userId)}`,
                    { parse_mode: "HTML" }
                );
                if (messageId > 0) {
                    try {
                        await bot.deleteMessage(chatId, messageId);
                    } catch (e) { }
                }
                setTimeout(() => {
                    bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                }, 5000);
                sendDeleteWalletMessage(bot, chatId, userId, messageId);
                return;
            }
        }

        if (sel_action?.match(/^wallets_delete_\d+$/)) {
            await safeDeleteMessage(bot, chatId, messageId);
            const index = Number(sel_action.split("wallets_delete_")[1]);
            const userChain = await getUserChain(userId);

            let wallet;
            if (userChain === "ethereum") {
                if (!user || !user.ethereumWallets || !user.ethereumWallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                wallet = user.ethereumWallets[index];
            } else {
                if (!user || !user.wallets || !user.wallets[index]) {
                    bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                    return;
                }
                wallet = user.wallets[index];
            }
            if (!wallet) {
                bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                return;
            }
            const imagePath = "./src/assets/deletewallet.jpg";
            bot.sendPhoto(
                chatId,
                imagePath,
                {
                    caption: `${await t('deleteWallet.p3', userId)} "${wallet.label}" ?\n\n${await t('deleteWallet.p4', userId)}`,
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: `${await t('cancel', userId)}`, callback_data: "wallets_delete_cancel" },
                                { text: `${await t('deleteWallet.delete', userId)}`, callback_data: `wallets_delete_confirm_${index}` },
                            ],
                        ],
                    },
                },
            );
            return;
        }

        if (sel_action == "positions") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const ethWallets = user?.ethereumWallets || [];
                sendEthereumPositionsMessageWithImage(
                    bot,
                    chatId,
                    userId,
                    messageId,
                    0,
                    0,
                    ethWallets[0]?.label || "Wallet",
                );
            } else {
                sendPositionsMessageWithImage(bot, chatId, userId, messageId, 0, 0, wallets[0].label);
            }
        }

        if (sel_action?.startsWith('positions_refresh_eth_')) {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }

            const index = Number(sel_action.split('positions_refresh_eth_')[1])
            const ethWallets = user?.ethereumWallets || [];
            if (ethWallets[index]) {
                editEthereumPositionsMessage(bot, chatId, userId, messageId, index, 0, ethWallets[index].label)
            }
            return;
        }

        if (sel_action?.startsWith('positions_refresh_')) {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            if (!spamData) {
                console.log("New user, initializing...");
                spamData = { count: 1, lastReset: now };
            } else {
                const diff = now - spamData.lastReset;
                console.log(`⏱ Time since last reset: ${diff} ms`);

                if (diff > SPAM_WINDOW_MS) {
                    console.log("⏰ Resetting count due to time window");
                    spamData.count = 1;
                    spamData.lastReset = now;
                } else {
                    spamData.count += 1;
                }
            }

            userRefreshCounts.set(userId, spamData);
            console.log(`User ${userId} refresh count: ${spamData.count}`);

            if (spamData.count >= SPAM_LIMIT) {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: `${await t('messages.refreshwarning', userId)}\n${await t('messages.refreshLimit', userId)}`,
                    show_alert: true
                });
                return;
            }

            const index = Number(sel_action.split('positions_refresh_')[1])

            editPositionsMessage(bot, chatId, userId, messageId, index, 0, wallets[index].label)
            return;
        }

        if (sel_action?.startsWith('buyToken_')) {
            const _buytoken = sel_action.replace("buyToken_", "");
            const { caption, markup } = await getBuy(userId, _buytoken);
            bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup: markup,
            });
        }
        if (sel_action?.startsWith('sellToken_')) {
            const _selltoken = sel_action.replace("sellToken_", "");
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum" && _selltoken.startsWith("eth_")) {
                // Ethereum sell
                const tokenAddress = _selltoken.replace("eth_", "");
                const { Sell } = await import("./commands/ethereum/sell");
                await Sell(bot, chatId, userId, tokenAddress);
            } else {
                // Solana sell
                const { caption, markup } = await getSell(userId, _selltoken);
                bot.sendMessage(chatId, caption, {
                    parse_mode: "HTML",
                    reply_markup: markup,
                });
            }
        }

        // Ethereum positions handlers
        if (sel_action?.startsWith('positions_wallet_left_eth_')) {
            const index = Number(sel_action.split('positions_wallet_left_eth_')[1])
            const ethWallets = user?.ethereumWallets || [];
            if (!isNaN(index) && ethWallets[index]) {
                const newIndex = index === 0 ? ethWallets.length - 1 : index - 1
                const label = ethWallets[newIndex].label
                editEthereumPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith('positions_wallet_right_eth_')) {
            const index = Number(sel_action.split('positions_wallet_right_eth_')[1]);
            const ethWallets = user?.ethereumWallets || [];
            if (!isNaN(index) && ethWallets[index]) {
                const newIndex = (index + 1) % ethWallets.length;
                const label = ethWallets[newIndex].label;
                editEthereumPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith(`positions_page_left_eth_`)) {
            const indexNumbers = sel_action.match(/\d+/g);
            const ethWallets = user?.ethereumWallets || [];
            if (indexNumbers) {
                const current_wallet = Number(indexNumbers[0])
                const page = Number(indexNumbers[1])
                const label = ethWallets[current_wallet]?.label || "Wallet"
                if (!isNaN(current_wallet) && !isNaN(page) && ethWallets[current_wallet]) {
                    editEthereumPositionsMessage(bot, chatId, userId, messageId, current_wallet, page - 1, label)
                }
            }
        } else if (sel_action?.startsWith('positions_page_right_eth_')) {
            const indexNumbers = sel_action.match(/\d+/g);
            const ethWallets = user?.ethereumWallets || [];
            if (indexNumbers) {
                const current_wallet = Number(indexNumbers[0])
                const page = Number(indexNumbers[1])
                const label = ethWallets[current_wallet]?.label || "Wallet"
                if (!isNaN(current_wallet) && !isNaN(page) && ethWallets[current_wallet]) {
                    editEthereumPositionsMessage(bot, chatId, userId, messageId, current_wallet, page + 1, label)
                }
            }
        } else if (sel_action?.startsWith(`positions_import_eth_`)) {
            bot.sendMessage(
                chatId,
                `${await t('messages.positionImport1', userId)}`
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const address = reply.text || "";
                        const ethWallets = user?.ethereumWallets || [];

                        const indexNumbers = sel_action.match(/\d+/g);

                        if (indexNumbers) {
                            const current_wallet = Number(indexNumbers[0])
                            const page = Number(indexNumbers[1])
                            const currentWallet = ethWallets[current_wallet];
                            const label = currentWallet?.label || "Wallet"
                            const tradedTokenAddresses = (currentWallet?.tradeHistory || []).map((pos: any) => pos.token_address);

                            if (tradedTokenAddresses.some((_address: string) => _address.toLowerCase() === address.toLowerCase())) {
                                editEthereumPositionsMessage(bot, chatId, userId, messageId, current_wallet, page, label)
                            } else {
                                const sent = bot.sendMessage(
                                    chatId,
                                    `${await t('messages.positionImport2', userId)}`,
                                    { parse_mode: "HTML" })
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, (await sent).message_id);
                                }, 5000);
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }
                    }));
            });
            return;
        }

        // Solana positions handlers
        if (sel_action?.startsWith('positions_wallet_left_')) {
            const index = Number(sel_action.split('positions_wallet_left_')[1])
            if (!isNaN(index)) {
                const newIndex = index === 0 ? wallets.length - 1 : index - 1
                const label = wallets[newIndex].label
                editPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith('positions_wallet_right_')) {
            const index = Number(sel_action.split('positions_wallet_right_')[1]);
            if (!isNaN(index)) {
                const newIndex = (index + 1) % wallets.length;
                const label = wallets[newIndex].label;
                editPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith(`positions_page_left_`)) {
            const indexNumbers = sel_action.match(/\d+/g);
            if (indexNumbers) {
                const current_wallet = Number(indexNumbers[0])
                const page = Number(indexNumbers[1])
                const label = wallets[current_wallet].label
                if (!isNaN(current_wallet) && !isNaN(page)) {
                    editPositionsMessage(bot, chatId, userId, messageId, current_wallet, page - 1, label)
                }
            }
        }
        if (sel_action?.startsWith('positions_page_right_')) {
            const indexNumbers = sel_action.match(/\d+/g);
            if (indexNumbers) {
                const current_wallet = Number(indexNumbers[0])
                const page = Number(indexNumbers[1])
                const label = wallets[current_wallet].label
                if (!isNaN(current_wallet) && !isNaN(page)) {
                    editPositionsMessage(bot, chatId, userId, messageId, current_wallet, page + 1, label)
                }
            }
        }

        if (sel_action?.startsWith(`positions_import_`)) {
            bot.sendMessage(
                chatId,
                `${await t('messages.positionImport1', userId)}`
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const address = reply.text || "";
                        const wallet = user?.wallets;

                        const indexNumbers = sel_action.match(/\d+/g);

                        if (indexNumbers) {

                            const current_wallet = Number(indexNumbers[0])
                            const page = Number(indexNumbers[1])
                            const currentWallet = wallet[current_wallet];
                            const label = wallets[current_wallet].label
                            const tradedTokenAddresses = currentWallet.tradeHistory.map(pos => pos.token_address);

                            if (tradedTokenAddresses.some(_address => _address === address)) {
                                editPositionsMessage(bot, chatId, userId, messageId, current_wallet, page, label)
                            } else {
                                const sent = bot.sendMessage(
                                    chatId,
                                    `${await t('messages.positionImport2', userId)}`,
                                    { parse_mode: "HTML" })
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, (await sent).message_id);
                                }, 5000);
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }
                    }));
            });
            return;
        }

        // Setting
        if (sel_action === "settings") {
            await bot.answerCallbackQuery(callbackQueryId).catch(() => { });
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            sendSettingsMessageWithImage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_fee") {
            editFeeMessage(bot, chatId, userId, messageId);
        } else if (sel_action?.startsWith("settings_fee_gas_eth_")) {
            const index = Number(sel_action.split("settings_fee_gas_eth_")[1]);
            if (!isNaN(index) && index >= 0 && index < 3) {
                bot.sendMessage(
                    chatId,
                    `${await t('feeSettings.enterGasFee', userId)}`,
                ).then((sentMessage) => {
                    bot.once('text',
                        createUserTextHandler(userId, async (reply) => {
                            const gasValue = Number(reply.text || "");
                            if (isNaN(gasValue) || gasValue < 0) {
                                bot.sendMessage(
                                    chatId,
                                    `${await t('feeSettings.invalidGasFee', userId)}`,
                                ).then((newSentMessage) => {
                                    setTimeout(() => {
                                        safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                    }, 10000);
                                });
                            } else {
                                if (!user.settings.gas_values_eth) {
                                    user.settings.gas_values_eth = [10, 50, 100];
                                }
                                user.settings.gas_values_eth[index] = gasValue;
                                await user.save();
                                editFeeMessage(bot, chatId, userId, messageId);
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }),
                    );
                });
            }
        } else if (sel_action === "settings_fee_buy_fee" || sel_action === "settings_fee_sell_fee" || sel_action === "settings_fee_buy_tip" || sel_action === "settings_fee_sell_tip") {
            bot.sendMessage(
                chatId,
                `${await t('messages.feeinput', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                const handleReply = createUserTextHandler(userId, async function handleReply(reply) {
                    const feeValue = Number(reply.text || "");
                    if (isNaN(feeValue) || feeValue < 0 || feeValue > 1) {
                        bot.sendMessage(
                            chatId,
                            `${await t('errors.invalidFee', userId)}`,
                            // { reply_markup: { force_reply: true } }
                        ).then((newSentMessage) => {
                            setTimeout(() => {
                                bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                            }, 10000);
                            bot.once('text',
                                handleReply
                            );
                        });
                    } else {
                        switch (sel_action) {
                            case "settings_fee_buy_fee":
                                user.settings.fee_setting.buy_fee = feeValue;
                                break;
                            case "settings_fee_sell_fee":
                                user.settings.fee_setting.sell_fee = feeValue;
                                break;
                            case "settings_fee_buy_tip":
                                user.settings.fee_setting.buy_tip = feeValue;
                                break;
                            case "settings_fee_sell_tip":
                                user.settings.fee_setting.sell_tip = feeValue;
                                break;
                        }
                        await user.save();
                        editFeeMessage(bot, chatId, userId, messageId);
                    }
                    setTimeout(() => {
                        safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                        safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                    }, 5000);
                });
                bot.once('text', handleReply);
            });
        }

        if (sel_action === "settings_buy_slippage" || sel_action === "settings_sell_slippage" || sel_action === "settings_buy_slippage_eth" || sel_action === "settings_sell_slippage_eth") {
            await safeDeleteMessage(bot, chatId, messageId);
            sendSlippageMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "settings_buy_gas_eth" || sel_action === "settings_sell_gas_eth") {
            await safeDeleteMessage(bot, chatId, messageId);
            const { sendFeeMessage } = await import("./messages/solana/settings/fee");
            sendFeeMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "buy_gas_eth_0" || sel_action === "buy_gas_eth_1" || sel_action === "buy_gas_eth_2") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const gasIndex = Number(sel_action.split("buy_gas_eth_")[1]);
                if (!isNaN(gasIndex) && gasIndex >= 0 && gasIndex < 3) {
                    const gasValues = user.settings.gas_values_eth || [10, 50, 100];
                    const selectedGas = gasValues[gasIndex];

                    user.settings.option_gas_eth = selectedGas;
                    await user.save();

                    await bot.answerCallbackQuery(callbackQuery.id, {
                        text: `⛽ Gas set to ${selectedGas} Gwei`,
                    });

                    const refreshMessageId = user.manual_message_id || messageId;
                    if (refreshMessageId) {
                        try {
                            const { editBuyMessageWithAddress } = await import("./messages/ethereum/buy");
                            const messageText = text || caption || "";
                            const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                            const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                            if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                                await editBuyMessageWithAddress(bot, chatId, userId, refreshMessageId, ethTokenAddress);
                            } else {
                                await bot.answerCallbackQuery(callbackQuery.id, {
                                    text: "❌ Could not find Ethereum token address in message",
                                });
                            }
                        } catch (error) {
                            console.error('Error refreshing buy menu:', error);
                        }
                    }
                }
            }
        }

        if (sel_action === "sell_gas_eth_0" || sel_action === "sell_gas_eth_1" || sel_action === "sell_gas_eth_2") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const gasIndex = Number(sel_action.split("sell_gas_eth_")[1]);
                if (!isNaN(gasIndex) && gasIndex >= 0 && gasIndex < 3) {
                    const gasValues = user.settings.gas_values_eth || [10, 50, 100];
                    const selectedGas = gasValues[gasIndex];

                    user.settings.option_gas_eth = selectedGas;
                    await user.save();

                    await bot.answerCallbackQuery(callbackQuery.id, {
                        text: `⛽ Gas set to ${selectedGas} Gwei`,
                    });

                    const refreshMessageId = user.manual_message_id || messageId;
                    if (refreshMessageId) {
                        try {
                            const { editEthereumSellMessageWithAddress } = await import("./messages/ethereum/sell");
                            const messageText = text || caption || "";
                            const ethAddressMatch = messageText.match(/(0x[a-fA-F0-9]{40})/);
                            const ethTokenAddress = ethAddressMatch ? ethAddressMatch[1] : (tokenAddress && isEvmAddress(tokenAddress) ? tokenAddress : null);

                            if (ethTokenAddress && isEvmAddress(ethTokenAddress)) {
                                await editEthereumSellMessageWithAddress(bot, chatId, userId, refreshMessageId, ethTokenAddress);
                            } else {
                                await bot.answerCallbackQuery(callbackQuery.id, {
                                    text: "❌ Could not find Ethereum token address in message",
                                });
                            }
                        } catch (error) {
                            console.error('Error refreshing sell menu:', error);
                        }
                    }
                }
            }
        }

        if (sel_action === "settings_slippage") {
            editSlippageMessage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_slippage_buy" || sel_action === "settings_slippage_sell") {
            bot.sendMessage(
                chatId,
                `${await t('messages.slippageInput', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const slippageValue = Number(reply.text || "");
                        if (isNaN(slippageValue) || slippageValue < 0 || slippageValue > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSlippage', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newSlippageValue = Number(newReply.text || "");
                                        if (isNaN(newSlippageValue) || newSlippageValue < 0 || newSlippageValue > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidSlippage', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            switch (sel_action) {
                                                case "settings_slippage_buy":
                                                    user.settings.slippage.buy_slippage = newSlippageValue;
                                                    break;
                                                case "settings_slippage_sell":
                                                    user.settings.slippage.sell_slippage = newSlippageValue;
                                                    break;
                                            }
                                            await user.save();
                                            editSlippageMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            switch (sel_action) {
                                case "settings_slippage_buy":
                                    user.settings.slippage.buy_slippage = slippageValue;
                                    break;
                                case "settings_slippage_sell":
                                    user.settings.slippage.sell_slippage = slippageValue;
                                    break;
                            }
                            await user.save();
                            editSlippageMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "settings_slippage_buy_eth" || sel_action === "settings_slippage_sell_eth") {
            bot.sendMessage(
                chatId,
                `${await t('messages.slippageInput', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const slippageValueEth = Number(reply.text || "");
                        if (isNaN(slippageValueEth) || slippageValueEth < 0 || slippageValueEth > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSlippage', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newSlippageValueEth = Number(newReply.text || "");
                                        if (isNaN(newSlippageValueEth) || newSlippageValueEth < 0 || newSlippageValueEth > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidSlippage', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            switch (sel_action) {
                                                case "settings_slippage_buy_eth":
                                                    user.settings.slippage_eth.buy_slippage_eth = newSlippageValueEth;
                                                    break;
                                                case "settings_slippage_sell_eth":
                                                    user.settings.slippage_eth.sell_slippage_eth = newSlippageValueEth;
                                                    break;
                                            }
                                            await user.save();
                                            editSlippageMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            switch (sel_action) {
                                case "settings_slippage_buy_eth":
                                    user.settings.slippage_eth.buy_slippage_eth = slippageValueEth;
                                    break;
                                case "settings_slippage_sell_eth":
                                    user.settings.slippage_eth.sell_slippage_eth = slippageValueEth;
                                    break;
                            }
                            await user.save();
                            editSlippageMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "settings_mev") {
            user.settings.mev = !user.settings.mev;
            await user.save();
            editSettingsMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "settings_fee_auto") {
            editFeeAutoMessage(bot, chatId, userId, messageId)
        }

        if (sel_action === "settings_fee_auto_eth") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                editFeeAutoMessageEth(bot, chatId, userId, messageId);
            } else {
                editFeeAutoMessage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action === "young_token") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.youngInput', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 1 || date > 24) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidyoung', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 6000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 24) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidyoung', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.settings.youngTokenDate = newdate;
                                            await user.save();
                                            editSettingsMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.settings.youngTokenDate = date;
                            await user.save();
                            editSettingsMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === 'settings_quick_buy' || sel_action === 'settings_quick_buy_refresh') {
            await safeDeleteMessage(bot, chatId, messageId);
            sendQuickBuyMessage(bot, chatId, userId, messageId);
        }
        else if (sel_action?.startsWith('settings_quick_buy_amount_')) {
            const index = Number(sel_action?.split('settings_quick_buy_amount_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, `${await t('messages.quickBuy', userId)}`)
                    .then(sentMessage => {
                        bot.once('text', createUserTextHandler(userId, async reply => {
                            const buy_amount = Number(reply.text)
                            if (isNaN(buy_amount) || buy_amount < 0) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.invalidBuy', userId)}`)
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, errorMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                user.settings.quick_buy.buy_amount[index] = buy_amount
                                await user.save()
                                editQuickBuyMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }))
                    })
            }

        }

        if (sel_action === 'settings_quick_buy_eth' || sel_action === 'settings_quick_buy_eth_refresh') {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const { sendQuickBuyEthMessage } = await import("./messages/ethereum/settings/quick_buy");
                sendQuickBuyEthMessage(bot, chatId, userId, messageId);
            }
        } else if (sel_action?.startsWith('settings_quick_buy_eth_amount_')) {
            const index = Number(sel_action?.split('settings_quick_buy_eth_amount_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, (await t('quickBuy.enterBuyAmountEth', userId)).replace('{index}', (index + 1).toString()))
                    .then(sentMessage => {
                        bot.once('text', createUserTextHandler(userId, async reply => {
                            const buy_amount = Number(reply.text)
                            if (isNaN(buy_amount) || buy_amount < 0) {
                                const errorMessage = await bot.sendMessage(chatId, await t('quickBuy.invalidAmountEth', userId))
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, errorMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                if (!user.settings.quick_buy_eth) {
                                    user.settings.quick_buy_eth = { buy_amount_eth: [0.1, 0.2, 0.5, 1, 2] };
                                }
                                if (!user.settings.quick_buy_eth.buy_amount_eth) {
                                    user.settings.quick_buy_eth.buy_amount_eth = [0.1, 0.2, 0.5, 1, 2];
                                }
                                user.settings.quick_buy_eth.buy_amount_eth[index] = buy_amount
                                await user.save()
                                const { editQuickBuyEthMessage } = await import("./messages/ethereum/settings/quick_buy");
                                editQuickBuyEthMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }))
                    })
            }
        }

        if (sel_action === 'settings_quick_sell_eth' || sel_action === 'settings_quick_sell_eth_refresh') {
            await safeDeleteMessage(bot, chatId, messageId);
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                const { sendQuickSellEthMessage } = await import("./messages/ethereum/settings/quick_sell");
                sendQuickSellEthMessage(bot, chatId, userId, messageId);
            }
        } else if (sel_action?.startsWith('settings_quick_sell_eth_percent_')) {
            const index = Number(sel_action?.split('settings_quick_sell_eth_percent_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, `${await t('messages.quickSell', userId)}`)
                    .then(sentMessage => {
                        bot.once('text', createUserTextHandler(userId, async reply => {
                            const sell_percent = Number(reply.text)
                            if (isNaN(sell_percent) || sell_percent < 0 || sell_percent > 100) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.invalidSell', userId)}`)
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, errorMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                if (!user.settings.quick_sell_eth) {
                                    user.settings.quick_sell_eth = { sell_percent_eth: [10, 20, 50, 75, 100] };
                                }
                                if (!user.settings.quick_sell_eth.sell_percent_eth) {
                                    user.settings.quick_sell_eth.sell_percent_eth = [10, 20, 50, 75, 100];
                                }
                                user.settings.quick_sell_eth.sell_percent_eth[index] = sell_percent
                                await user.save()
                                const { editQuickSellEthMessage } = await import("./messages/ethereum/settings/quick_sell");
                                editQuickSellEthMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }))
                    })
            }
        }

        if (sel_action === 'settings_quick_sell' || sel_action === 'settings_quick_sell_refresh') {
            await safeDeleteMessage(bot, chatId, messageId);
            sendQuickSellMessage(bot, chatId, userId, messageId)
        } else if (sel_action?.startsWith('settings_quick_sell_percent_')) {
            const index = Number(sel_action?.split('settings_quick_sell_percent_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, `${await t('messages.quickSell', userId)}`)
                    .then(sentMessage => {
                        bot.once('text', createUserTextHandler(userId, async reply => {
                            const sell_percent = Number(reply.text)
                            if (isNaN(sell_percent) || sell_percent < 0 || sell_percent > 100) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.invalidSell', userId)}`)
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, errorMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                user.settings.quick_sell.sell_percent[index] = sell_percent
                                await user.save()
                                editQuickSellMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                                safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                            }, 5000);
                        }))
                    })
            }

        }

        if (sel_action === "settings_back") {
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            sendSettingsMessageWithImage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_fee_back") {
            cleanupUserTextHandler(userId);
            editFeeMessage(bot, chatId, userId, messageId);
        } else if (sel_action === "autotip_refresh") {
            editFeeAutoMessage(bot, chatId, userId, messageId);
        } else if (sel_action === "autogas_refresh") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                editFeeAutoMessageEth(bot, chatId, userId, messageId);
            } else {
                editFeeAutoMessage(bot, chatId, userId, messageId);
            }
        }

        if (sel_action === "speed_low" || sel_action === "speed_medium" || sel_action === "speed_high") {
            switch (sel_action) {
                case "speed_low":
                    user.settings.auto_tip = "medium";
                    break;
                case "speed_medium":
                    user.settings.auto_tip = "high";
                    break;
                case "speed_high":
                    user.settings.auto_tip = "veryHigh";
                    break;
            }
            await user.save();
            editFeeAutoMessage(bot, chatId, userId, messageId);
        }

        // Ethereum gas speed settings
        if (sel_action === "speed_gas_low" || sel_action === "speed_gas_medium" || sel_action === "speed_gas_high" || sel_action === "speed_gas_veryHigh") {
            const userChain = await getUserChain(userId);
            if (userChain === "ethereum") {
                let newSpeed: "low" | "medium" | "high" | "veryHigh" = "medium";
                switch (sel_action) {
                    case "speed_gas_low":
                        (user.settings as any).auto_gas_eth = "low";
                        newSpeed = "low";
                        break;
                    case "speed_gas_medium":
                        (user.settings as any).auto_gas_eth = "medium";
                        newSpeed = "medium";
                        break;
                    case "speed_gas_high":
                        (user.settings as any).auto_gas_eth = "high";
                        newSpeed = "high";
                        break;
                    case "speed_gas_veryHigh":
                        (user.settings as any).auto_gas_eth = "veryHigh";
                        newSpeed = "veryHigh";
                        break;
                }
                await user.save();
                // Refetch user to ensure we have latest data
                const updatedUser = await User.findOne({ userId });
                if (updatedUser) {
                    editFeeAutoMessageEth(bot, chatId, userId, messageId);
                }
            }
        }

        if (sel_action === "settings_refresh") {
            editFeeMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "settings_image") {
            user.settings.image_activation = !user.settings.image_activation;
            await user.save();
            editSettingsMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "settings_auto_sell") {
            sendAutoSellMessage(bot, chatId, userId, messageId);
            await safeDeleteMessage(bot, chatId, messageId);
        }
        if (sel_action === "settings_auto_Sell_toggle") {
            const { getUserChain } = await import("./utils/chain");
            const userChain = await getUserChain(userId);
            const isEthereum = userChain === "ethereum";
            
            if (isEthereum) {
                user.settings.auto_sell.enabled_ethereum = !(user.settings.auto_sell?.enabled_ethereum ?? false);
            } else {
                user.settings.auto_sell.enabled_solana = !(user.settings.auto_sell?.enabled_solana ?? false);
            }
            await user.save();
            editMessageReplyMarkup(bot, chatId, userId, messageId);
        }
        if (sel_action === "settings_auto_Sell_wallets") {
            if (user.wallets.length > 0) {
                user.wallets.forEach(wallet => wallet.is_active_wallet = false);
                user.wallets[0].is_active_wallet = true;
                await user.save();
                editSwitchWalletsMessage(bot, chatId, userId, messageId);
            } else {
                bot.sendMessage(chatId, `${await t('errors.invalidAutoWallet', userId)}`);
            }
            return;
        }

        if (sel_action === "settings_auto_Sell_tp_sl") {
            editprofitLevelMessage(bot, chatId, userId, messageId)
        }

        if (sel_action === "autoSell_tp") {
            const userChain = await getUserChain(userId);
            const sentMessage = await bot.sendMessage(
                chatId,
                `${await t('messages.tp', userId)}`
            );

            bot.once('text', createUserTextHandler(userId, async (reply) => {
                const TpPercent = Number(reply.text || "");
                await bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                await bot.deleteMessage(chatId, reply.message_id).catch(() => { });

                if (isNaN(TpPercent) || TpPercent <= 0 || TpPercent > 100) {
                    const errorMessage = await bot.sendMessage(
                        chatId,
                        `${await t('errors.invalidTp', userId)}`
                    );

                    setTimeout(() => {
                        bot.deleteMessage(chatId, errorMessage.message_id).catch(() => { });
                    }, 10000);

                    bot.once('text', createUserTextHandler(userId, async (newReply) => {
                        const newTpPercent = Number(newReply.text || "");
                        await bot.deleteMessage(chatId, newReply.message_id).catch(() => { });

                        if (isNaN(newTpPercent) || newTpPercent <= 0 || newTpPercent > 100) {
                            await bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidTp', userId)}`
                            );
                        } else {
                            // Save to chain-specific field
                            if (userChain === "ethereum") {
                                user.settings.auto_sell.takeProfitPercent_ethereum = newTpPercent;
                            } else {
                                user.settings.auto_sell.takeProfitPercent_solana = newTpPercent;
                            }
                            await user.save();
                            editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                        }
                    }));
                } else {
                    // Save to chain-specific field
                    if (userChain === "ethereum") {
                        user.settings.auto_sell.takeProfitPercent_ethereum = TpPercent;
                    } else {
                        user.settings.auto_sell.takeProfitPercent_solana = TpPercent;
                    }
                    await user.save();
                    editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                }
            }));

            return;
        }

        if (sel_action === "autoSell_sl") {
            const userChain = await getUserChain(userId);
            const sentMessage = await bot.sendMessage(
                chatId,
                `${await t('messages.sl', userId)}`
            );

            bot.once('text', createUserTextHandler(userId, async (reply) => {
                const SlPercent = Number(reply.text || "");
                await bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                await bot.deleteMessage(chatId, reply.message_id).catch(() => { });

                if (isNaN(SlPercent) || SlPercent >= 0 || SlPercent < -100) {
                    const errorMessage = await bot.sendMessage(
                        chatId,
                        `${await t('errors.invalidSl', userId)}`
                    );

                    setTimeout(() => {
                        bot.deleteMessage(chatId, errorMessage.message_id).catch(() => { });
                    }, 10000);

                    bot.once('text', createUserTextHandler(userId, async (newReply) => {
                        const newSlPercent = Number(newReply.text || "");
                        await bot.deleteMessage(chatId, newReply.message_id).catch(() => { });

                        if (isNaN(newSlPercent) || newSlPercent >= 0 || newSlPercent < -100) {
                            await bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSl', userId)}`
                            );
                        } else {
                            // Save to chain-specific field
                            if (userChain === "ethereum") {
                                user.settings.auto_sell.stopLossPercent_ethereum = newSlPercent;
                            } else {
                                user.settings.auto_sell.stopLossPercent_solana = newSlPercent;
                            }
                            await user.save();
                            editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                        }
                    }));
                } else {
                    // Save to chain-specific field
                    if (userChain === "ethereum") {
                        user.settings.auto_sell.stopLossPercent_ethereum = SlPercent;
                    } else {
                        user.settings.auto_sell.stopLossPercent_solana = SlPercent;
                    }
                    await user.save();
                    editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                }
            }));
            return;
        }

        if (sel_action === "settings_language") {
            try {
                await bot.editMessageCaption(
                    `${await t('language.p1', userId)}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: `🇺🇸 ${await t('language.english', userId)}`,
                                        callback_data: "settings_language_en",
                                    },
                                    {
                                        text: `🇫🇷 ${await t('language.french', userId)}`,
                                        callback_data: "settings_language_fr",
                                    },
                                ],
                                [
                                    { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
                                    { text: `${await t('backMenu', userId)}`, callback_data: "menu_back", }
                                ]
                            ],
                        },
                    },
                );
            } catch (error: any) {
                if (error?.message && error.message.includes('message is not modified')) {
                    console.log('Language settings message is already up to date');
                    return;
                }
                console.error("Error editing message caption:", error);
            }
        }

        if (sel_action === "settings_language_en") {
            await setUserLanguage(userId, 'en');
            try {
                await bot.editMessageCaption(
                    `${await t('language.p1', userId)}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: `🇺🇸 ${await t('language.english', userId)}`,
                                        callback_data: "settings_language_en",
                                    },
                                    {
                                        text: `🇫🇷 ${await t('language.french', userId)}`,
                                        callback_data: "settings_language_fr",
                                    },
                                ],
                                [
                                    { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
                                    { text: `${await t('backMenu', userId)}`, callback_data: "menu_back", }
                                ]
                            ],
                        },
                    },
                );
            } catch (error: any) {
                if (error?.message && error.message.includes('message is not modified')) {
                    console.log('Language settings message is already up to date');
                    return;
                }
                console.error("Error editing message caption:", error);
            }
        }

        if (sel_action === "settings_language_fr") {
            await setUserLanguage(userId, 'fr');
            try {
                await bot.editMessageCaption(
                    `${await t('language.p1', userId)}`,
                    {
                        chat_id: chatId,
                        message_id: messageId,
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: `🇺🇸 ${await t('language.english', userId)}`,
                                        callback_data: "settings_language_en",
                                    },
                                    {
                                        text: `🇫🇷 ${await t('language.french', userId)}`,
                                        callback_data: "settings_language_fr",
                                    },
                                ],
                                [
                                    { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
                                    { text: `${await t('backMenu', userId)}`, callback_data: "menu_back", }
                                ]
                            ],
                        },
                    },
                );
            } catch (error: any) {
                if (error?.message && error.message.includes('message is not modified')) {
                    console.log('Language settings message is already up to date');
                    return;
                }
                console.error("Error editing message caption:", error);
            }
        }

        if (sel_action === "trending_coin") {
            cleanupUserTextHandler(userId);
            await safeDeleteMessage(bot, chatId, messageId);
            sendTrendingPageMessage(bot, chatId, userId, 1);
        }

        if (sel_action?.startsWith("trending_page_")) {
            const page = parseInt(sel_action.split("_").pop()!);
            await editTrendingPageMessage(bot, chatId, messageId, userId, page);
        }

        if (sel_action?.startsWith("refresh_trending_")) {
            const page = parseInt(sel_action.split("_").pop()!);
            await editTrendingPageMessage(bot, chatId, messageId, userId, page);
        }

        else if (sel_action === "help") {
            cleanupUserTextHandler(userId);
            sendHelpMessageWithImage(bot, chatId, userId, messageId);
            if (messageId) {
                await safeDeleteMessage(bot, chatId, messageId);
            }
        }

        if (sel_action === "sniper") {
            const userCheck = await User.findOne({ userId });
            if (userCheck && userCheck.chain === "ethereum") {
                await bot.answerCallbackQuery(callbackQueryId, { text: "Sniper functions are only available for Solana" });
                return;
            }
            safeDeleteMessage(bot, chatId, messageId);
            cleanupUserTextHandler(userId);
            let allowed: boolean;
            const userUserId = users.userId;
            if (userUserId !== null && userUserId !== undefined) {
                const isWhitelisted = await isSniperWhitelisted(userUserId);
                if (isWhitelisted) {
                    allowed = true;
                } else {
                    allowed = await ensureSubscriptionForSniper(bot, chatId, userId);
                }
            } else {
                allowed = await ensureSubscriptionForSniper(bot, chatId, userId);
            }

            if (!allowed) {
                return;
            }

            if (messageId) {
                await safeDeleteMessage(bot, chatId, messageId);
            }

            sendSniperMessageeWithImage(bot, chatId, userId, messageId);
        }
        if (sel_action === "sniper_refresh") {
            try {
                await editTokenListMessage(bot, chatId, userId, messageId);
            } catch (error) {
                console.error("Error in sniper_refresh:", error);
                // Don't crash the bot, just log the error
            }
        }

        if (sel_action === "detection") {
            sendTokenListMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "is_snipping") {
            user.sniper.is_snipping = !user.sniper.is_snipping;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
            if (user.sniper.is_snipping) {
                const message = bot.sendMessage(chatId, await t('sniper.active', userId));
                setTimeout(async () => {
                    await bot.deleteMessage(chatId, (await message).message_id).catch(() => { });
                }, 10000);
            } else {
                const { stopSniper } = await import("./services/sniper");
                stopSniper(userId);
                const message1 = bot.sendMessage(chatId, await t('sniper.stopped', userId));
                setTimeout(async () => {
                    await bot.deleteMessage(chatId, (await message1).message_id).catch(() => { });
                }, 10000);
            }
        }

        if (sel_action === "allowAutoSell") {
            user.sniper.allowAutoSell = !user.sniper.allowAutoSell;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }


        if (sel_action === "allowAutoBuy") {
            user.sniper.allowAutoBuy = !user.sniper.allowAutoBuy;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "sniper_mev") {
            user.sniper.mev = !user.sniper.mev;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "sniper_social") {
            user.sniper.social_check = !user.sniper.social_check;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "sniper_twitter") {
            user.sniper.twitter_check = !user.sniper.twitter_check;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "advance_action") {
            user.sniper.advance_mode = !user.sniper.advance_mode;
            await user.save();
            await editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "sniper_slippage") {
            bot.sendMessage(
                chatId,
                `${await t('messages.slippageInput', userId)}`,
                // {`
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const slippageValue = Number(reply.text || "");
                        if (isNaN(slippageValue) || slippageValue <= 0 || slippageValue > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSlippage', userId)}`,
                                // { reply_markup: { force_reply: true } },
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newSlippageValue = Number(newReply.text || "");
                                        if (isNaN(newSlippageValue) || newSlippageValue < 0 || newSlippageValue > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidSlippage', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.slippage = newSlippageValue;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.slippage = slippageValue;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_buyAmount") {
            const userChain = await getUserChain(userId);
            const buyXMessage = userChain === "ethereum"
                ? await t('messages.buy_x_ethereum', userId)
                : await t('messages.buy_x', userId);
            bot.sendMessage(
                chatId,
                buyXMessage,
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const buyAmountValue = Number(reply.text || "");
                        if (isNaN(buyAmountValue) || buyAmountValue <= 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newBuyAmountValue = Number(newReply.text || "");
                                        if (isNaN(newBuyAmountValue) || newBuyAmountValue <= 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.buy_amount = newBuyAmountValue;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.buy_amount = buyAmountValue;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_buyLimit") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterBuyLimit', userId)}`,
                // {`
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const buyLimit = Number(reply.text || "");
                        if (isNaN(buyLimit) || buyLimit <= 0 || !Number.isInteger(buyLimit)) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newBuyLimit = Number(newReply.text || "");
                                        if (isNaN(newBuyLimit) || newBuyLimit <= 0 || !Number.isInteger(newBuyLimit)) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.buy_limit = newBuyLimit;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.buy_limit = buyLimit;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_takeProfit") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterTakeProfit', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const takeProfitPercent = Number(reply.text || "");
                        if (isNaN(takeProfitPercent) || takeProfitPercent < 0 || takeProfitPercent > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newTakeProfitPercent = Number(newReply.text || "");
                                        if (isNaN(newTakeProfitPercent) || newTakeProfitPercent <= 0 || newTakeProfitPercent > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.take_profit = newTakeProfitPercent;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.take_profit = takeProfitPercent;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_stopLoss") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterStopLoss', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const stopLossPercent = Number(reply.text || "");
                        if (isNaN(stopLossPercent) || stopLossPercent > 0 || stopLossPercent < -100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newStopLossPercent = Number(newReply.text || "");
                                        if (isNaN(newStopLossPercent) || newStopLossPercent >= 0 || newStopLossPercent < -100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.stop_loss = newStopLossPercent;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.stop_loss = stopLossPercent;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_timeLimit") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterTimeLimit', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const timeLimit = Number(reply.text || "");
                        if (isNaN(timeLimit) || timeLimit < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newTimelimit = Number(newReply.text || "");
                                        if (isNaN(newTimelimit) || newTimelimit <= 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.time_limit = newTimelimit;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.time_limit = timeLimit;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_tokenStatus") {
            // Toggle between migrated, on_bonding, and both
            const currentStatus = user.sniper.token_status || "both";
            let newStatus: "migrated" | "on_bonding" | "both";
            
            if (currentStatus === "both") {
                newStatus = "migrated";
            } else if (currentStatus === "migrated") {
                newStatus = "on_bonding";
            } else {
                newStatus = "both";
            }
            
            user.sniper.token_status = newStatus;
            await user.save();
            editSniperMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "sniper_boundingMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterBondingCurveMin', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const bonding_curve_min = Number(reply.text || "");
                        if (isNaN(bonding_curve_min) || bonding_curve_min < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newBondingCurveMin = Number(newReply.text || "");
                                        if (isNaN(newBondingCurveMin) || newBondingCurveMin < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.bonding_curve_min = newBondingCurveMin;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.bonding_curve_min = bonding_curve_min;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_bondingMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterBondingCurveMax', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const bondingMax = Number(reply.text || "");
                        if (isNaN(bondingMax) || bondingMax < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newBondingCurveMax = Number(newReply.text || "");
                                        if (isNaN(newBondingCurveMax) || newBondingCurveMax < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.bonding_curve_max = newBondingCurveMax;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.bonding_curve_max = bondingMax;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_MCMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinMarketCap', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const mcMin = Number(reply.text || "");
                        if (isNaN(mcMin) || mcMin < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMcMin = Number(newReply.text || "");
                                        if (isNaN(newMcMin) || newMcMin < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.min_mc = newMcMin;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.min_mc = mcMin;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_MCMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxMarketCap', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const mcMax = Number(reply.text || "");
                        if (isNaN(mcMax) || mcMax < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMcMax = Number(newReply.text || "");
                                        if (isNaN(newMcMax) || newMcMax < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.max_mc = newMcMax;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.max_mc = mcMax;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_tokenAgeMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinTokenAge', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const minTokenAge = Number(reply.text || "");
                        if (isNaN(minTokenAge) || minTokenAge < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMinTokenAge = Number(newReply.text || "");
                                        if (isNaN(newMinTokenAge) || newMinTokenAge < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.min_token_age = newMinTokenAge;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.min_token_age = minTokenAge;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }


        if (sel_action === "sniper_tokenAgeMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxTokenAge', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const maxTokenAge = Number(reply.text || "");
                        if (isNaN(maxTokenAge) || maxTokenAge < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMaxTokenAge = Number(newReply.text || "");
                                        if (isNaN(newMaxTokenAge) || newMaxTokenAge < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.max_token_age = newMaxTokenAge;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.max_token_age = maxTokenAge;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_holdersMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinHolders', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const minHolders = Number(reply.text || "");
                        if (isNaN(minHolders) || minHolders < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMinHolders = Number(newReply.text || "");
                                        if (isNaN(newMinHolders) || newMinHolders < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.min_holders = newMinHolders;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.min_holders = minHolders;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }


        if (sel_action === "sniper_holdersMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxHolders', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const maxHolders = Number(reply.text || "");
                        if (isNaN(maxHolders) || maxHolders < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMaxHolders = Number(newReply.text || "");
                                        if (isNaN(newMaxHolders) || newMaxHolders < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.max_holders = newMaxHolders;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.max_holders = maxHolders;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_volumeMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinVolume', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const minVolume = Number(reply.text || "");
                        if (isNaN(minVolume) || minVolume < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMinVolume = Number(newReply.text || "");
                                        if (isNaN(newMinVolume) || newMinVolume < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.min_vol = newMinVolume;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.min_vol = minVolume;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }


        if (sel_action === "sniper_volumeMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxVolume', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const maxVolume = Number(reply.text || "");
                        if (isNaN(maxVolume) || maxVolume < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMaxVolume = Number(newReply.text || "");
                                        if (isNaN(newMaxVolume) || newMaxVolume < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.max_vol = newMaxVolume;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.max_vol = maxVolume;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_liquidityMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinLiquidity', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const minLiquidity = Number(reply.text || "");
                        if (isNaN(minLiquidity) || minLiquidity < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMinLiquidity = Number(newReply.text || "");
                                        if (isNaN(newMinLiquidity) || newMinLiquidity < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.min_liq = newMinLiquidity;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.min_liq = minLiquidity;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_liquidityMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxLiquidity', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const maxLiquidity = Number(reply.text || "");
                        if (isNaN(maxLiquidity) || maxLiquidity < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMaxLiquidity = Number(newReply.text || "");
                                        if (isNaN(newMaxLiquidity) || newMaxLiquidity < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.max_liq = newMaxLiquidity;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.max_liq = maxLiquidity;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_TxnMin") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMinTransactions', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const minTxns = Number(reply.text || "");
                        if (isNaN(minTxns) || minTxns < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMinTxns = Number(newReply.text || "");
                                        if (isNaN(newMinTxns) || newMinTxns < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.TXNS_MIN = newMinTxns;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.TXNS_MIN = minTxns;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

        if (sel_action === "sniper_TxnMax") {
            bot.sendMessage(
                chatId,
                `${await t('sniper.enterMaxTransactions', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    createUserTextHandler(userId, async (reply) => {
                        const maxTxns = Number(reply.text || "");
                        if (isNaN(maxTxns) || maxTxns < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    safeDeleteMessage(bot, chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    createUserTextHandler(userId, async (newReply) => {
                                        const newMaxTxns = Number(newReply.text || "");
                                        if (isNaN(newMaxTxns) || newMaxTxns < 0) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidAmount', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            user.sniper.TXNS_MAX = newMaxTxns;
                                            await user.save();
                                            editSniperMessage(bot, chatId, userId, messageId);
                                        }
                                        await safeDeleteMessage(bot, chatId, newReply.message_id);
                                    }),
                                );
                            });
                        } else {
                            user.sniper.TXNS_MAX = maxTxns;
                            await user.save();
                            editSniperMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            safeDeleteMessage(bot, chatId, sentMessage.message_id).catch(() => { });
                            safeDeleteMessage(bot, chatId, reply.message_id).catch(() => { });
                        }, 5000);
                    }),
                );
            });
        }

    } catch (error: any) {
        console.error("Error handling callback query:", error);
        // Answer the callback query to prevent "loading" state
        try {
            const errorUserId = callbackQuery.from?.id || 0;
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: `${await t('errors.errorOccurred', errorUserId)}`,
                show_alert: false
            });
        } catch (answerError) {
            // Ignore errors when answering callback query
        }
    }
});



async function setBotCommands() {
    // Use default userId (0) for commands since they're global
    const defaultUserId = 0;
    bot.setMyCommands([
        { command: "/start", description: `${await t('commands.start', defaultUserId)}` },
        { command: "/help", description: `${await t('commands.help', defaultUserId)}` },
        { command: "/menu", description: `${await t('commands.menu', defaultUserId)}` },
        { command: "/settings", description: `${await t('commands.setting', defaultUserId)}` },
        { command: "/wallets", description: `${await t('commands.wallet', defaultUserId)}` },
        { command: "/positions", description: `${await t('commands.position', defaultUserId)}` },
        { command: "/sniper", description: `${await t('commands.sniper', defaultUserId)}` },
        { command: "/chains", description: `${await t('commands.chains', defaultUserId)}` },
        // { command: "/orders", description: "View limit orders." },
    ]).then(() => {
            console.log("Commands have been set successfully.");
        })
        .catch((err) => {
            console.error("Error setting commands:", err);
        });
}

setBotCommands();

bot.on('message', async (msg) => {
    if (msg.text && msg.from?.id) {
        await fundBundleWalletModule.handleUserReply(msg);
    }
});

let isCheckingAutoSell = false;

export async function checkAndAutoSell() {
    if (isCheckingAutoSell) {
        console.log("⏳ Auto-sell check already in progress, skipping...");
        return;
    }

    isCheckingAutoSell = true;
    try {
        console.log("🔍 Running auto-sell check...");

        const orders = await limitOrderData.find({ status: "Pending" });

        for (const order of orders) {
            try {
                const user = await User.findOne({ userId: order.user_id });
                if (!user) continue;

                // Determine if this is Ethereum or Solana based on wallet
                const isEthereumWallet = user.ethereumWallets?.some(w => w.publicKey === order.wallet);
                let currentPrice = 0;
                let tokenInfo: any = null;

                if (isEthereumWallet) {
                    // Ethereum token - use Ethereum price fetching
                    try {
                        const pairInfo = await getPairInfoWithTokenAddress(order.token_mint);
                        if (pairInfo?.priceUsd) {
                            currentPrice = Number(pairInfo.priceUsd);
                            console.log('pairInfo.priceUsd', pairInfo.priceUsd);
                            console.log('currentPrice', currentPrice);
                            tokenInfo = {
                                priceUsd: pairInfo.priceUsd,
                                marketCap: pairInfo.marketCap,
                                symbol: pairInfo.baseToken?.symbol || 'TOKEN',
                                name: pairInfo.baseToken?.name || 'Token'
                            };
                        } else {
                            const dbToken = await Token.findOne({ address: { $regex: new RegExp(`^${order.token_mint}$`, "i") } });
                            if (dbToken?.priceUsd) {
                                currentPrice = Number(dbToken.priceUsd);
                                tokenInfo = {
                                    priceUsd: dbToken.priceUsd,
                                    marketCap: dbToken.market_cap,
                                    symbol: dbToken.symbol || 'TOKEN',
                                    name: dbToken.name || 'Token'
                                };
                            }
                        }
                    } catch (error) {
                        console.error(`Error fetching Ethereum token price for ${order.token_mint}:`, error);
                        continue;
                    }
                } else {
                    // Solana token - use existing Solana price fetching
                    //@ts-ignore
                    currentPrice = Number(await getTokenPrice(order.token_mint));
                    const pairArray = await getPairByAddress(order.token_mint);
                    const pair = pairArray[0];
                    tokenInfo = {
                        priceUsd: pair?.priceUsd,
                        marketCap: pair?.marketCap,
                        symbol: pair?.baseToken?.symbol || 'TOKEN',
                        name: pair?.baseToken?.name || 'Token'
                    };
                }

                if (!currentPrice || currentPrice <= 0) {
                    console.warn(`⚠️ Could not get price for token ${order.token_mint}`);
                    continue;
                }

                console.log(`💰 Token ${order.token_mint}: current price $${currentPrice}, target $${order.target_price1} & $${order.target_price2}`);

                if (currentPrice >= order.target_price1 || currentPrice <= order.target_price2) {
                    console.log(`🚀 Triggering auto-sell for ${order.token_mint} (user ${order.user_id})`);
                    const id = order.user_id;
                    const wallet = order.wallet;
                    const address = order.token_mint;
                    const tp = order.Tp;
                    const sl = order.Sl;
                    const amount = order.token_amount;

                    let result: any = null;

                    if (isEthereumWallet) {
                        // Ethereum auto-sell
                        try {
                            const active_wallet = user.ethereumWallets.find(w => w.publicKey === wallet);
                            if (!active_wallet) {
                                console.error(`❌ Active Ethereum wallet not found for user ${id}`);
                                continue;
                            }

                            const token = await Token.findOne({ address: { $regex: new RegExp(`^${address}$`, "i") } });
                            if (!token) {
                                console.error(`❌ Token not found: ${address}`);
                                continue;
                            }

                            const slippage = BigInt(Math.floor((user.settings.slippage_eth?.sell_slippage_eth || 0.5) * 100000));
                            const gas_amount = user.settings.option_gas_eth || 10;
                            let secretKey: string;
                            try {
                                secretKey = decryptSecretKey(active_wallet.secretKey);
                            } catch (error: any) {
                                console.error(`[${new Date().toLocaleString()}] ❌ Failed to decrypt wallet secret key for auto-sell (wallet ${active_wallet.publicKey}):`, error.message);
                                continue; // Skip this order if decryption fails
                            }
                            const tokenDecimals = token.decimal || 18;
                            const tokenAmount = ethers.parseUnits(amount.toString(), tokenDecimals);
                            const deadline = Math.floor(Date.now() / 1000) + 1200;

                            const swapResult = await swapExactTokenForETHUsingUniswapV2_({
                                index: 0,
                                amount: tokenAmount,
                                token_address: address,
                                pair_address: token.pairAddress || "",
                                slippage: slippage,
                                gas_amount: gas_amount,
                                dexId: token.dex_name || "Uniswap V2",
                                secretKey: secretKey,
                                deadline: deadline,
                                userId: id
                            });

                            result = { success: !!swapResult, txHash: swapResult };
                        } catch (error: any) {
                            console.error(`❌ Ethereum auto-sell error for ${address}:`, error);
                            result = { success: false, error: error.message };
                        }
                    } else {
                        // Solana auto-sell (existing logic)
                        console.log(wallet, address, id, amount);
                        result = await swapToken(
                            id,
                            wallet,
                            address,
                            100,
                            "sell",
                            50,
                            0.0005 * 10 ** 9,
                            amount
                        );
                    }

                    if (result?.success || result?.txHash) {
                        await limitOrderData.updateOne(
                            { _id: order._id },
                            { $set: { status: "Success" } }
                        );

                        const settings = await TippingSettings.findOne() || new TippingSettings();
                        if (!settings) throw new Error("Tipping settings not found!");

                        let adminFeePercent;
                        if (user.userId === 7994989802 || user.userId === 2024002049) {
                            adminFeePercent = 0;
                        } else {
                            adminFeePercent = settings.feePercentage / 100;
                        }

                        if (isEthereumWallet) {
                            const active_wallet = user.ethereumWallets.find(w => w.publicKey === wallet);
                            const eth_price = await getEtherPrice();
                            const remainingBalance = await getTokenBalancWithContract(address, wallet);

                            if (currentPrice >= order.target_price1) {
                                const message = `${await t('messages.autoSell1', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('messages.autoSell3', order.user_id)} ${tp}%
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(6)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(6)}\n
${await t('messages.autoSell6', order.user_id)}`
                                await bot.sendMessage(order.user_id, message, { disable_web_page_preview: true });

                                if (active_wallet) {
                                    if (!active_wallet.tradeHistory) {
                                        (active_wallet as any).tradeHistory = [];
                                    }
                                    (active_wallet.tradeHistory as any[]).push({
                                        transaction_type: "sell",
                                        token_address: address,
                                        amount: 100,
                                        token_price: order.target_price1,
                                        token_amount: amount * order.target_price1 / eth_price, // ETH received
                                        token_balance: remainingBalance,
                                        mc: tokenInfo.marketCap || 0,
                                        date: Date.now().toString(),
                                        name: tokenInfo.name,
                                        tip: (amount * order.target_price1 / eth_price) * adminFeePercent,
                                        pnl: false
                                    });
                                }
                            }

                            if (currentPrice <= order.target_price2) {
                                const message1 = `${await t('messages.autoSell7', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(4)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(4)}\n
${await t('messages.autoSell8', order.user_id)}`
                                await bot.sendMessage(order.user_id, message1, { disable_web_page_preview: true });

                                if (active_wallet) {
                                    if (!active_wallet.tradeHistory) {
                                        (active_wallet as any).tradeHistory = [];
                                    }
                                    (active_wallet.tradeHistory as any[]).push({
                                        transaction_type: "sell",
                                        token_address: address,
                                        amount: 100,
                                        token_price: order.target_price2,
                                        token_amount: amount * order.target_price2 / eth_price, // ETH received
                                        token_balance: remainingBalance,
                                        mc: tokenInfo.marketCap || 0,
                                        date: Date.now().toString(),
                                        name: tokenInfo.name,
                                        tip: (amount * order.target_price2 / eth_price) * adminFeePercent,
                                        pnl: false
                                    });
                                }
                            }
                        } else {
                            // Solana auto-sell (existing logic)
                            const active_wallet = user.wallets.find(
                                (wallet) => wallet.is_active_wallet,
                            );
                            const sol_price = getSolPrice();
                            const pairArray = await getPairByAddress(address);
                            const pair = pairArray[0];
                            const priceUsd = pair.priceUsd;
                            const priceNative = pair.priceNative;
                            const liquidity = pair?.liquidity?.usd;
                            const market_cap = pair?.marketCap;
                            const symbol = pair.baseToken.symbol;
                            const name = pair.baseToken.name;

                            if (currentPrice >= order.target_price1) {
                                const message = `${await t('messages.autoSell1', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('messages.autoSell3', order.user_id)} ${tp}%
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(4)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(4)}\n
${await t('messages.autoSell6', order.user_id)}`
                                await bot.sendMessage(order.user_id, message);
                                active_wallet?.tradeHistory.push({
                                    transaction_type: "sell",
                                    token_address: address.toString(),
                                    amount: 100,
                                    token_price: order.target_price1,
                                    token_amount: amount,
                                    token_balance: 0,
                                    mc: market_cap,
                                    date: Date.now(),
                                    name: name,
                                    tip: amount * adminFeePercent * order.target_price1 / sol_price,
                                    pnl: false
                                });
                            }
                            if (currentPrice < order.target_price2) {
                                const message1 = `${await t('messages.autoSell7', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('sniper.stopLossLabel', order.user_id)} ${sl}%
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(4)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(4)}\n
${await t('messages.autoSell8', order.user_id)}`
                                await bot.sendMessage(order.user_id, message1);
                                active_wallet?.tradeHistory.push({
                                    transaction_type: "sell",
                                    token_address: address.toString(),
                                    amount: 100,
                                    token_price: order.target_price2,
                                    token_amount: amount,
                                    token_balance: 0,
                                    mc: market_cap,
                                    date: Date.now(),
                                    name: name,
                                    tip: amount * adminFeePercent * order.target_price2 / sol_price,
                                    pnl: false
                                });
                            }
                        }

                        await user.save();
                        console.log(`✅ Sold ${order.token_mint} for user ${order.user_id}`);
                    } else {
                        await limitOrderData.updateOne(
                            { _id: order._id },
                            { $set: { status: "Failed" } }
                        );
                        console.error(`❌ Swap failed for ${order.token_mint}`);
                    }
                }
            } catch (err) {
                console.error("⚠️ Error in auto-sell loop:", err);
            }
        }
    } finally {
        isCheckingAutoSell = false;
    }
}

const updateSolanaPrice = async () => {
    setSolPrice(await getSolanaPrice());
};

const main = async () => {
    updateSolanaPrice();
    checkAndAutoSell();
    // Update price every 60 seconds (cached for 60s, so actual API calls are rate-limited)
    setInterval(() => {
        updateSolanaPrice();
    }, 60000);

    const AUTO_SELL_CHECK_INTERVAL = 5000;

    setInterval(() => {
        checkAndAutoSell();
    }, AUTO_SELL_CHECK_INTERVAL);

    setInterval(async () => {
        try {
            const users = await User.find({ "sniper.is_snipping": true });
            console.log(`👥 Found ${users.length} active snipers.`);
            for (const user of users) {
                if (user.userId != null && typeof user.userId === 'number') {
                    await runSniper(user.userId);
                }
            }
        } catch (error) {
            console.error("⚠️ Error in sniper script:", error);
        }
    }, 60000);

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");
    setInterval(async () => {
        settings.BotStatus = new Date();
        await settings.save();
    }, 20000);
};

main();

console.log("Bot is running...");
