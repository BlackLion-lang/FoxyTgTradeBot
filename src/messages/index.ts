import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { getBalance, getSolPrice, walletCreate, getSolanaPrice } from "../services/solana";
import { walletCreate as ethereumWalletCreate } from "../services/ethereum/wallet";
import { getBalance as getEthereumBalance, getEtherPrice } from "../services/ethereum/etherscan";
import { getWalletMessage } from "../utils/config";
import { getAdminPanelMarkup, getMenuMarkup, getSnippingSettingsMarkup } from "../utils/markup";
import { getUserChain } from "../utils/chain";
import { WhiteListUser } from "../models/whitelist";
import { SniperWhitelist } from "../models/sniperWhitelist";
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
    const userChain = await getUserChain(userId);
    
    // console.log('user', user)
    if (!user) {
        const newUser = new User();
        newUser.userId = userId;
        newUser.username = username;
        newUser.first_name = first_name;
        
        // Create wallet based on chain preference
        if (userChain === "ethereum") {
            const { publicKey, secretKey } = ethereumWalletCreate();
                    const balance = await getEthereumBalance(publicKey);
            newUser.ethereumWallets.push({
                publicKey,
                secretKey,
                is_active_wallet: true,
                balance: balance.toString(),
                label: "Start Wallet"
            });
        } else {
        const { publicKey, secretKey } = walletCreate();
        const balance = await getBalance(publicKey);
        newUser.wallets.push({
            publicKey,
            secretKey,
            is_active_wallet: true,
                balance: balance.toString()
        });
        }

        await newUser.save();
        user = newUser;
    }

    // Get active wallet based on chain
    let publicKey: string | undefined;
    let balance: number;
    let currencySymbol: string;
    let price: number;
    
    if (userChain === "ethereum") {
        // Ensure ethereumWallets array exists and has wallets
        // Check if array is empty or doesn't exist
        const hasEthereumWallets = user.ethereumWallets && user.ethereumWallets.length > 0;
        
        if (!hasEthereumWallets) {
            // No Ethereum wallets exist, create one
            const { publicKey: newPublicKey, secretKey: newSecretKey } = ethereumWalletCreate();
            balance = await getEthereumBalance(newPublicKey);
            user.ethereumWallets.push({
                publicKey: newPublicKey,
                secretKey: newSecretKey,
                is_active_wallet: true,
                balance: balance.toString(),
                label: "Start Wallet"
            });
            await user.save();
            return await getMenu(userId, username, first_name); // Re-run to use the new wallet
        }
        
        const activeWallet = user.ethereumWallets.find(
            (wallet) => wallet.is_active_wallet,
        );
        
        if (!activeWallet) {
            const { publicKey: newPublicKey, secretKey: newSecretKey } = ethereumWalletCreate();
            balance = await getEthereumBalance(newPublicKey);
            user.ethereumWallets.push({
                publicKey: newPublicKey,
                secretKey: newSecretKey,
                is_active_wallet: true,
                balance: balance.toString(),
                label: "Start Wallet"
            });
            await user.save();
            return await getMenu(userId, username, first_name); // Re-run to use the new wallet
        }
        
        publicKey = activeWallet.publicKey;
        balance = await getEthereumBalance(publicKey);
        price = await getEtherPrice();
        currencySymbol = "ETH";
        
        // Update balance in database
        const wallet = user.ethereumWallets.find(w => w.publicKey === publicKey);
        if (wallet) {
            wallet.balance = balance.toString();
            await user.save();
        }
    } else {
        const activeWallet = user.wallets?.find(
        (wallet) => wallet.is_active_wallet,
        );

        if (!activeWallet) {
        const { publicKey: newPublicKey, secretKey: newSecretKey } = walletCreate();
            balance = await getBalance(newPublicKey);
        user.wallets.push({
            publicKey: newPublicKey,
            secretKey: newSecretKey,
            is_active_wallet: true,
                balance: balance.toString()
        });
        await user.save();
        return await getMenu(userId, username, first_name); // Re-run to use the new wallet
    }

        publicKey = activeWallet.publicKey;
        balance = await getBalance(publicKey);
        price = getSolPrice();
        currencySymbol = "SOL";

        // Update balance in database
        const wallet = user.wallets.find(w => w.publicKey === publicKey);
    if (wallet) {
        wallet.balance = balance.toString();
        await user.save();
        }
    }

    if (!publicKey) {
        throw new Error("Unable to determine active wallet");
    }

    const res = await fetch("https://the-cryptofox-learning.com/_bot/_TrackerWalleTCFL/tokenisation/bot-eth/config/version-bot.php?json=1");
    const versionData = await res.json();

    const menuP2 = userChain === "ethereum" 
        ? await t('wallets.p2_ethereum', userId)
        : await t('wallets.p2_solana', userId);
    const menuP3 = userChain === "ethereum" 
        ? await t('menu.p3_ethereum', userId)
        : await t('menu.p3', userId);
    const menuP5 = userChain === "ethereum"
        ? await t('menu.p5_ethereum', userId)
        : await t('menu.p5', userId);

    let caption =
        `<strong>${await t('menu.p1', userId)}, ${user.username} !</strong>\n\n` +
        // `${await t('menu.p2', userId)}\n` +
        `${menuP3}\n\n` +
        `<strong>${await t('menu.chain', userId)} ${userChain === "ethereum" ? "🟠 Ethereum" : "🟠 Solana"}</strong>\n\n` +
        `<strong>${menuP2}</strong>\n` +
        `<strong>${user.username} (Default)</strong> : <strong>${balance.toFixed(userChain === "ethereum" ? 4 : 2)} ${await t(userChain === "ethereum" ? 'currencySymbol_ethereum' : 'currencySymbol_solana', userId)}</strong> ($${(balance * price).toFixed(2)})\n` +
        `<code>${publicKey}</code>\n\n` +
        `${menuP5}\n\n` +
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
        const { caption, markup } = await getAdminMenu(
            userId,
            username,
            first_name,
        );

        const imagePath = "./src/assets/Admin-panel.jpg"; // Ensure the image is in this path

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

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                parse_mode: "HTML",
                message_id: messageId,
                disable_web_page_preview: true,
                reply_markup: await getAdminPanelMarkup(userId),
            });
        } catch (textError: any) {
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
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Settings message is already up to date');
            return;
        }
        console.error('Error editing settings message:', error);
    }
};

export const getSnippingSettingsMenu = async (userId: number) => {
    const settings = await TippingSettings.findOne() || new TippingSettings();
    const subscriptionStatus = settings.sniperSubscriptionRequired 
        ? `🟢 ${await t('snippingSettings.subscriptionRequired', userId)}` 
        : `🔴 ${await t('snippingSettings.subscriptionNotRequired', userId)}`;
    
    const caption = `<strong>🔫 ${await t('snippingSettings.title', userId)}</strong>\n\n` +
        `<strong>${await t('snippingSettings.subscriptionRequirement', userId)}:</strong> ${subscriptionStatus}\n\n` +
        `${await t('snippingSettings.manageDescription', userId)}`;
    
    return { caption, markup: await getSnippingSettingsMarkup(userId) };
};

export const sendSnippingSettingsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    try {
        const { caption, markup } = await getSnippingSettingsMenu(userId);
        
        await bot.sendMessage(chatId, caption, {
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error) {
        console.error("Error sending snipping settings message:", error);
    }
};

export const editSnippingSettingsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId?: number,
) => {
    try {
        const { caption, markup } = await getSnippingSettingsMenu(userId);

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                parse_mode: "HTML",
                message_id: messageId,
                disable_web_page_preview: true,
                reply_markup: markup,
            });
        } catch (textError: any) {
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    parse_mode: "HTML",
                    message_id: messageId,
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Snipping settings message is already up to date');
            return;
        }
        console.error('Error editing snipping settings message:', error);
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
    const settings = await TippingSettings.findOne() || new TippingSettings();
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
        const whiteListUsers = await WhiteListUser.find({});
        const isWhitelisted = whiteListUsers.some((u) => {
            const whitelistUsername = u.telegramId.startsWith('@') ? u.telegramId.slice(1) : u.telegramId;
            const currentUsername = userName.startsWith('@') ? userName.slice(1) : userName;

            return whitelistUsername === currentUsername;
        });
        if (isWhitelisted) {
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

            const imagePath = "./src/assets/welcome.jpg";

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
};

const resolveSniperUserId = async (input: string): Promise<number | null> => {
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

export const sendAddSniperUserMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    inputUserId: string,
    messageId?: number,
) => {
    console.log('debug inputUserId (sniper)', inputUserId, 'userId', userId, 'chatId', chatId);
    if (inputUserId !== null && inputUserId !== undefined) {
        try {
            const resolvedUserId = await resolveSniperUserId(inputUserId);
            
            if (resolvedUserId === null) {
                const error = await bot.sendMessage(chatId, `${await t('errors.userNotFound', userId)}`);
                setTimeout(() => {
                    bot.deleteMessage(chatId, error.message_id).catch(() => { });
                }, 5000);
                return;
            }

            let existing = await SniperWhitelist.findOne({ userId: resolvedUserId });

            if (!existing) {
                const user = await User.findOne({ userId: resolvedUserId });
                const username = user?.username || "";

                const newSniperWhitelistUser = new SniperWhitelist();
                newSniperWhitelistUser.userId = resolvedUserId;
                newSniperWhitelistUser.username = username;
                await newSniperWhitelistUser.save();
                const sent = await bot.sendMessage(chatId, `${await t('messages.sniperUseradd', userId)}`);
                setTimeout(() => {
                    bot.deleteMessage(chatId, sent.message_id).catch(() => { });
                }, 5000);
            } else {
                const error = await bot.sendMessage(chatId, `${await t('errors.alreadySniperWhitelist', userId)}`);
                setTimeout(() => {
                    bot.deleteMessage(chatId, error.message_id).catch(() => { });
                }, 5000);
            }
        } catch (err) {
            console.error("Error adding user to sniper whitelist:", err);
            const error = await bot.sendMessage(chatId, `${await t('errors.removederror', userId)}`);
            setTimeout(() => {
                bot.deleteMessage(chatId, error.message_id).catch(() => { });
            }, 5000);
        }
    }
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

        const imagePath = "./src/assets/dashboard.jpg";
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

        const imagePath = "./src/assets/dashboard.jpg";
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
        const pending = await PendingUser.findOne({ userId: String(userId) });
        const user = await User.findOne({ userId });
        if (!user) throw "No User";
        console.log("User found, checking for pending referral:", pending);
        if (pending && pending.pendingReferrer) {
            try {
                if (!user.referredIdBy || user.referredIdBy === "None") {
                    // Set the referrer for the user
                    user.referredIdBy = pending.pendingReferrer;
                    await user.save();
                    console.log("Set referredIdBy for user:", userId, "to:", pending.pendingReferrer);
                }

                const referrerUserId = Number(pending.pendingReferrer);
                const referuser = await User.findOne({ userId: referrerUserId });
                if (!referuser) {
                    console.error("Referrer user not found:", pending.pendingReferrer);
                    await PendingUser.deleteOne({ userId: String(userId) });
                    return;
                }
                
                if (user.userId === referuser.userId) {
                    console.log("Self-referral not allowed");
                    await PendingUser.deleteOne({ userId: String(userId) });
                    return;
                }

                // Check if referral already exists
                const alreadyReferred = referuser.referrals.some(
                    (r) => r.referredId === String(user.userId)
                );

                if (!alreadyReferred) {
                    const referredName = user.username || pending.username || "Unknown";
                    console.log("Adding referral:", {
                        referrerId: referuser.userId,
                        referredId: String(user.userId),
                        referredName: referredName
                    });
                    
                    referuser.referrals.push({
                        referredId: String(user.userId),
                        referredName: referredName,
                        date: new Date(),
                    });
                    user.referredNameBy = referuser.username || "Unknown";
                    
                    await referuser.save();
                    await user.save();
                    
                    // Notify referrer
                    try {
                        await bot.sendMessage(
                            referrerUserId,
                            `${await t('messages.referral1', referrerUserId)} ${referredName} ${await t('messages.referral2', referrerUserId)}`
                        );
                    } catch (error) {
                        console.error("Error sending referral notification:", error);
                    }
                    
                    console.log("Referral saved successfully");
                } else {
                    console.log("Referral already exists, skipping");
                }
            } catch (error) {
                console.error("Error processing referral:", error);
            } finally {
                // cleanup pending
                await PendingUser.deleteOne({ userId: String(userId) });
            }
        }
        const imagePath = "./src/assets/dashboard.jpg";
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

        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: markup,
            });
        } catch (textError: any) {
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
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Menu message is already up to date');
            return;
        }
        console.error('Error editing menu message:', error);
    }
};