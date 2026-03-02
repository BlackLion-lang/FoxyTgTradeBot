import TelegramBot from "node-telegram-bot-api";
import { User } from "../../../models/user";
import { getBalance } from "../../../services/solana";
import { formatNumberStyle, formatWithSuperscript, getCurrentTime } from "../../../services/other";
import { t } from "../../../locales";
import { getPairByAddress } from "../../../services/dexscreener";

export const getTokenlist = async (
    userId: number,
) => {
    try {
        const user = (await User.findOne({ userId })) || new User();
        if (!user) {
            console.error("No User found for getTokenlist:", userId);
            throw new Error("No User");
        }

        const active_wallet = user.wallets.find(
            (wallet: any) => wallet.is_active_wallet,
        );
        if (!active_wallet) {
            console.error("No active wallet found for user:", userId);
            throw new Error("No active Wallet");
        }
        const balance = await getBalance(active_wallet.publicKey);

    let tokenlist: any[];

    if (!user.sniper.is_snipping){
        tokenlist = [];
    }else{
        tokenlist = user.sniper.tokenlist || [];
    };
    const unknownTokenText = await t('sniper.unknownToken', userId);
    const detailsUnavailableText = await t('sniper.detailsUnavailable', userId);
    const priceLabel = await t('sniper.price', userId);
    const marketCapLabel = await t('sniper.marketCap', userId);

    const detectedTokens = await Promise.all(
        tokenlist.map(async (tokenAddress: any, index: number) => {
            try {
                const pairArray = await getPairByAddress(tokenAddress);
                const pair = pairArray?.[0];
                
                if (!pair) {
                    return `<strong>${index + 1}. ${unknownTokenText}</strong>\n<code>${tokenAddress}</code>\n${detailsUnavailableText}`;
                }

                const tokenName = pair?.baseToken?.name || unknownTokenText;
                const tokenSymbol = pair?.baseToken?.symbol || 'N/A';
                const priceUsd = pair?.priceUsd ? formatWithSuperscript(pair.priceUsd.toString()) : 'N/A';
                const marketCap = pair?.marketCap ? `$${formatNumberStyle(pair.marketCap)}` : 'N/A';
                const liquidity = pair?.liquidity?.usd ? `$${formatNumberStyle(pair.liquidity.usd)}` : 'N/A';
                const volume24h = pair?.volume24h ? `$${formatNumberStyle(pair.volume24h)}` : 'N/A';
                
                let priceChange24h = 'N/A';
                if (pair?.priceChange24h !== undefined && pair?.priceChange24h !== null) {
                    const changeValue = typeof pair.priceChange24h === 'object' && pair.priceChange24h.h24 !== undefined
                        ? pair.priceChange24h.h24
                        : typeof pair.priceChange24h === 'number'
                            ? pair.priceChange24h
                            : null;
                    
                    if (changeValue !== null && !isNaN(changeValue)) {
                        const emoji = changeValue >= 0 ? '📈' : '📉';
                        priceChange24h = `${emoji} ${changeValue.toFixed(2)}%`;
                    }
                }
                
                const dexId = pair?.dexId || 'N/A';

                return `<strong>${index + 1}. ${tokenName} (${tokenSymbol})</strong>\n` +
                       `<code>${tokenAddress}</code>\n` +
                       `💰 ${priceLabel} : <strong>$${priceUsd}</strong> | 📊 ${marketCapLabel} : <strong>${marketCap}</strong>\n`;
            } catch (error) {
                console.error(
                    "Failed to load token info for",
                    tokenAddress,
                    error,
                );
                return `<strong>${index + 1}. ${tokenAddress}</strong>\n${detailsUnavailableText}`;
            }
        }),
    );

    const cap =
        `${await t('sniper.detectedActiveTokens', userId)}\n\n` +
        detectedTokens.filter(Boolean).join("\n");

    const refreshTime = getCurrentTime();

    const caption =
        `${await t('sniper.tokenDetectionList', userId)}\n\n` +
        `${await t('sniper.tokenInfoInstruction', userId)} \n\n` +
        `${tokenlist.length > 0 ? `${cap}` : await t('sniper.noDetectedTokens', userId)} \n\n` +
        `${await t('sniper.lastRefreshed', userId)} <strong>${refreshTime}</strong>`;

    const options: TelegramBot.InlineKeyboardButton[][] = [];
    
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
        
        const tokenButtons: TelegramBot.InlineKeyboardButton[] = [];
        for (let i = 0; i < tokenlist.length && i < 5; i++) {
            tokenButtons.push({
                text: buttonLabels[i],
                callback_data: buttonCallbacks[i],
            });
        }
        
        if (tokenButtons.length > 0) {
            options.push(tokenButtons.slice(0, 2));
            
            if (tokenButtons.length > 2) {
                options.push(tokenButtons.slice(2));
            }
        }
    }
    
    options.push([
        { text: `${await t('backMenu', userId)}`, callback_data: "sniper" },
        { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
    ]);

    const newMarkup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: options,
    };

    return { caption, markup: newMarkup };
    } catch (error: any) {
        console.error("Error in getTokenlist:", error);
        const refreshTime = getCurrentTime();
        const errorCaption = `${await t('sniper.tokenDetectionList', userId)}\n\n${await t('sniper.noDetectedTokens', userId)}\n\n${await t('sniper.lastRefreshed', userId)} <strong>${refreshTime}</strong>`;
        const errorMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: [
                [
                    { text: `${await t('backMenu', userId)}`, callback_data: "sniper" },
                    { text: `${await t('refresh', userId)}`, callback_data: "sniper_refresh" },
                ]
            ]
        };
        return { caption: errorCaption, markup: errorMarkup };
    }
};

export const sendTokenListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    username?: any,
    first_name?: any,
) => {
    try {
        const imagePath = "./src/assets/Snipping.jpg";
        const { caption, markup } = await getTokenlist(userId);

        await bot.sendPhoto(chatId, imagePath, {
            caption,
            parse_mode: "HTML",
            reply_markup: markup,
        });
    } catch (error: any) {
        console.error("Error sending token list message:", error);
        try {
            const { caption, markup } = await getTokenlist(userId);
            await bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup: markup,
            });
        } catch (fallbackError) {
            console.error("Error sending fallback token list message:", fallbackError);
        }
    }
};

export const editTokenListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const { caption, markup } = await getTokenlist(userId);
        console.log("Edit Token List Message");
        
        try {
            await bot.editMessageCaption(caption, {
                chat_id: chatId,
                parse_mode: "HTML",
                message_id: messageId,
                reply_markup: markup,
            });
        } catch (captionError: any) {
            if (captionError.message && captionError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageText(caption, {
                    chat_id: chatId,
                    parse_mode: "HTML",
                    message_id: messageId,
                    reply_markup: markup,
                });
            } else if (captionError.message && captionError.message.includes('message is not modified')) {
                return;
            } else {
                throw captionError;
            }
        }
    } catch (error: any) {
        console.error("Error editing token list message:", error);
        if (error.message && error.message.includes('message is not modified')) {
            console.log('Token list message is already up to date');
            return;
        }
    }
};
