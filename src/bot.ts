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
import { editWalletsMessage, sendWalletsMessageWithImage, sendWalletsMessage } from "./messages/wallets";
import { editMenuMessage, sendAdminPanelMessage, sendWelcomeMessage, sendAddUserMessage, sendMenuMessage, sendMenuMessageWithImage, editAdminPanelMessage, sendMenu } from "./messages";
import {
    extractTokenAddress,
    extractTokenAddress_,
    hasSpecialCharacters,
    isMEVProtect,
} from "./services/other";
import { walletBackButton, walletsBackMarkup } from "./utils/markup";
import { User } from "./models/user";
import { PendingUser } from "./models/pendingUser";
import { limitOrderData } from "./models/limitOrder";
import bs58 from "bs58";
import {
    editWithdrawWalletsMessage,
    sendWithdrawWalletsMessage,
} from "./messages/wallets/withdraw";
import { editSwitchWalletsMessage, sendSwitchWalletsMessage } from "./messages/wallets/switch";
import { editHelpMessage, sendHelpMessageWithImage } from "./messages/help";
import { getPairByAddress, getTokenInfo, getTokenPrice, setTokenPrice } from "./services/dexscreener";
import {
    editBuyMessageWithAddress,
    getBuy,
    sendBuyMessage,
    sendBuyMessageWithAddress,
} from "./messages/buy";
import {
    sendSellMessageWithAddress,
    sendSellMessage,
    editSellMessageWithAddress,
    getSell
} from "./messages/sell";
import {
    sendAutoSellMessage,
    editAutoSellMessage,
    editMessageReplyMarkup
} from './messages/settings/auto_sell';
import { swapToken } from "./services/jupiter";
import { editPositionsMessage, sendPositionsMessageWithImage, getPositions } from './messages/positions';
import { editSettingsMessage, sendSettingsMessage, sendSettingsMessageWithImage } from "./messages/settings";
import { buyToken } from "./messages/buy/buy";
import { TokenAmount } from "@raydium-io/raydium-sdk-v2";
import { editprofitLevelMessage, editProfitlevelMessageReplyMarkup } from './messages/settings/profitLevel';
import { editFeeAutoMessage, editFeeMessage, sendFeeAutoMessage, sendFeeMessage } from './messages/settings/fee';
import { WhiteListUser } from "./models/whitelist";
import { editRenameWalletMessage, sendRenameWalletMessage } from "./messages/wallets/rename";
import { editSlippageMessage, sendSlippageMessage } from './messages/settings/slippage';
import { editQuickBuyMessage, sendQuickBuyMessage } from './messages/settings/quick_buy';
import { editQuickSellMessage, sendQuickSellMessage } from './messages/settings/quick_sell';
// import { editPresetsMessage } from './messages/settings/presets';
import { getCreateWallet } from './messages/wallets/create';
// import { editDefaultWalletMessage } from './messages/wallets/default';
import { getImportWallet } from './messages/wallets/import';
import { isExistWallet, isExistWalletWithName, txnMethod } from './utils/config';
import { editDeleteWalletMessage, sendDeleteWalletMessage } from './messages/wallets/delete';
import { getWithdrawWallet } from './messages/wallets/withdraw';
import { editPrivateKeyWalletMessage, sendPrivateKeyWalletMessage, sendPrivateKeyWalletMessageWithImage } from './messages/wallets/private_key';
import { send } from "process";
import { editLanguageMessage, sendLanguageMessage } from "./messages/settings/language";
import { resourceLimits } from "worker_threads";
import { isNamedTupleMember } from "typescript";
import { settings } from "./commands/settings";
import { sendProfitLevelMessage } from "./messages/settings/profitLevel";
import { updateTransferHookInstructionData } from "@solana/spl-token";
import { setUserLanguage, t } from "./locales";
import { error } from "console";
import { TippingSettings } from "./models/tipSettings";
import { editReferralMessage, sendReferralMessage } from "./messages/referral";
import { editTrendingPageMessage, sendTrendingPageMessage } from "./messages/trendingCoins";
// import { sendWelcomeVideo } from "./utils/welcomevideo";
// import { editMultiMessageWithAddress } from './messages/buy/multi';

const userRefreshCounts = new Map(); // key: userId, value: { count: number, lastReset: timestamp }

dotenv.config();

interface UserLocalDataDictionary {
    [key: number]: {
        withdraw: {
            address: string;
            amount: number;
            // is_processor: boolean;
        };
    };
}
export const userLocalData: UserLocalDataDictionary = {};

// MPH6K8DMRG74IPCIF61M8KIQKZZ6TIBQN5
// GS12G6WCEV1ANZH4AFZGHCAP8PX13NM8JH
interface NumericDictionary {
    [key: number]: number; // or [key: string]: number;
}
export const userCurrentShow: NumericDictionary = {};

interface CurrentOpenedDictionary {
    [key: number]: number; // or [key: string]: number;
}

export const userCurrentOpened: CurrentOpenedDictionary = {};

type WalletType = {
    label: string;
    publicKey: string;
    secretKey: string;
};

// async function saveReferral(referrerId: string, referredId: string) {
//     // Add referred user to referrer's referrals array
//     await User.updateOne(
//         // { userId: referrerId },
//         {
//             $push: {
//                 referrals: { referred: referredId, date: new Date(), publicKey: "" }
//             }
//         },
//         { upsert: true }
//     );

//     // Mark who referred the new user
//     await User.updateOne(
//         // { userId: referredId },
//         { $set: { referredBy: referrerId } },
//         { upsert: true }
//     );
// }

const bot = new TelegramBot(process.env.TOKEN || "", { polling: true });

// bot.onText(/\/start/, async (msg, match) => {
//     // await sendWelcomeVideo(bot, msg.chat.id, msg.from?.id || 0);
//     CommandHandler.start(bot, msg, match)
// });


bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const chatId = msg.chat.id;
    const arg = match?.[1] || "";

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
            if (user) {
                console.log("User already exists, not setting referral");
            }
            pendingUser.username = msg.from?.username || "";
            pendingUser.firstName = msg.from?.first_name || "";
            pendingUser.pendingReferrer = pendingReferrer;
            pendingUser.date = String(Date.now());
            await pendingUser.save();
        }
    } else {
        // If no referral
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


// bot.onText(/\/referral/, async (msg) => {
//     const userId = msg.from?.id.toString() || "";
//     const link = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${userId}`;
//     await bot.sendMessage(msg.chat.id, `Your referral link:\n${link}`);
// });

bot.onText(/\/wallets/, async (msg, match) => {
    // Fetch the whitelist from your database
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    // Check if the user is whitelisted by username
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
    // Fetch the whitelist from your database
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    // Check if the user is whitelisted by username
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
    // Fetch the whitelist from your database
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    // Check if the user is whitelisted by username
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
    // Fetch the whitelist from your database
    const whiteListUsers = await WhiteListUser.find({});

    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    const fromId = msg.from?.id?.toString();
    if (!fromId) return;

    const userId = Number(fromId);

    // Check if the user is whitelisted by username
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


bot.on("polling_error", (error) => {
    console.error(error);
});

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
        const tokenAddress = text.match(/([A-Za-z0-9]{32,44})/)?.[1] || "";

        const SPAM_LIMIT = 10;
        const SPAM_WINDOW_MS = 30 * 1000; // 

        if (tokenAddress) {
            console.log("Extracted Token Address:", tokenAddress);
        } else {
            console.log("No Token Address Found in Caption");
        }

        const userId = from.id;
        const users = (await User.findOne({ userId })) || new User();
        // Regular expression to extract the token balance
        // const message = `${await t('sell.p13', userId)} <tg-token>${balance} ${symbol}</tg-token>`;
        // const tokenBalance = message.match(/<tg-token>([\d.]+) [A-Za-z0-9]+<\/tg-token>/)?.[1];
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
        // const chatId = ctx.callbackQuery?.message?.chat.id;
        const messageId = ctx?.message_id || 0;

        const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
        if (!settings) throw new Error("Tipping settings not found!");

        // if (!settings.WhiteListUser) {
        //     sendMenu(bot, chatId, userId, messageId);
        // }

        if (sel_action === "admin_panel") {
            console.log('debug-> admin panel messsage');
            bot.deleteMessage(chatId, messageId);
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
                    async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                        } else {
                            // You can add logic here to save or process the user ID or username
                            sendAddUserMessage(
                                bot,
                                chatId,
                                userId,
                                inputUserId
                            );
                        }
                        // sendMenuMessage(bot, chatId, userId, messageId);
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    },
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
                    async (reply) => {
                        const inputUserId = reply.text?.trim();
                        if (!inputUserId) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidId', userId)}`,
                            );
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
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
                                // Proceed with removal logic here
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

                        // Clean up messages
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    },
                );
            });
            return;
        }

        if (sel_action === "admin_referral") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.enterreferral', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidsettings', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            settings.referralReward = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 2000);
                    }
                );
            });
        }

        if (sel_action === "admin_referralSettings") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.enterreferralSettings', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidsettings', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            settings.referralSettings = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 2000);
                    }
                );
            });
        }

        if (sel_action === "admin_tip_percentage") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.entertip', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 0 || date > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.iinvalidtip', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            settings.feePercentage = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 2000);
                    }
                );
            });
        }

        if (sel_action === "admin_wallets") {
            const sent = bot.sendMessage(
                chatId,
                `${await t('messages.walletLimits', userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 1 || date > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidwallets', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 3000);
                                bot.once('text',
                                    async (newReply) => {
                                        const newdate = Number(newReply.text || "");
                                        if (isNaN(newdate) || newdate < 1 || newdate > 100) {
                                            bot.sendMessage(
                                                chatId,
                                                `${await t('errors.invalidwallets', userId)}`,
                                                // { reply_markup: { force_reply: true } },
                                            );
                                        } else {
                                            settings.wallets = newdate;
                                            await settings.save();
                                            editSettingsMessage(bot, chatId, userId, messageId);
                                        }
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            settings.wallets = date;
                            await settings.save();
                            editAdminPanelMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 2000);
                    }
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
                bot.once("text", async (reply) => {
                    const label = reply.text || "";

                    // Clean up the message first
                    bot.deleteMessage(chatId, reply.message_id);
                    bot.deleteMessage(chatId, sentMessage.message_id);

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
                        // Just update the label, keep everything else the same
                        settings.adminSolAddress.label = label;
                        await settings.save();

                        editAdminPanelMessage(bot, chatId, userId, messageId);
                    }
                });
            });
        }

        if (sel_action === "admin_wallet") {
            bot.sendMessage(
                chatId,
                `${await t('messages.importwallet5', userId)}`,
            ).then((sentMessage) => {
                bot.once("text", async (reply) => {
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
                        ).then((sentMessage) => {
                            bot.once("text", async (reply) => {
                                const input = reply.text || "";
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
                                            bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                                        }, 5000);
                                    } else {
                                        const secretKey = encryptSecretKey(input, "password")
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
                                bot.deleteMessage(chatId, reply.message_id);
                                bot.deleteMessage(chatId, sentMessage.message_id);
                            });
                        });
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    }
                });
            });
        }

        const user = await User.findOne({ userId });
        if (!user) throw "No User";
        const wallets = user?.wallets;
        const active_wallet = wallets.find((wallet) => wallet.is_active_wallet);
        if (!active_wallet) throw "No active Wallet";
        const publicKey = active_wallet?.publicKey;
        if (!publicKey) throw "No publicKey";

        const userTelegramId = callbackQuery.from.username || "";
        const whiteListUsers = await WhiteListUser.find({});

        // Check if user is whitelisted by username (with or without @) or by userId
        const isWhitelisted = whiteListUsers.some((u) => {
            // Handle username comparison (with and without @ prefix)
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
                        // is_processor: false,
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

        // console.log("callbackquerydate",callbackQueryDate)
        const currentTime = Math.floor(Date.now() / 1000);
        // if(currentTime - callbackQueryDate > 600) {
        //     bot.answerCallbackQuery(callbackQueryId, )
        //     return
        // }

        // Welcome
        if (sel_action === "welcome") {
            await bot.deleteMessage(chatId, messageId);
            sendWelcomeMessage(bot, chatId, userId, messageId, userTelegramId);
        }

        if (sel_action === "login") {
            if (isWhitelisted) {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.successLog', userId)} ${user.username}!`,
                );
                // Navigate to main menu after successful login
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

        //Referral system
        if (sel_action === "referral_system") {
            bot.deleteMessage(chatId, messageId);
            sendReferralMessage(bot, chatId, userId);
        }

        if (sel_action === "referral_wallet") {
            const sent = bot.sendMessage(
                chatId,
                `${await t(`${await t('referral.message1', userId)}`, userId)}`,
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const address = String(reply.text || "");
                        if (!isValidSolanaAddress(address)) {
                            bot.sendMessage(
                                chatId,
                                `${await t('referral.message2', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 6000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            user.referrer_wallet = address;
                            await user.save();
                            editReferralMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 5000);
                    }
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
                        { text: `${await t('close', userId)}`, callback_data: "menu_close" },
                    ]
                ]
            };
            bot.sendMessage(chatId, message, {
                parse_mode: "HTML",
                reply_markup: markup,
            });
        }

        // Menu
        if (sel_action === "menu_back") {
            await bot.deleteMessage(chatId, messageId);
            sendMenu(bot, chatId, userId, messageId);
        }
        if (sel_action === "menu_close") {
            await bot.deleteMessage(chatId, messageId);
        }
        // Buy
        if (sel_action === "buy") {
            sendBuyMessage(bot, chatId, userId, messageId);
        }

        // if (sel_action === "refresh") {
        //     // const { caption, markup } = await getBuy(userId, tokenAddress);
        //     // bot.sendMessage(chatId, caption, {
        //     //     parse_mode: "HTML",
        //     //     reply_markup: markup,
        //     // });
        // }

        if (sel_action === "buy_refresh" || sel_action === "buy_back") {

            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            // Reset count if time window has passed
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

            // Call the function to edit the "Buy" message
            await editBuyMessageWithAddress(bot, chatId, userId, messageId, tokenAddress);

            // Handle refreshing the "Buy" action
            // if (sel_action === "buy_refresh") {
            //     console.log('debug refresh', sel_action);

            //     // Send a "refreshed" notification to the user
            //     const sent = await bot.sendMessage(chatId, "✅ Successfully refreshed.");

            //     // Delete the "refreshed" notification after 3 seconds
            //     setTimeout(async () => {
            //         try {
            //             await bot.deleteMessage(chatId, sent.message_id);
            //         } catch (err) {
            //             console.error("Failed to delete message:", err);
            //         }
            //     }, 3000);
            // }
            return;
        }

        if (sel_action === "sell_refresh" || sel_action === "sell_back") {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            // Reset count if time window has passed
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

            // Call the function to edit the "Sell" message
            await editSellMessageWithAddress(bot, chatId, userId, messageId, tokenAddress);

            // Handle refreshing the "Sell" action
            // if (sel_action === "sell_refresh") {
            //     console.log('debug refresh', sel_action);

            //     // Send a "refreshed" notification to the user
            //     const sent = await bot.sendMessage(chatId, "✅ Successfully refreshed.");

            //     // Delete the "refreshed" notification after 3 seconds
            //     setTimeout(async () => {
            //         try {
            //             await bot.deleteMessage(chatId, sent.message_id);
            //         } catch (err) {
            //             console.error("Failed to delete message:", err);
            //         }
            //     }, 3000);
            // }
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
            // Extract SOL amount from action
            const getTokenPercent = (
                action: BuyAction,
            ): number | "custom" | null => {
                switch (action) {
                    case "buy_01": return Number(user?.settings.quick_buy.buy_amount[0]);
                    case "buy_05": return Number(user?.settings.quick_buy.buy_amount[1]);
                    case "buy_1": return Number(user?.settings.quick_buy.buy_amount[2]);
                    case "buy_2": return Number(user?.settings.quick_buy.buy_amount[3]);
                    case "buy_5": return Number(user?.settings.quick_buy.buy_amount[4]);
                    // case "buy_x":
                    //     return "custom"; // Special case for custom amount
                    default:
                        return null;
                }
            };

            const buySolAmount = getTokenPercent(sel_action);
            sendBuyMessageWithAddress(
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
                Number(buySolAmount),
            );
        }

        // Usage - replace your multiple if statements with:
        if ((sel_action ?? "").startsWith("buy_") && sel_action !== "buy_x") {
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
            bot.sendMessage(
                chatId,
                `${await t('messages.buy_x', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                console.log('debug buy_x sel_action', sel_action);
                bot.once('text',
                    async (reply) => {
                        const tradeAmount = Number(reply.text || "");
                        if (isNaN(tradeAmount) || tradeAmount <= 0) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidAmount', userId)}`,
                                // `❌ Validation error: Invalid trade amount. Try again!`,
                            );
                            return;
                        } else {
                            sendBuyMessageWithAddress(
                                bot,
                                chatId,
                                userId,
                                messageId,
                                tokenAddress,
                                tradeAmount,
                            );
                        }
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    },
                );
            });
        }

        const dangerZoneMessage =
            `<strong>${await t('dangerZoneMessage.p1', userId)}</strong>\n\n` +
            `${await t('dangerZoneMessage.p2', userId)}\n` +
            `<strong>${await t('dangerZoneMessage.p3', userId)}</strong> ${await t('dangerZoneMessage.p4', userId)}\n\n` +
            `<strong>${await t('dangerZoneMessage.p5', userId)}</strong>\n` +
            `${await t('dangerZoneMessage.p6', userId)}`;

        // Sell Assets
        if (sel_action === "sell") {
            sendSellMessage(bot, chatId, userId, messageId);
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
            // Extract SOL amount from action
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
                        return "custom"; // Special case for custom amount
                    default:
                        return null;
                }
            };

            const sellPercent = getTokenPercent(sel_action);
            // if (sellPercent === null) {
            //     bot.sendMessage(
            //         chatId,
            //         `❌ Invalid sell action: ${sel_action}`,
            //     );
            //     return;
            // }

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

        // Usage - replace your multiple if statements with:
        if ((sel_action ?? "").startsWith("sell_") && sel_action !== "sell_x") {
            handleSellAction(
                sel_action as SellAction,
                bot,
                chatId,
                userId,
                messageId,
                tokenAddress,
            );
        }

        // Sell custom percent
        if (sel_action === "sell_x") {
            bot.sendMessage(
                chatId,
                `${await t('messages.sell_x', userId)}`,
                // { reply_markup: { force_reply: true } },
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
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
                            sendSellMessageWithAddress(
                                bot,
                                chatId,
                                userId,
                                messageId,
                                tokenAddress,
                                tokenSellPercent,
                                Number(tokenBalance),
                            );
                        }
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    },
                );
            });
            return;
        }

        // wallets
        if (sel_action === "wallets") {
            bot.deleteMessage(chatId, messageId);
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
        }
        // Wallets main actions
        if (sel_action === "wallets_refresh" || sel_action === "wallets_back") {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            // Reset count if time window has passed
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

            // console.log('debug wallets_back', sel_action)
            editWalletsMessage(bot, chatId, userId, messageId);
            if (sel_action === "wallets_back") {
                bot.deleteMessage(chatId, messageId);
                sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            }
            if (sel_action === "wallets_refresh") {
                console.log('debug wallets_refresh', sel_action);
                editWalletsMessage(bot, chatId, userId, messageId);
                // Show a temporary "refreshed" notification and delete it after a few seconds
                // const sent = await bot.sendMessage(chatId, "✅ Successfully refreshed.");
                // setTimeout(() => {
                //     bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                // }, 500);
            }
            return;
        }

        // Wallet -> Deposit
        if (sel_action === "wallets_deposit") {
            bot.sendMessage(
                chatId,
                `To deposit SOL to your wallet, send it to the following address:\n<code>${publicKey}</code>`,
                { parse_mode: "HTML" },
            );
            return;
        }

        // Wallet -> Withdraw
        if (sel_action === "wallets_withdraw") {
            bot.deleteMessage(chatId, messageId);
            sendWithdrawWalletsMessage(bot, chatId, userId, messageId);
        }

        if (sel_action?.startsWith('wallets_withdraw_confirm_')) {
            const index = Number(sel_action.split('wallets_withdraw_confirm_')[1])

            const toAddressMatch = text.match(/([1-9A-HJ-NP-Za-km-z]{32,44})/);
            const amountMatch = text.match(/([\d.]+)\s*SOL/i);

            const toAddress = toAddressMatch ? toAddressMatch[1] : null;
            const amountStr = amountMatch ? amountMatch[1] : null;
            console.log(toAddress, amountStr)
            const wallet = user.wallets[index]
            if (amountStr !== null) {
                const amount = Number(amountStr)
                // <a href="https://solscan.io/tx/${signature}"></a>
                bot.sendMessage(chatId, `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟡 ${await t('withdrawal.p2', userId)}</em></strong>
${amount} SOL ⇄ <code>${toAddress}  </code>

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
                // const balance = await getBalance(wallet.publicKey);

                const decrypted = decryptSecretKey(wallet.secretKey, "password");
                const senderKeypair = Keypair.fromSecretKey(bs58.decode(decrypted))

                const receiverPublicKey = new PublicKey(toAddress || '')

                // get balance and rent exempt minimum
                const balance = await connection.getBalance(senderKeypair.publicKey);
                const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
                const maxSendable = Math.max(balance - rentExempt - 10000, 0);

                // compute amount safely
                let amountInLamports = Math.floor((amount || 0) * LAMPORTS_PER_SOL);
                if (amountInLamports > maxSendable) {
                    amountInLamports = maxSendable; // auto-adjust instead of failing
                }

                if (amountInLamports <= 0) {
                    throw new Error("Not enough balance to send after rent exemption.");
                }

                console.log('Sending (lamports):', amountInLamports);

                const latestBlockhash = await connection.getLatestBlockhash("finalized");

                const instructions = [
                    // priority fee (adjust if network busy)
                    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2000 }),
                    // safe CU limit for transfer
                    ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
                    // actual transfer
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

                // simulate before sending
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
${amount} SOL ⇄ <code>${toAddress}</code>

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
                    console.log("All settings is success")
                    bot.sendMessage(chatId, `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟢 ${await t('withdrawal.p2', userId)}</em></strong>
${amount} SOL ⇄ <code>${toAddress}</code>

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
                const wallet = user.wallets[index]
                bot.sendMessage(chatId, `${await t('messages.withdraw1', userId)}`)
                    .then((sentMessage1) => {
                        bot.once('text', async (reply) => {
                            const amount = Number(reply.text || "");
                            if (isNaN(amount)) {
                                bot.sendMessage(chatId, `${await t('errors.invalidAmount', userId)}`);
                                return;
                            }
                            const decrypted = decryptSecretKey(wallet.secretKey, "password");
                            const senderKeypair = Keypair.fromSecretKey(bs58.decode(decrypted))

                            // get balance and rent exempt minimum
                            const balance = await connection.getBalance(senderKeypair.publicKey);
                            const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
                            const availableLamports = Math.max(amount * LAMPORTS_PER_SOL - rentExempt - 10000, 0);
                            const maxSendable = (availableLamports / LAMPORTS_PER_SOL) > 0 ? availableLamports / LAMPORTS_PER_SOL : 0;

                            bot.deleteMessage(chatId, reply.message_id).catch(() => { });
                            bot.deleteMessage(chatId, sentMessage1.message_id).catch(() => { });

                            bot.sendMessage(chatId, `${await t('messages.withdraw2', userId)}`)
                                .then(sentMessage2 => {
                                    bot.once('text', async neewReply => {
                                        const address = neewReply.text || ''

                                        bot.deleteMessage(chatId, neewReply.message_id).catch(() => { });
                                        bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => { });

                                        if (isValidSolanaAddress(address)) {
                                            bot.sendMessage(chatId, `<strong>${await t('withdrawal.p7', userId)}
${await t('messages.fee', userId)}

• ${await t('withdrawal.p8', userId)} : <code>${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)} — ${wallet.label}</code>
• ${await t('withdrawal.p9', userId)} : <code>${address}</code>

• ${await t('withdrawal.p10', userId)} <code>${maxSendable} SOL</code>

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
                                    })
                                })
                        })
                    })
            }
        }
        // Wallets -> Switch
        if (
            sel_action === "wallets_switch" ||
            sel_action === "wallets_switch_refresh"
        ) {
            editSwitchWalletsMessage(bot, chatId, userId, messageId);
            return;
        }

        // if (sel_action === "wallets_switch_generate") {
        //     const { publicKey, secretKey } = walletCreate();
        //     user.wallets.push({ publicKey, secretKey, is_active_wallet: false });
        //     await user.save();
        //     editSwitchWalletsMessage(bot, chatId, userId, messageId);
        //     return;
        // }

        if (sel_action === "wallets_create") {
            bot.sendMessage(chatId, `${await t('messages.createName', userId)}`, {
                reply_markup: { force_reply: true },
            }).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const walletName = reply.text?.trim();

                        if (!walletName || hasSpecialCharacters(walletName)) {
                            await bot.sendMessage(chatId, `${await t('errors.invalidwWalletName1', userId)}`);
                            return;
                        }

                        // Reload the user fresh from DB to avoid race conditions
                        const freshUser = await User.findOne({ userId: user.userId });
                        if (!freshUser) {
                            await bot.sendMessage(chatId, `${await t('errors.invalidUser', userId)}`);
                            return;
                        }

                        // Check for duplicate wallet name
                        if (freshUser.wallets.some(wallet => wallet.label === walletName)) {
                            await bot.sendMessage(chatId, `${await t('errors.invalidwWalletName2', userId)}`);
                            return;
                        }

                        // wallet limit
                        if (freshUser.wallets.length >= settings.wallets) {
                            await bot.sendMessage(chatId, `${await t('errors.walletLimit', userId)} ${settings.wallets}`);
                            return;
                        }

                        // Create the new wallet
                        const keypair = Keypair.generate();
                        const publicKey = keypair.publicKey.toBase58();
                        const secretKeyBase58 = bs58.encode(keypair.secretKey);
                        const secretKey = encryptSecretKey(secretKeyBase58, "password");
                        // const secretKey = bs58.encode(keypair.secretKey);
                        freshUser.wallets.push({ label: walletName, publicKey, secretKey, is_active_wallet: false });
                        await freshUser.save();

                        // Confirm wallet creation
                        const sent = await bot.sendMessage(chatId, `${await t('messages.createSuccess1', userId)} "${walletName}" ${await t('messages.createSuccess2', userId)}`);

                        // Optionally update UI, e.g., show updated wallet list
                        editSwitchWalletsMessage(bot, chatId, userId, messageId);

                        setTimeout(() => {
                            bot.deleteMessage(chatId, sent.message_id);
                        }, 5000);
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    }
                );
            });

            return;
        }

        if (sel_action === 'wallets_import') {
            getImportWallet(bot, chatId, userId)
        }

        if (sel_action?.startsWith("wallets_switch_index_")) {
            const index = Number(sel_action.split("wallets_switch_index_")[1]);
            active_wallet.is_active_wallet = false;
            wallets[index].is_active_wallet = true;
            await user.save();
            editSwitchWalletsMessage(bot, chatId, userId, messageId);
            return;
        }

        // Wallets -> Export
        if (sel_action === "wallets_export") {
            const imagePath = "./src/assets/privateKey.jpg"; // Ensure the image is in this path
            bot.deleteMessage(chatId, messageId);
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
            bot.deleteMessage(chatId, messageId);
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            return;
        }

        if (sel_action === "wallets_private_key") {
            bot.deleteMessage(chatId, messageId);
            sendPrivateKeyWalletMessageWithImage(bot, chatId, userId, messageId);
        }

        if (sel_action?.startsWith("wallets_private_key_")) {
            // Extract the wallet index from the action, e.g., "wallets_private_key_2"
            bot.deleteMessage(chatId, messageId);
            console.log('debug wallets_private_key_', sel_action);
            const index = Number(sel_action.split("wallets_private_key_")[1]);
            const user = await User.findOne({ userId });
            if (!user || !user.wallets || !user.wallets[index]) {
                bot.sendMessage(chatId, `${await t('errors.invalidselection', userId)}`);
                return;
            }
            const selectedWallet = user.wallets[index];
            if (!selectedWallet) {
                bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                return;
            }

            const { secretKey, publicKey, label } = selectedWallet;
            const decrypted = decryptSecretKey(secretKey, "password");
            if (!decrypted || !publicKey) {
                bot.sendMessage(chatId, `${await t('errors.invalidsecretkey', userId)}`);
                return;
            }

            const imagePath = "./src/assets/privateKey.jpg";
            function escapeMarkdownV2(text: string): string {
                return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            }
            const safeTxLink = escapeMarkdownV2(`https://solscan.io/account/${publicKey}`);
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
            await bot.deleteMessage(chatId, messageId);
            const index = Number(sel_action.split("copy_to_clipboard_")[1]);
            const user = await User.findOne({ userId });

            if (!user || !user.wallets || !user.wallets[index]) {
                bot.sendMessage(chatId, `${await t('errors.invalidCopy1', userId)}`);
                return;
            }

            const selectedWallet = user.wallets[index];
            const { secretKey, publicKey, label } = selectedWallet;
            const decrypted = decryptSecretKey(secretKey, "password");

            if (!decrypted) {
                bot.sendMessage(chatId, `${await t('errors.invalidCopy2', userId)}`);
                return;
            }

            const imagePath = "./src/assets/privateKey.jpg";
            function escapeMarkdownV2(text: string): string {
                return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
            }
            const safeTxLink = escapeMarkdownV2(`https://solscan.io/account/${publicKey}`);
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


        //  if (sel_action === "wallets_export_confirm") {
        //     const secretKey = user.wallets.find(
        //         (wallet) => wallet.is_active_wallet,
        //     )?.secretKey;
        //     if (!secretKey) throw new Error("Active wallet not found");
        //     bot.editMessageText(
        //         `🔐 Here's your private key:
        //         ||${secretKey}|| \\(click to reveal\\)

        //         __DO NOT SHARE IT WITH ANYONE__
        //         Once you're done, press \*_DELETE MESSAGE_* button below`,
        //         {
        //             chat_id: chatId,
        //             message_id: messageId,
        //             parse_mode: "MarkdownV2",
        //             reply_markup: {
        //                 inline_keyboard: [
        //                     [
        //                         { text: "🔐 Delete Message", callback_data: "wallets_export_confirm_delete" },
        //                     ],
        //                 ],
        //             },
        //         },
        //     );
        //     return;
        // }

        if (sel_action === "wallets_export_confirm_delete") {
            bot.deleteMessage(chatId, messageId);
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            return;
        }

        // Wallets -> Rename
        if (sel_action === "wallets_rename") {
            console.log('debug wallets_rename', sel_action);
            bot.deleteMessage(chatId, messageId);
            sendRenameWalletMessage(bot, chatId, userId, messageId);
        }

        if (sel_action?.startsWith("wallets_rename_")) {
            console.log('debug wallets_rename_', sel_action);
            const index = Number(sel_action.split("wallets_rename_")[1]);
            bot.sendMessage(
                chatId,
                `${await t('messages.renameWallet1', userId)}`,
                { reply_markup: { force_reply: true } },
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const newName = reply.text?.trim();
                        if (!newName) {
                            bot.sendMessage(chatId, `${await t('errors.invalidwWalletName1', userId)}`);
                        } else {
                            user.wallets[index].label = newName;
                            await user.save();
                            const sent = await bot.sendMessage(
                                chatId,
                                `${await t('messages.renameWallet2', userId)} "<b>${newName}</b>".`,
                                { parse_mode: "HTML" }
                            );
                            setTimeout(() => {
                                bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                            }, 5000);
                            editRenameWalletMessage(bot, chatId, userId, messageId);
                        }
                        bot.deleteMessage(chatId, sentMessage.message_id);
                        bot.deleteMessage(chatId, reply.message_id);
                    },
                );
            });
            return;
        }

        // Wallets -> Delete
        if (sel_action === "wallets_delete") {
            bot.deleteMessage(chatId, messageId);
            sendDeleteWalletMessage(bot, chatId, userId, messageId);
            return;
        }

        if (sel_action === "wallets_delete_cancel") {
            bot.deleteMessage(chatId, messageId);
            return;
        }

        //  if (sel_action === "wallets_private_key") {
        //     sendPrivateKeyWalletMessageWithImage(bot, chatId, userId, messageId);
        // }
        // if (sel_action === "wallets_private_key") {
        //     console.log('debug wallets_private_key', sel_action);
        //     editPrivateKeyWalletMessage(bot, chatId, userId, messageId);
        //     return;
        // }

        // if (sel_action === "settings") {
        //     sendPrivateKeyWalletMessage(bot, chatId, userId, messageId);
        // } 

        // if (sel_action?.startsWith("wallets_private_key_")) {
        //     console.log('debug wallets_private_key_', sel_action);
        //     const index = Number(sel_action.split("wallets_private_key_")[1]);

        //     // Step 2: Retrieve the user and the selected wallet
        //     const user = await User.findOne({ userId });
        //     if (!user || !user.wallets || !user.wallets[index]) {
        //         return bot.sendMessage(chatId, "❌ Invalid wallet selection.");
        //     }

        //     const selectedWallet = user.wallets[index];
        //     const privateKey = selectedWallet.secretKey;

        //     if (!privateKey) {
        //         return bot.sendMessage(chatId, "❌ Private key not found for this wallet.");
        //     }

        //     // Step 3: Display the private key immediately in <code> (inline code format)
        //     const privateKeyMessage = `<code>${privateKey}</code>`; // Inline code formatting

        //     // Step 4: Send the private key and inform the user it is ready to be copied
        //     bot.sendMessage(chatId, privateKeyMessage, {
        //         parse_mode: "HTML",
        //     });

        //     // Optional: Clean up any previous messages if needed
        //     // bot.deleteMessage(chatId, message_id_of_previous_instructions); // Add cleanup if needed
        //     return;
        // }

        if (sel_action === "wallets_back") {
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
        }

        if (sel_action === "wallets_default") {
            // Set the first wallet as the default active wallet
            // if (user.wallets.length > 0) {
            //     user.wallets.forEach(wallet => wallet.is_active_wallet = false);
            //     user.wallets[0].is_active_wallet = true;
            //     await user.save();
            editSwitchWalletsMessage(bot, chatId, userId, messageId);
            // } else {
            //     bot.sendMessage(chatId, "❌ No wallets available to set as default.");
            // }
            // return;
        }

        if (sel_action?.startsWith("wallets_delete_confirm_")) {
            // bot.deleteMessage(chatId, messageId);
            console.log('debug wallets_delete_confirm_', sel_action);
            const indexStr = sel_action.replace("wallets_delete_confirm_", "");
            const index = parseInt(indexStr, 10);
            if (isNaN(index) || index < 0 || index >= user.wallets.length) {
                bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                return;
            }
            if (!user || !user.wallets || user.wallets.length === 1) {
                const error = bot.sendMessage(chatId, `${await t('errors.walletNotFound', userId)}`);
                setTimeout(async () => {
                    bot.deleteMessage(chatId, (await error).message_id);
                }, 5000);
                return;
            }
            const wallet = user.wallets[index];
            user.wallets.splice(index, 1);
            await user.save();
            // console.log('debug wallets_delete_confirm_ index', wallet);
            // Show success message and navigate back to wallets
            const sent = await bot.sendMessage(
                chatId,
                `${await t('messages.deleteWallet1', userId)} "<b>${wallet.label}</b>" ${await t('messages.deleteWallet2', userId)}\n\n${await t('messages.deleteWallet3', userId)}`,
                { parse_mode: "HTML" }
            );

            // Delete the confirmation dialog
            if (messageId > 0) {
                try {
                    await bot.deleteMessage(chatId, messageId);
                } catch (e) {
                    // Ignore if already deleted or not found
                }
            }

            // Wait a moment then delete success message and show updated wallets
            setTimeout(async () => {
                try {
                    await bot.deleteMessage(chatId, sent.message_id);
                    // Send fresh wallets message
                } catch (e) {
                    // If deletion fails, just send new wallets message
                    sendWalletsMessageWithImage(bot, chatId, userId, 0);
                }
            }, 5000);
            sendWalletsMessageWithImage(bot, chatId, userId, messageId);
            // editDeleteWalletMessage(bot, chatId, userId, messageId);
            return;
        }

        // Handle wallets_delete_[index] (where index is a number)
        if (sel_action?.match(/^wallets_delete_\d+$/)) {
            bot.deleteMessage(chatId, messageId);
            const index = Number(sel_action.split("wallets_delete_")[1]);
            const wallet = user.wallets[index];
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

        //positions
        if (sel_action == "positions") {
            bot.deleteMessage(chatId, messageId);
            sendPositionsMessageWithImage(bot, chatId, userId, messageId, 0, 0, wallets[0].label);
        }

        if (sel_action?.startsWith('positions_refresh_')) {
            const now = Date.now();
            let spamData = userRefreshCounts.get(userId)

            // Reset count if time window has passed
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
            const { caption, markup } = await getSell(userId, _selltoken);
            // const imagePath = "./src/assets/Sell.jpg"; // Ensure the image is in this path
            bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup: markup,
            });
        }

        if (sel_action?.startsWith('positions_wallet_left_')) {
            const index = Number(sel_action.split('positions_wallet_left_')[1])
            if (!isNaN(index)) {
                const newIndex = index === 0 ? wallets.length - 1 : index - 1
                // console.log("wallet", wallets.length);
                // console.log(newIndex)
                const label = wallets[newIndex].label
                // console.log(wallets[1]);
                editPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith('positions_wallet_right_')) {
            const index = Number(sel_action.split('positions_wallet_right_')[1]);
            if (!isNaN(index)) {
                const newIndex = (index + 1) % wallets.length;
                console.log(newIndex)
                const label = wallets[newIndex].label;
                editPositionsMessage(bot, chatId, userId, messageId, newIndex, 0, label)
            }
        } else if (sel_action?.startsWith(`positions_page_left_`)) {
            const indexNumbers = sel_action.match(/\d+/g);
            if (indexNumbers) {
                const current_wallet = Number(indexNumbers[0])
                const page = Number(indexNumbers[1])
                console.log('current_wallet', current_wallet, page)
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
                console.log('current_wallet', current_wallet, page)
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
                // { parse_mode: "HTML", reply_markup: { force_reply: true } },
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
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
                                console.log('debug-> found this token', currentWallet.publicKey, page)
                                editPositionsMessage(bot, chatId, userId, messageId, current_wallet, page, label)
                            } else {
                                console.log('Have not this token');
                                const sent = bot.sendMessage(
                                    chatId,
                                    `${await t('messages.positionImport2', userId)}`,
                                    { parse_mode: "HTML" })
                                setTimeout(async () => {
                                    bot.deleteMessage(chatId, (await sent).message_id);
                                }, 5000);
                            }
                            setTimeout(() => {
                                bot.deleteMessage(chatId, sentMessage.message_id);
                                bot.deleteMessage(chatId, reply.message_id);
                            }, 5000);
                        }
                    });
            });
            return;
        }

        // Setting
        if (sel_action === "settings") {
            bot.deleteMessage(chatId, messageId);
            sendSettingsMessageWithImage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_fee") {
            editFeeMessage(bot, chatId, userId, messageId);
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
                bot.once('text',
                    async function handleReply(reply) {
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
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 5000);
                    }
                );
            });
        }

        if (sel_action === "settings_buy_slippage" || sel_action === "settings_sell_slippage") {
            bot.deleteMessage(chatId, messageId);
            sendSlippageMessage(bot, chatId, userId, messageId);
        }

        if (sel_action === "settings_slippage") {
            editSlippageMessage(bot, chatId, userId, messageId);
            // sendSlippageMessage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_slippage_buy" || sel_action === "settings_slippage_sell") {
            bot.sendMessage(
                chatId,
                `${await t('messages.slippageInput', userId)}`,
                // {
                //     reply_markup: {
                //         force_reply: true,
                //     },
                // },
            ).then((sentMessage) => {
                bot.once('text',
                    async (reply) => {
                        const slippageValue = Number(reply.text || "");
                        if (isNaN(slippageValue) || slippageValue < 0 || slippageValue > 100) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSlippage', userId)}`,
                                // { reply_markup: { force_reply: true } },
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 10000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
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
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 5000);
                    },
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

        //settings->young token

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
                    async (reply) => {
                        const date = Number(reply.text || "");
                        if (isNaN(date) || date < 1 || date > 24) {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidyoung', userId)}`,
                            ).then((newSentMessage) => {
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, newSentMessage.message_id).catch(() => { });
                                }, 6000);
                                bot.once('text',
                                    async (newReply) => {
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
                                        bot.deleteMessage(chatId, newReply.message_id);
                                    },
                                );
                            });
                        } else {
                            user.settings.youngTokenDate = date;
                            await user.save();
                            editSettingsMessage(bot, chatId, userId, messageId);
                        }
                        setTimeout(() => {
                            bot.deleteMessage(chatId, sentMessage.message_id);
                            bot.deleteMessage(chatId, reply.message_id);
                        }, 5000);
                    }
                );
            });
        }

        //settings>quick
        if (sel_action === 'settings_quick_buy' || sel_action === 'settings_quick_buy_refresh') {
            bot.deleteMessage(chatId, messageId);
            sendQuickBuyMessage(bot, chatId, userId, messageId);
        }
        else if (sel_action?.startsWith('settings_quick_buy_amount_')) {
            const index = Number(sel_action?.split('settings_quick_buy_amount_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, `${await t('messages.quickBuy', userId)}`)
                    .then(sentMessage => {
                        bot.once('text', async reply => {
                            const buy_amount = Number(reply.text)
                            if (isNaN(buy_amount) || buy_amount < 0) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.invalidBuy', userId)}`)
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, errorMessage.message_id);
                                }, 5000);
                            } else {
                                user.settings.quick_buy.buy_amount[index] = buy_amount
                                await user.save()
                                editQuickBuyMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                                bot.deleteMessage(chatId, reply.message_id);
                            }, 5000);
                        })
                    })
            }

        }

        if (sel_action === 'settings_quick_sell' || sel_action === 'settings_quick_sell_refresh') {
            bot.deleteMessage(chatId, messageId);
            sendQuickSellMessage(bot, chatId, userId, messageId)
        } else if (sel_action?.startsWith('settings_quick_sell_percent_')) {
            const index = Number(sel_action?.split('settings_quick_sell_percent_')[1])
            if (!isNaN(index)) {
                bot.sendMessage(chatId, `${await t('messages.quickSell', userId)}`)
                    .then(sentMessage => {
                        bot.once('text', async reply => {
                            const sell_percent = Number(reply.text)
                            if (isNaN(sell_percent) || sell_percent < 0 || sell_percent > 100) {
                                const errorMessage = await bot.sendMessage(chatId, `${await t('errors.invalidSell', userId)}`)
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, errorMessage.message_id);
                                }, 5000);
                            } else {
                                user.settings.quick_sell.sell_percent[index] = sell_percent
                                await user.save()
                                editQuickSellMessage(bot, chatId, userId, messageId)
                            }
                            setTimeout(() => {
                                bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                                bot.deleteMessage(chatId, reply.message_id);
                            }, 5000);
                        })
                    })
            }

        }

        if (sel_action === "settings_back") {
            bot.deleteMessage(chatId, messageId);
            sendSettingsMessageWithImage(bot, chatId, userId, messageId);
        } else if (sel_action === "settings_fee_back") {
            editFeeMessage(bot, chatId, userId, messageId);
        } else if (sel_action === "autotip_refresh") {
            editFeeAutoMessage(bot, chatId, userId, messageId);
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

        if (sel_action === "settings_refresh") {
            editFeeMessage(bot, chatId, userId, messageId);
        }

        //settings -> PNL image
        if (sel_action === "settings_image") {
            user.settings.image_activation = !user.settings.image_activation;
            await user.save();
            editSettingsMessage(bot, chatId, userId, messageId);
            // editAutoSellMessage(bot, chatId, userId, messageId);
        }

        //Settings -> auto_sell
        if (sel_action === "settings_auto_sell") {
            sendAutoSellMessage(bot, chatId, userId, messageId);
            bot.deleteMessage(chatId, messageId);
        }
        if (sel_action === "settings_auto_Sell_toggle") {
            user.settings.auto_sell.enabled = !user.settings.auto_sell.enabled;
            await user.save();
            editMessageReplyMarkup(bot, chatId, userId, messageId);
            // editAutoSellMessage(bot, chatId, userId, messageId);
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
        // if (sel_action === "settings_auto_Sell_add_rule") {
        //     bot.sendMessage(
        //         chatId,
        //         `Reply with the percent of tokens you want to auto sell. 10 -> 10%, 20 -> 20%`,
        //         // { reply_markup: { force_reply: true } },
        //     ).then((sentMessage) => {
        //         bot.once('text',
        //             async (reply) => {
        //                 const autoSellPercent = Number(reply.text || "");
        //                 if (
        //                     isNaN(autoSellPercent) ||
        //                     autoSellPercent <= 0 ||
        //                     autoSellPercent > 100
        //                 ) {
        //                     bot.sendMessage(
        //                         chatId,
        //                         `❌ Validation error: Invalid trade amount. Please enter a value between 1 and 100.`,
        //                     );
        //                 } else {
        //                     user.settings.auto_sell.sellPercent = autoSellPercent;
        //                     await user.save();
        //                     editMessageReplyMarkup(bot, chatId, userId, messageId);
        //                 }
        //                 bot.deleteMessage(chatId, sentMessage.message_id);
        //                 bot.deleteMessage(chatId, reply.message_id);
        //             },
        //         );
        //     });
        //     return;
        // }
        // if(sel_action === "settings_auto_Sell_Sell_once"){
        //     user.settings.auto_sell.sellOnce = !user.settings.auto_sell.sellOnce;
        //     await user.save();
        //     editMessageReplyMarkup(bot, chatId, userId, messageId);
        // }
        if (sel_action === "settings_auto_Sell_tp_sl") {
            editprofitLevelMessage(bot, chatId, userId, messageId)
        }

        if (sel_action === "autoSell_tp") {
            const sentMessage = await bot.sendMessage(
                chatId,
                `${await t('messages.tp', userId)}`
            );

            bot.once('text', async (reply) => {
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

                    bot.once('text', async (newReply) => {
                        const newTpPercent = Number(newReply.text || "");
                        await bot.deleteMessage(chatId, newReply.message_id).catch(() => { });

                        if (isNaN(newTpPercent) || newTpPercent <= 0 || newTpPercent > 100) {
                            await bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidTp', userId)}`
                            );
                        } else {
                            user.settings.auto_sell.takeProfitPercent = newTpPercent;
                            await user.save();
                            editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                        }
                    });
                } else {
                    user.settings.auto_sell.takeProfitPercent = TpPercent;
                    await user.save();
                    editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                }
            });

            return;
        }

        if (sel_action === "autoSell_sl") {
            const sentMessage = await bot.sendMessage(
                chatId,
                `${await t('messages.sl', userId)}`
            );

            bot.once('text', async (reply) => {
                const SlPercent = Number(reply.text || "");
                await bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                await bot.deleteMessage(chatId, reply.message_id).catch(() => { });

                // Stop loss must be negative (e.g., -10 for -10%)
                if (isNaN(SlPercent) || SlPercent >= 0 || SlPercent < -100) {
                    const errorMessage = await bot.sendMessage(
                        chatId,
                        `${await t('errors.invalidSl', userId)}`
                    );

                    setTimeout(() => {
                        bot.deleteMessage(chatId, errorMessage.message_id).catch(() => { });
                    }, 10000);

                    bot.once('text', async (newReply) => {
                        const newSlPercent = Number(newReply.text || "");
                        await bot.deleteMessage(chatId, newReply.message_id).catch(() => { });

                        if (isNaN(newSlPercent) || newSlPercent >= 0 || newSlPercent < -100) {
                            await bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidSl', userId)}`
                            );
                        } else {
                            user.settings.auto_sell.stopLossPercent = newSlPercent;
                            await user.save();
                            editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                        }
                    });
                } else {
                    user.settings.auto_sell.stopLossPercent = SlPercent;
                    await user.save();
                    editProfitlevelMessageReplyMarkup(bot, chatId, userId, messageId);
                }
            });
            return;
        }

        // Settings -> language
        if (sel_action === "settings_language") {
            // sendLanguageMessage(bot, chatId, userId, messageId);
            // bot.deleteMessage(chatId, messageId);
            bot.editMessageCaption(
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
        }

        if (sel_action === "settings_language_en") {
            await setUserLanguage(userId, 'en');

            // const message = await t('language.changed_to_english', userId); // Add this to your en.ts
            // await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });

            // bot.deleteMessage(chatId, messageId);
            // sendSettingsMessageWithImage(bot, chatId, userId, messageId);
            try {
                bot.editMessageCaption(
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
            } catch (error) {
                console.error("Error editing message caption:", error);
            }
        }

        if (sel_action === "settings_language_fr") {
            await setUserLanguage(userId, 'fr');

            // const message = await t('language.changed_to_french', userId); // Add this to your en.ts
            // await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
            // bot.deleteMessage(chatId, messageId);
            // sendSettingsMessageWithImage(bot, chatId, userId, messageId);

            bot.editMessageCaption(
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
        }

        // Trending Coin
        if (sel_action === "trending_coin") {
            await bot.deleteMessage(chatId, messageId);
            sendTrendingPageMessage(bot, chatId, userId, 1); // always start on page 1
        }

        // Next / Previous page (edit same message)
        if (sel_action?.startsWith("trending_page_")) {
            const page = parseInt(sel_action.split("_").pop()!);
            await editTrendingPageMessage(bot, chatId, messageId, userId, page);
        }

        // Refresh current page (edit same message)
        if (sel_action?.startsWith("refresh_trending_")) {
            const page = parseInt(sel_action.split("_").pop()!);
            await editTrendingPageMessage(bot, chatId, messageId, userId, page);
        }

        // Help
        else if (sel_action === "help") {
            sendHelpMessageWithImage(bot, chatId, userId, messageId);
            if (messageId) {
                try {
                    await bot.deleteMessage(chatId, messageId);
                } catch (e) {
                    // Ignore if already deleted or not found
                }
            }
        }
    } catch (error) { }
});

async function setBotCommands() {
    bot.setMyCommands([
        { command: "/start", description: `${await t('commands.start')}` },
        // { command: "/referrals", description: "View your Nebual referrals." },
        { command: "/menu", description: `${await t('commands.menu')}` },
        { command: "/settings", description: `${await t('commands.setting')}` },
        { command: "/wallets", description: `${await t('commands.wallet')}` },
        { command: "/positions", description: `${await t('commands.position')}` },
        // { command: "/sniper", description: "Launch the Foxy sniper." },
        // { command: "/copytrade", description: "Foxy Copy-Trading." },
        // { command: "/orders", description: "View limit orders." },
    ])
        .then(() => {
            console.log("Commands have been set successfully.");
        })
        .catch((err) => {
            console.error("Error setting commands:", err);
        });
}

setBotCommands();
// Auto sell manin

export async function checkAndAutoSell() {
    console.log("🔍 Running auto-sell check...");

    const orders = await limitOrderData.find({ status: "Pending" });

    for (const order of orders) {
        try {
            //@ts-ignore
            const currentPrice = Number(await getTokenPrice(order.token_mint));
            // if (!currentPrice) continue;

            console.log(`💰 Token ${order.token_mint}: current price $${currentPrice}, target $${order.target_price1} & $${order.target_price2}`);

            if (currentPrice >= order.target_price1 || currentPrice <= order.target_price2) {
                console.log(`🚀 Triggering auto-sell for ${order.token_mint} (user ${order.user_id})`);
                const id = order.user_id;
                const wallet = order.wallet;
                const address = order.token_mint;
                const tp = order.Tp;
                const sl = order.Sl;
                // const sellPercent =Number(order.auto_sell_percent);
                const amount = order.token_amount;
                console.log(wallet, address, id, amount)
                const result = await swapToken(
                    id,
                    wallet,
                    address,
                    100,
                    "sell",
                    50,
                    0.0005 * 10 ** 9,
                    amount
                );

                if (result?.success) {
                    await limitOrderData.updateOne(
                        { _id: order._id },
                        { $set: { status: "Success" } }
                    );
                    const user = await User.findOne({ userId: order.user_id });
                    if (!user) throw "No User";
                    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
                    if (!settings) throw new Error("Tipping settings not found!");
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
                    // console.log("token_price", priceNative);

                    if (currentPrice >= order.target_price1) {
                        const message = `${await t('messages.autoSell1', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('messages.autoSell3', order.user_id)} ${tp}%
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(4)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(4)}\n
${await t('messages.autoSell6', order.user_id)}`
                        // Target: $${order.target_price1.toFixed(4)} & $${order.target_price2.toFixed(4)}`
                        await bot.sendMessage(order.user_id, message);
                        let adminFeePercent;
                        if (user.userId === 7994989802 || user.userId === 2024002049) {
                            adminFeePercent = 0;
                        } else {
                            adminFeePercent = settings.feePercentage / 100;
                        }
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
                        await user.save();
                    }
                    if (currentPrice < order.target_price2) {
                        let adminFeePercent;
                        if (user.userId === 7994989802 || user.userId === 2024002049) {
                            adminFeePercent = 0;
                        } else {
                            adminFeePercent = settings.feePercentage / 100;
                        }
                        const message1 = `${await t('messages.autoSell7', order.user_id)}\n
${await t('messages.autoSell2', order.user_id)} ${order.token_mint}\n
${await t('💸 Stop Loss :', order.user_id)} ${sl}%
${await t('messages.autoSell4', order.user_id)} $${currentPrice.toFixed(4)}
${await t('messages.autoSell5', order.user_id)} $${(currentPrice * amount).toFixed(4)}\n
${await t('messages.autoSell8', order.user_id)}`
                        // Target: $${order.target_price1.toFixed(4)} & $${order.target_price2.toFixed(4)}`
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
                        await user.save();
                    }
                    console.log(`✅ Sold ${order.token_mint} for user ${order.user_id}`);
                    // wallet?.tradeHistory.push({
                    //     transaction_type: "sell",
                    //     token_address: tokenAddress.toString(),
                    //     amount: amount,
                    //     token_price: priceUsd,
                    //     token_amount: tokenAmount,
                    //     token_balance: tokenBalance,
                    //     mc: market_cap
                    // });
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
}

const updateSolanaPrice = async () => {
    setSolPrice(await getSolanaPrice());
};

// const updatedTokenPrice = async () => {
//     setTokenPrice(await getTokenPrice("D1bc2VPHarFbDPhGD4o24DL8MJHnRBnB6GoCGkZEpump"));
// }

const main = async () => {
    updateSolanaPrice();
    // updatedTokenPrice();
    checkAndAutoSell();
    setInterval(() => {
        // checkAndAutoSell();
        updateSolanaPrice();
        // updatedTokenPrice();
    }, 18000);
    setInterval(() => {
        checkAndAutoSell();
    }, 10000);
    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");
    setInterval(async () => {
        settings.BotStatus = new Date();
        await settings.save();
    }, 10000);
};

main();

console.log("Bot is running...");
