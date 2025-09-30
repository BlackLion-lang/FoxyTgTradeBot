import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getBalance, getSolPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { getWalletsMarkup } from "../../utils/markup";
import { t } from "../../locales";
import { TippingSettings } from "../../models/tipSettings";

// export const getWallets = async (
//     userId: number,
//     username: string = "",
//     first_name: string = "",
// ) => {
//     let user = await User.findOne({ userId });

//     if (!user || !user.wallets || user.wallets.length === 0) {
//         // No wallets exist, show wallet creation message
//         const caption =
//             `<strong>💼 Foxy Wallet Settings</strong>\n\n` +
//             `❌ No wallets found. You need to create or import a wallet first.\n\n` +
//             `Click "📁 Create wallet" or "⬇️ Import wallet" to get started.\n\n` +
//             `<strong>💡 Select an option below</strong>`;

//         return { caption, markup: walletsMarkup };
//     }

//     // Check if there's an active wallet
//     let activeWallet = user.wallets.find(wallet => wallet.is_active_wallet);

//     // If no active wallet, make the first wallet active
//     if (!activeWallet && user.wallets.length > 0) {
//         user.wallets[0].is_active_wallet = true;
//         await user.save();
//         activeWallet = user.wallets[0];
//     }

//     const publicKey = activeWallet?.publicKey;

//     if (!publicKey) {
//         throw new Error("Unable to determine active wallet");
//     }

//     const balance = await getBalance(publicKey);

//     const sol_price = getSolPrice();

//     // Get the active wallet label
//     const walletLabel = activeWallet?.label || "Unnamed Wallet";

//     const caption =
//         `<strong>💼 Foxy Wallet Settings</strong>\n\n` +
//         `<strong>Active Wallet:</strong> ${walletLabel}\n` +
//         `<strong>Address:</strong> <code>${publicKey}</code>\n` +
//         `<strong>Balance:</strong> ${balance.toFixed(4)} SOL ($${(balance * sol_price).toFixed(2)})\n\n` +
//         `❓ Need more help? <a href="https://foxybot.com">Click Here!</a>\n\n` +
//         `⬇️ Create, manage and import wallets here.\n\n` +
//         `📚 Your Solana Wallets (${user?.wallets.length || 0} total)\n\n` +
//         `💁 Tip: Keep your Nova wallets secure\n\n` +
//         `🔒 Select an option below\n\n` +
//         `<strong>💡 Select a setting you wish to change</strong>`;

//     return { caption, markup: walletsMarkup };
// };

export const getWallets = async (
    userId: number,
): Promise<{ caption: string; markup: any }> => {
    let user = await User.findOne({ userId });
    let userName = user?.username;

    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    if (!user || !user.wallets || user.wallets.length === 0) {
        // No wallets exist, show wallet creation message
        const caption =
            `<strong>💼 Foxy Wallet Settings</strong>\n\n` +
            `❌ No wallets found. You need to create or import a wallet first.\n\n` +
            `Click "📁 Create wallet" or "⬇️ Import wallet" to get started.\n\n` +
            `<strong>💡 Select an option below</strong>`;

        return { caption, markup: await getWalletsMarkup(userId) };
    }

    // Check if there's an active wallet
    let activeWallet = user.wallets.find(wallet => wallet.is_active_wallet);

    // If no active wallet, make the first wallet active
    if (!activeWallet && user.wallets.length > 0) {
        user.wallets[0].is_active_wallet = true;
        await user.save();
        activeWallet = user.wallets[0];
    }

    const publicKey = activeWallet?.publicKey;

    if (!publicKey) {
        throw new Error("Unable to determine active wallet");
    }

    const balance = await getBalance(publicKey);

    const sol_price = getSolPrice();

    // Get the active wallet label
    const walletLabel = activeWallet?.label || "Start Wallet";

    const caption =
        `<strong>${await t('wallets.p1', userId)}</strong>\n\n` +
        `<strong>${await t('wallets.p2', userId)}</strong>\n\n` +
        `💳 <strong>${userName} (Default)</strong> : <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `<code>${publicKey}</code>\n\n` +
        `${await t('wallets.p3', userId)}\n` +
        `<a href="https://the-cryptofox-learning.com/">${await t('wallets.p4', userId)}</a>\n\n` +
        `${await t('wallets.p5', userId)}\n\n` +
        `⚠️ ${await t('wallets.p10', userId)} : ${settings.wallets}\n\n` +
        `${await t('wallets.p6', userId)} : ${await t('totals', userId)} : ${user?.wallets.length || 0}\n\n` +
        `${await t('wallets.p7', userId)}\n\n` +
        `${await t('wallets.p8', userId)}\n\n` +
        `<strong>${await t('wallets.p9', userId)}</strong>`;

    return { caption, markup: await getWalletsMarkup(userId) };
};

export const editWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getWallets(userId);

        // Try to edit as text message first
        await bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Wallets message is already up to date');
            return; // Silent return, this is not an error
        }
        // console.error('Error editing wallets message:');
    }
};

export const sendWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getWallets(userId);
        // console.log('debug sendWalletsMessage');
        bot.sendMessage(chatId, caption, {
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error) { }
};

export const sendWalletsMessageWithImage = async (
    bot: TelegramBot,
    chatId: number,
    userId: any,
    username?: any,
    first_name?: any,
) => {
    try {
        const { caption, markup } = await getWallets(userId);

        // Path to the image
        const imagePath = "./src/assets/wallet.jpg"; // Ensure the image is in this path

        // Send the image first
        await bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error) {
        console.error("Error sending menu message with image:", error);
    }
};