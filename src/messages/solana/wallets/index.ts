import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { getBalance, getSolPrice } from "../../../services/solana";
import { getWalletsMarkup } from "../../../utils/markup";
import { getUserChain } from "../../../utils/chain";
import { t } from "../../../locales";
import { TippingSettings } from "../../../models/tipSettings";

export const getWallets = async (
    userId: number,
): Promise<{ caption: string; markup: any }> => {
    let user = await User.findOne({ userId });
    let userName = user?.username;

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    if (!user || !user.wallets || user.wallets.length === 0) {
        const caption =
            `<strong>💼 Foxy Wallet Settings</strong>\n\n` +
            `❌ No wallets found. You need to create or import a wallet first.\n\n` +
            `Click "📁 Create wallet" or "⬇️ Import wallet" to get started.\n\n` +
            `<strong>💡 Select an option below</strong>`;

        return { caption, markup: await getWalletsMarkup(userId) };
    }

    let activeWallet = user.wallets.find((wallet: any) => wallet.is_active_wallet);

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

    const walletLabel = activeWallet?.label || "Start Wallet";

    const caption =
        `<strong>${await t('wallets.p1', userId)}</strong>\n\n` +
        `<strong>${await t('wallets.p2_solana', userId)}</strong>\n\n` +
        `💳 <strong>${userName} (Default)</strong> : <strong>${balance.toFixed(2)} ${await t('currencySymbol_solana', userId)}</strong> ($${(balance * sol_price).toFixed(2)})\n` +
        `<code>${publicKey}</code>\n\n` +
        `${await t('wallets.p3', userId)}\n` +
        `<a href="${(await getUserChain(userId)) === "ethereum" ? "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=eth&section=wallet&sig=HUU-PYh4K166cm2Cx76D11XtbdAAVFGA" : "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=wallet&sig=As7mxBs5Yom9PnHmPhQ1KpjhxMPn7CA3"}">${await t('wallets.p4', userId)}</a>\n\n` +
        `${await t('wallets.p5', userId)}\n\n` +
        `⚠️ ${await t('wallets.p10', userId)} : ${(settings as { walletsSolana?: number }).walletsSolana ?? settings.wallets}\n\n` +
        `<strong>${await t('wallets.p6_solana', userId)}</strong> : ${await t('totals', userId)} : ${user?.wallets.length || 0}\n\n` +
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

        await bot.editMessageCaption(caption, {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Wallets message is already up to date');
            return;
        }
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

        const imagePath = "./src/assets/wallet.jpg";

        await bot.sendPhoto(chatId, imagePath, {
            caption: caption,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error) {
        console.error("Error sending menu message with image:", error);
    }
};