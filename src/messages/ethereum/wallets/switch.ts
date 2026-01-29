import TelegramBot from "node-telegram-bot-api";
import { getBalance, getEtherPrice } from "../../../services/ethereum/etherscan";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getSwitchWallet = async (userId: number) => {
    const user = await User.findOne({ userId });

    if (!user) throw "No User";

    const ethereumWallets = user.ethereumWallets || [];
    
    const activeWallet = ethereumWallets.find(
        (wallet) => wallet.is_active_wallet,
    );

    if (!activeWallet) {
        throw new Error("Active wallet not found");
    }

    const publicKey = activeWallet.publicKey;
    const eth_price = await getEtherPrice();
    const balance = await getBalance(publicKey);

    const caption =
        `<strong>${await t('switch.p1', userId)}</strong>\n\n` +
        `<strong>${await t('switch.p2', userId)}</strong>\n\n` +
        `${await t('switch.p3', userId)} <code>${publicKey}</code>\n\n` +
        `${await t('switch.p4', userId)} <strong>${activeWallet?.label || "No label"}</strong>\n` +
        `${await t('switch.p5', userId)} <strong>${balance.toFixed(4)} ETH</strong> ($${(balance * eth_price).toFixed(2)})\n\n` +
        `${await t('switch.p6', userId)}\n` +
        `${await t('switch.p7', userId)}\n\n` +
        `${await t('switch.p8', userId)}`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];

    for (let index = 0; index < ethereumWallets.length; index++) {
        const wallet = ethereumWallets[index];
        const balance = await getBalance(wallet.publicKey);
        options.push([
            {
                text: `${wallet.is_active_wallet ? "✅" : ""} ${wallet.label} • ${balance.toFixed(4)} ETH • 🔓`,
                callback_data: `wallets_switch_index_${index}`,
            },
        ]);
    }

    options.push(
        [
            { text: `${await t('back', userId)}`, callback_data: "wallets_back" },
        ],
    );

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const sendSwitchWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getSwitchWallet(userId);

        bot.sendMessage(chatId, caption, {
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error) {}
};

export const editSwitchWalletsMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getSwitchWallet(userId);

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
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Switch wallets message is already up to date');
            return;
        }
        console.error('Error editing switch wallets message:', error);
    }
};

