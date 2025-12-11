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
                const tokenName = pair?.baseToken?.name || await t('sniper.unknownToken', userId);

                return `<strong>${index + 1}. ${tokenName}</strong> <code>${tokenAddress}</code>`;
            } catch (error) {
                console.error(
                    "Failed to load token info for",
                    tokenAddress,
                    error,
                );
                return `${index + 1}. ${tokenAddress} (${await t('sniper.detailsUnavailable', userId)})`;
            }
        }),
    );

    const cap =
        `${await t('sniper.detectedActiveTokens', userId)}\n\n` +
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
        `${await t('sniper.tokenDetectionList', userId)}\n\n` +
        `${await t('sniper.tokenInfoInstruction', userId)} \n\n` +
        `${tokenlist.length > 0 ? `${cap}` : await t('sniper.noDetectedTokens', userId)} \n\n`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    
    // Dynamically create buttons based on actual token list length (max 5)
    if (tokenlist.length > 0) {
        const buttonLabels = [
            await t('sniper.buyToken1', userId),
            await t('sniper.buyToken2', userId),
            await t('sniper.buyToken3', userId),
            await t('sniper.buyToken4', userId),
            await t('sniper.buyToken5', userId),
        ];
        
        const buttonCallbacks = [
            "sniper_buy_1",
            "sniper_buy_2",
            "sniper_buy_3",
            "sniper_buy_4",
            "sniper_buy_5",
        ];
        
        // Create buttons only for available tokens
        const tokenButtons: TelegramBot.InlineKeyboardButton[] = [];
        for (let i = 0; i < tokenlist.length && i < 5; i++) {
            tokenButtons.push({
                text: buttonLabels[i],
                callback_data: buttonCallbacks[i],
            });
        }
        
        // Layout buttons: 2 buttons per row, then remaining buttons in next row
        if (tokenButtons.length > 0) {
            // First row: up to 2 buttons
            options.push(tokenButtons.slice(0, 2));
            
            // Second row: remaining buttons (if any)
            if (tokenButtons.length > 2) {
                options.push(tokenButtons.slice(2));
            }
        }
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
