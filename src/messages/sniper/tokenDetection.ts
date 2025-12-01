import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getBalance, getSolPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { isMEVProtect } from "../../services/other";
import { t } from "../../locales";
import { getPairByAddress } from "../../services/dexscreener";

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

    // const tokenlist = user.sniper.tokenlist || [];
    let tokenlist: any[];

    if (!user.sniper.is_snipping){
        tokenlist = [];
    }else{
        tokenlist = user.sniper.tokenlist || [];
    };
    // console.log("User Token List:", tokenlist);

    const detectedTokens = await Promise.all(
        tokenlist.map(async (tokenAddress: any, index: number) => {
            try {
                const pairArray = await getPairByAddress(tokenAddress);
                const pair = pairArray?.[0];
                const tokenName = pair?.baseToken?.name || "Unknown token";

                return `${index + 1}. ${tokenName} ${tokenAddress}`;
            } catch (error) {
                console.error(
                    "Failed to load token info for",
                    tokenAddress,
                    error,
                );
                return `${index + 1}. ${tokenAddress} (details unavailable)`;
            }
        }),
    );

    const cap =
        `🔥 Detected active tokens:\n\n` +
        detectedTokens.filter(Boolean).join("\n");

    // const pairArray = await getPairByAddress(tokenAddress ? tokenAddress[0] : "");
    // const pair = pairArray[0];

    // const symbol = pair.baseToken.symbol;
    // const name = pair.baseToken.name;

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

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    
    if (tokenlist.length > 0) {
        options.push(
            [
                { text: `${await t('Buy - 1', userId)}`, callback_data: "sniper_buy_1" },
                { text: `${await t('Buy - 2', userId)}`, callback_data: "sniper_buy_2" },
            ],
            [
                { text: `${await t('Buy - 3', userId)}`, callback_data: "sniper_buy_3" },
                { text: `${await t('Buy - 4', userId)}`, callback_data: "sniper_buy_4" },
                { text: `${await t('Buy - 5', userId)}`, callback_data: "sniper_buy_5" },
            ],
        );
    }
    
    options.push([
        { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
        { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
    ]);

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
