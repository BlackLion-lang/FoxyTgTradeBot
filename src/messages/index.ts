import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { getBalance, getSolPrice, walletCreate, getSolanaPrice } from "../services/solana";
import { getWalletMessage } from "../utils/config";
import { getAdminPanelMarkup, getMenuMarkup } from "../utils/markup";
import { WhiteListUser } from "../models/whitelist";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array } from "../config/security";
import { t } from "../locales";
import { error } from "console";
import { TippingSettings } from "../models/tipSettings";
import { PendingUser } from "../models/pendingUser";


export const getAdminMenu = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    let user = await User.findOne({ userId });
    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");
    const status = settings.WhiteListUser ? "🟢" : "🔴";
    // if (!user) {
    //     const newUser = new User();
    //     newUser.userId = userId;
    //     newUser.username = username;
    //     newUser.first_name = first_name;
    //     const { publicKey, secretKey } = walletCreate();
    //     newUser.wallets.push({
    //         publicKey,
    //         secretKey,
    //         is_active_wallet: true,
    //     });
    //     await newUser.save();
    //     user = newUser;
    // }

    // const publicKey = user.wallets.find(
    //     (wallet) => wallet.is_active_wallet,
    // )?.publicKey;

    // if (!publicKey) {
    //     throw new Error("Active wallet not found");await swap 
    // }

    // const balance = await getBalance(publicKey);
    const sol_price = getSolPrice();
    const adminBalance = settings.adminSolAddress.publicKey ? await getBalance(settings.adminSolAddress.publicKey) : 0;
    settings.adminSolAddress.balance = adminBalance;
    await settings.save()

    let caption =
        `<strong>${await t('admin.p1', userId)}</strong>\n\n` +
        `${await t('admin.p2', userId)}\n\n` +
        // `${await t('Whitelist Setting', userId)} : ${status}\n\n` +
        `${await t('admin.tipPercentage', userId)} : ${settings.feePercentage}%\n` +
        `${await t('admin.solanaPrice', userId)} : ${sol_price} $\n\n` +
        `${await t('admin.adminWallet', userId)} : <strong>${settings.adminSolAddress.label ? settings.adminSolAddress.label : `${await t('admin.walletName', userId)}`}</strong>\n\n` +
        `${await t('admin.p3', userId)} : <code>${settings.adminSolAddress.publicKey ? settings.adminSolAddress.publicKey : `${await t('admin.walletName', userId)}`}</code>\n\n` +
        `${await t('admin.p4', userId)} : ${adminBalance.toFixed(4)} SOL - ${(adminBalance * sol_price).toFixed(2)} $\n\n`;

    return { caption, markup: getAdminPanelMarkup };
};

export const getWelcome = async (
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    // Check if user is whitelisted by username or userId
    const whiteListUsers = await WhiteListUser.find({});
    const isWhitelisted = whiteListUsers.some((u) => {
        // Handle username comparison (with and without @ prefix)
        const whitelistUsername = u.telegramId.startsWith('@') ? u.telegramId.slice(1) : u.telegramId;
        const currentUsername = username.startsWith('@') ? username.slice(1) : username;

        return whitelistUsername === currentUsername;
    });

    let caption =
        `<strong>🦊 ${await t('welcome.p1', userId)}</strong>\n\n` +
        `${await t('welcome.p2', userId)}, ${username} ! \n${await t('welcome.p3', userId)}\n` +
        `${await t('welcome.p4', userId)}\n` +
        `${await t('welcome.p5', userId)}\n\n` +
        `${await t('welcome.p6', userId)} \n` +
        `${await t('welcome.p7', userId)}\n`;

    // Custom inline keyboard
    let buttons: any[] = [];

    // Build the inline keyboard buttons
    if (userId === 7994989802 || userId === 2024002049) {
        // Admin user: show admin panel button
        buttons = [
            [
                { text: `${await t('welcome.request', userId)}`, url: "https://the-cryptofox-learning.com/fonctions/__bot_trading_tcfl/request_access_bot_trading_form.php" },
                { text: `${await t('welcome.visit', userId)}`, url: "https://the-cryptofox-learning.com/" },
            ],
            [{ text: `${await t('welcome.admin', userId)}`, callback_data: "admin_panel" }],
        ];
    } else {
        buttons = [
            [{ text: `${await t('welcome.request', userId)}`, url: "https://the-cryptofox-learning.com/fonctions/__bot_trading_tcfl/request_access_bot_trading_form.php" }],
            [{ text: `${await t('welcome.visit', userId)}`, url: "https://the-cryptofox-learning.com/" }],
        ];
    }

    const markup = {
        inline_keyboard: buttons,
    };

    return { caption, markup };
};

export const getMenu = async (
    userId: number,
    username: string = "",
    first_name: string = "",
): Promise<{ caption: string; markup: any }> => {
    let user = await User.findOne({ userId });
    // console.log('user', user)
    if (!user) {

        const newUser = new User();
        newUser.userId = userId;
        newUser.username = username;
        newUser.first_name = first_name;
        const { publicKey, secretKey } = walletCreate();
        const balance = await getBalance(publicKey);
        // console.log('publicKey', publicKey, 'secretKey', secretKey)
        newUser.wallets.push({
            publicKey,
            secretKey,
            is_active_wallet: true,
            balance
        });

        // newUser.wallet.publicKey = publicKey
        // newUser.wallet.secretKey = secretKey
        await newUser.save();
        user = newUser;
    }

    const publicKey = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    )?.publicKey;

    if (!publicKey) {
        // Create a new wallet if no active wallet is found
        const { publicKey: newPublicKey, secretKey: newSecretKey } = walletCreate();
        const balance = await getBalance(newPublicKey);
        user.wallets.push({
            publicKey: newPublicKey,
            secretKey: newSecretKey,
            is_active_wallet: true,
            balance
        });
        await user.save();
        // Use the new publicKey for further operations
        // (re-assign for use below)
        // Note: This assumes only one active wallet at a time
        return await getMenu(userId, username, first_name); // Re-run to use the new wallet
    }

    const balance = await getBalance(publicKey);

    const wallet = user.wallets.find(wallet => wallet.publicKey === publicKey);
    if (wallet) {
        wallet.balance = balance.toString();
        await user.save();
    } else {
        console.error('Wallet not found');
    }

    const res = await fetch("https://the-cryptofox-learning.com/_bot/_TrackerWalleTCFL/tokenisation/bot-eth/config/version-bot.php?json=1");
    const versionData = await res.json();


    const sol_price = getSolPrice();

    let caption =
        `<strong>${await t('menu.p1', userId)}, ${user.username} !</strong>\n\n` +
        // `${await t('menu.p2', userId)}\n` +
        `${await t('menu.p3', userId)}\n\n` +
        `<strong>${await t('menu.p4', userId)}</strong>\n` +
        `<strong>${user.username} (Default)</strong> : <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `<code>${publicKey}</code>\n\n` +
        `${await t('menu.p5', userId)}\n\n` +
        `🤖 Bot Telegram Version : <strong>${versionData.bot_telegram_version}</strong>\n` ;

    // `${await t('menu.p6', userId)}\n\n`;
    // `⚠️ Telegram ADs that might be displayed above are most likely a SCAM. We have no control over them. Please be cautious.`;

    return { caption, markup: getMenuMarkup(userId) };
};

export const sendAdminPanelMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username: string = "",
    first_name: string = "",
) => {
    try {
        // console.log('debug->')
        const { caption, markup } = await getAdminMenu(
            userId,
            username,
            first_name,
        );

        const imagePath = "./src/assets/Admin-panel.jpg"; // Ensure the image is in this path

        // Send the image first
        await bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: await getAdminPanelMarkup(userId),
        });
    } catch (error) {
        console.error("Error sending admin panel message:", error);
    }
};

export const editAdminPanelMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId?: number,
) => {
    try {
        const { caption, markup } = await getAdminMenu(userId);

        // Try to edit as text message first
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                parse_mode: "HTML",
                message_id: messageId,
                disable_web_page_preview: true,
                reply_markup: await getAdminPanelMarkup(userId),
            });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    parse_mode: "HTML",
                    message_id: messageId,
                    reply_markup: await getAdminPanelMarkup(userId),
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Settings message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing settings message:', error);
    }
};

export const sendWelcomeMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    userName: string = "",
    first_name: string = "",
) => {
    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");
    if (!settings.WhiteListUser) {
        sendMenuMessageWithImage(
            bot,
            chatId,
            userId,
            userName,
            first_name,
        );
    }
    else {
        // Check if user is whitelisted by username or userId
        const whiteListUsers = await WhiteListUser.find({});
        const isWhitelisted = whiteListUsers.some((u) => {
            // Handle username comparison (with and without @ prefix)
            const whitelistUsername = u.telegramId.startsWith('@') ? u.telegramId.slice(1) : u.telegramId;
            const currentUsername = userName.startsWith('@') ? userName.slice(1) : userName;

            return whitelistUsername === currentUsername;
        });
        if (isWhitelisted) {
            // If the user is whitelisted, send the menu messa
            sendMenuMessageWithImage(
                bot,
                chatId,
                userId,
                userName,
                first_name,
            );
            return;
        } else {
            const { caption, markup } = await getWelcome(
                userId,
                userName,
                first_name,
            );

            // Send the image first
            const imagePath = "./src/assets/welcome.jpg"; // Path to the image

            bot.sendPhoto(chatId, imagePath, {
                caption: caption,
                parse_mode: "HTML",
                reply_markup: markup,
            });
        }
    }
};

export const sendAddUserMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    inputUserId: string,
    messageId?: number,
) => {
    console.log('debug inputUserId', inputUserId, 'userId', userId, 'chatId', chatId);
    if (inputUserId !== null && inputUserId !== undefined) {
        try {
            // Check if user is already whitelisted
            let existing = await WhiteListUser.findOne({ telegramId: inputUserId });

            if (!existing) {
                const newWhitelistUser = new WhiteListUser();
                newWhitelistUser.telegramId = inputUserId;
                await newWhitelistUser.save();
                const sent = await bot.sendMessage(chatId, `${await t('messages.useradd', userId)}`);
                setTimeout(() => {
                    bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                }, 5000);
            } else {
                const error = await bot.sendMessage(chatId, `${await t('errors.alreadyWhitelist', userId)}`);
                setTimeout(() => {
                    bot.deleteMessage(chatId, error.message_id).catch(() => { });
                }, 5000);
            }
        } catch (err) {
            console.error("Error adding user to whitelist:", err);
        }
    }
    // try {
    //     const { caption, markup } = await getMenu(
    //         userId,
    //     );

    //     // Send the image first
    //     const imagePath = "./src/assets/dashboard.jpg"; // Path to the image

    //     bot.sendPhoto(chatId, imagePath, {
    //         caption: caption,
    //         parse_mode: "HTML",
    //         reply_markup: markup,
    //     });
    // } catch (error) { }
};

export const sendMenuMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    // messageId: number,
    username: string = "",
    first_name: string = "",
) => {
    try {
        const { caption, markup } = await getMenu(userId, username, first_name);

        // Send the image first
        const imagePath = "./src/assets/dashboard.jpg"; // Path to the image
        return bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: await getMenuMarkup(userId),
        });
    } catch (error) {
        console.error("Error sending menu message:", error);
        throw error;
    }
};

export const sendMenu = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    username: string = "",
    first_name: string = "",
) => {
    try {
        const { caption, markup } = await getMenu(userId, username, first_name);

        // Send the image first
        const imagePath = "./src/assets/dashboard.jpg"; // Path to the image
        return bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: await getMenuMarkup(userId),
        });
    } catch (error) {
        console.error("Error sending menu message:", error);
        throw error;
    }
};

export const sendMenuMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: any,
    username?: any,
    first_name?: any,
) => {
    try {
        const { caption, markup } = await getMenu(userId, username);
        const pending = await PendingUser.findOne({ userId })
        const user = await User.findOne({ userId });
        if (!user) throw "No User";
        console.log("User found:");
        if (pending) {
            if (pending.pendingReferrer && (!user.referredIdBy || user.referredIdBy === "None")) {
                // Prevent overwriting referral if already set
                if (!user.referredIdBy || user.referredIdBy === "None") {
                    user.referredIdBy = pending.pendingReferrer;
                    await user.save();
                }

                const referuser = await User.findOne({ userId: user.referredIdBy });
                if (!referuser) throw "No Referrer User";
                if (user.userId === referuser.userId) throw "Self-referral not allowed";

                // Check if referral already exists
                const alreadyReferred = referuser.referrals.some(
                    (r) => r.referredId === String(user.userId)
                );

                const existingUser = await User.findOne({ userId: user.userId });
                if (existingUser && existingUser.referredIdBy && existingUser.referredIdBy !== "None") {
                    console.log("Referral skipped: user already registered");
                    await PendingUser.deleteOne({ userId });
                    return;
                }

                if (!alreadyReferred) {
                    bot.sendMessage(
                        pending.pendingReferrer,
                        `${await t('messages.referral1')} ${user.username} ${await t('messages.referral2')}`
                    );
                    referuser.referrals.push({
                        referredId: user.userId,
                        referredName: pending.username || "Unknown",
                        date: new Date().toISOString(),
                    });
                    user.referredNameBy = referuser.username || "Unknown";
                }

                await referuser.save();
            }
            // cleanup pending
            await PendingUser.deleteOne({ userId });
        }
        else {
            console.log("Referral skipped due to whitelist restriction");
        }
        // Path to the image
        const imagePath = "./src/assets/dashboard.jpg"; // Ensure the image is in this path

        // Send the image first
        await bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: await getMenuMarkup(userId),
        });
    } catch (error) {
        console.error("Error sending menu message with image:", error);
    }
};

export const editMenuMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getMenu(userId);

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
                    reply_markup: await getMenuMarkup(userId),
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Menu message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing menu message:', error);
    }
};