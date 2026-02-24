import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { getBalance, getEtherPrice } from "../../../services/ethereum/etherscan";
import { getWalletsMarkup } from "../../../utils/markup";
import { t } from "../../../locales";
import { TippingSettings } from "../../../models/tipSettings";
import { isEvmAddress } from "../../../utils/ethereum";

export const getWallets = async (
    userId: number,
): Promise<{ caption: string; markup: any }> => {
    let user = await User.findOne({ userId });
    let userName = user?.username;

    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");

    const allEthereumWallets = user?.ethereumWallets || [];
    const ethereumWallets = allEthereumWallets.filter(wallet =>
        wallet.publicKey && isEvmAddress(wallet.publicKey)
    );

    if (!user || !ethereumWallets || ethereumWallets.length === 0) {
        const caption =
            `<strong>💼 Foxy Wallet Settings</strong>\n\n` +
            `❌ No Ethereum wallets found. You need to create or import an Ethereum wallet first.\n\n` +
            `Click "📁 Create wallet" or "⬇️ Import wallet" to get started.\n\n` +
            `<strong>💡 Select an option below</strong>`;

        return { caption, markup: await getWalletsMarkup(userId) };
    }

    let activeWallet = ethereumWallets.find(wallet => wallet.is_active_wallet);

    if (!activeWallet && ethereumWallets.length > 0) {
        const firstValidWallet = ethereumWallets[0];
        if (!firstValidWallet) {
            throw new Error("Unable to determine active Ethereum wallet");
        }
        const originalIndex = allEthereumWallets.findIndex(w => w.publicKey === firstValidWallet.publicKey);
        if (originalIndex !== -1) {
            user.ethereumWallets[originalIndex].is_active_wallet = true;
            await user.save();
            activeWallet = user.ethereumWallets[originalIndex];
        } else {
            activeWallet = firstValidWallet;
        }
    }

    if (!activeWallet) {
        throw new Error("Unable to determine active Ethereum wallet");
    }

    const publicKey = activeWallet.publicKey;

    if (!publicKey || !isEvmAddress(publicKey)) {
        const validWallet = ethereumWallets.find(w => w.publicKey && isEvmAddress(w.publicKey));
        if (!validWallet || !validWallet.publicKey) {
            throw new Error("Unable to determine active Ethereum wallet");
        }
        const originalIndex = allEthereumWallets.findIndex(w => w.publicKey === validWallet.publicKey);
        if (originalIndex !== -1) {
            user.ethereumWallets[originalIndex].is_active_wallet = true;
            await user.save();
        }
        activeWallet = validWallet;
    }

    const finalPublicKey = activeWallet.publicKey;
    if (!finalPublicKey || !isEvmAddress(finalPublicKey)) {
        throw new Error("Invalid Ethereum wallet address");
    }

    const balance = await getBalance(finalPublicKey);
    console.log('balance', balance)
    const eth_price = await getEtherPrice();
    console.log('eth_price', eth_price)

    // Ensure eth_price is a valid number
    const validEthPrice = (typeof eth_price === 'number' && !isNaN(eth_price) && eth_price > 0) ? eth_price : 3000;

    const walletLabel = activeWallet?.label || "Start Wallet";

    const caption =
        `<strong>${await t('wallets.p1', userId)}</strong>\n\n` +
        `<strong>${await t('wallets.p2_ethereum', userId)}</strong>\n\n` +
        `💳 <strong>${userName} (Default)</strong> : <strong>${balance.toFixed(4)} ${await t('currencySymbol_ethereum', userId)}</strong> ($${(balance * validEthPrice).toFixed(2)})\n` +
        `<code>${finalPublicKey}</code>\n\n` +
        `${await t('wallets.p3', userId)}\n` +
        `<a href="https://the-cryptofox-learning.com/">${await t('wallets.p4', userId)}</a>\n\n` +
        `${await t('wallets.p5', userId)}\n\n` +
        `⚠️ ${await t('wallets.p10', userId)} : ${(settings as { walletsEthereum?: number }).walletsEthereum ?? settings.wallets}\n\n` +
        `<strong>${await t('wallets.p6_ethereum', userId)}</strong> : ${await t('totals', userId)} : ${ethereumWallets.length}\n\n` +
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
        console.error("Error sending wallets message with image:", error);
    }
};

