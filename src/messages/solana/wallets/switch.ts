import TelegramBot from "node-telegram-bot-api";
import { getBalance, getSolPrice } from "../../../services/solana";
import { User } from "../../../models/user";
import { t } from "../../../locales";
// import { userLocalData } from "../../../../bot";

export const getSwitchWallet = async (userId: number) => {
    const user = await User.findOne({ userId });

    if (!user) throw "No User";

    const publicKey = user.wallets.find(
        (wallet: any) => wallet.is_active_wallet,
    )?.publicKey;

    if (!publicKey) {
        throw new Error("Active wallet not found");
    }

    const sol_price = getSolPrice();

    const balance = await getBalance(publicKey);

    const activeWallet = user.wallets.find(wallet => wallet.is_active_wallet);

    const caption =
        `<strong>${await t('switch.p1', userId)}</strong>\n\n` +
        `<strong>${await t('switch.p2', userId)}</strong>\n\n` +
        `${await t('switch.p3', userId)} <code>${publicKey}</code>\n\n` +
        `${await t('switch.p4', userId)} <strong>${activeWallet?.label || "No label"}</strong>\n` +
        `${await t('switch.p5', userId)} <strong>${balance.toFixed(2)} SOL</strong> ($${(balance * sol_price).toFixed(2)})\n\n` +
        `${await t('switch.p6', userId)}\n` +
        `${await t('switch.p7', userId)}\n\n` +
        `${await t('switch.p8', userId)}`;

    // const address = userLocalData[userId].withdraw.address;
    // const amount = userLocalData[userId].withdraw.amount;

    const options: TelegramBot.InlineKeyboardButton[][] = [];

    const wallets = user.wallets;

    let index = 0;
    for (const wallet of wallets) {
        const balance = await getBalance(wallet.publicKey);
        options.push([
            {
                text: `${wallet.is_active_wallet ? "✅" : ""} ${wallet.label} • ${balance.toFixed(2)} SOL • 🔓`,
                callback_data: `wallets_switch_index_${index++}`,
            },
        ]);
    }

    options.push(
        // [
        //     {
        //         text: "⬇️ Import Wallet",
        //         callback_data: "wallets_switch_import",
        //     },
        //     {
        //         text: "➕ Generate Wallet",
        //         callback_data: "wallets_switch_generate",
        //     },
        // ],
        [
            { text: `${await t('back', userId)}`, callback_data: "wallets_back" },
            // {
            //     text: "🔄 Refresh",
            //     callback_data: "wallets_switch_refresh",
            // },
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
                    reply_markup: markup,
                });
            } else {
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Switch wallets message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing switch wallets message:', error);
    }
};
