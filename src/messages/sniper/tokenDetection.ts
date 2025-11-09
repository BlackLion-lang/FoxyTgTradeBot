import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getBalance, getSolPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { isMEVProtect } from "../../services/other";
import { t } from "../../locales";

export const getTokenlist = async (
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    if (!user) throw "No User";

    const active_wallet = user.wallets.find(
        (wallet) => wallet.is_active_wallet,
    );
    if (!active_wallet) throw "No active Wallet";
    const balance = await getBalance(active_wallet.publicKey);

    const tokenlist = user.sniper.tokenlist || [];
    console.log("User Token List:", tokenlist);

    const cap = `🔥 Detected active tokens:\n\n` +
        (user.sniper.tokenlist).map((t: any, i: any) => `${i + 1}. https://pump.fun/coin/${t}`).join('\n');

    const caption =
        // `<strong>${await t('Wallet', userId)}</strong>\n` +
        // `<code>${active_wallet.publicKey}</code>\n` +
        // `${await t('Balance', userId)} ${balance}\n\n` +
        // `${await t('Buy Tip', userId)}\n` +
        // `${await t('Sell Tip', userId)}\n\n` +
        // `<strong>${await t('settings.p5', userId)}</strong>`;
        `It is the detected token list by bot detection according your setting.\n\n` +
        `You can see the token information by click below token link. \n\n` +
        `${tokenlist.length > 0 ? `${cap}` : "No detective active tokens"} \n\n`;
      
    const options: TelegramBot.InlineKeyboardButton[][] =
        [
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                // { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
            ],
        ];

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
};

export const sendTokenListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    const imagePath = "./src/assets/Snipping.jpg"; // Path to the image
    const { caption, markup } = await getTokenlist(userId);

    await bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

export const editTokenListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, markup } = await getTokenlist(userId);
    console.log("Edit Token List Message");
    await bot.editMessageCaption(caption, {
        chat_id: chatId,
        parse_mode: "HTML",
        message_id: messageId,
        reply_markup: markup,
    });
};
