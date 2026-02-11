import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";
import { t } from "../locales";

export const chain = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    const userId = msg.from?.id || 0;
    const chatId = msg.chat.id;

    let user = await User.findOne({ userId });
    if (!user) {
        user = new User();
        user.userId = userId;
        user.chain = "solana"; // default
        await user.save();
    }

    const currentChain = user.chain || "solana";
    const chainEmoji = currentChain === "solana" ? "🟠" : "🟠";
    
    // Get all translations
    const chainName = currentChain === "solana" 
        ? await t('chain.solana', userId) 
        : await t('chain.ethereum', userId);
    const solanaText = currentChain === "solana" 
        ? await t('chain.solanaSelected', userId)
        : await t('chain.solana', userId);
    const ethereumText = currentChain === "ethereum" 
        ? await t('chain.ethereumSelected', userId)
        : await t('chain.ethereum', userId);
    const backToMenuText = await t('backMenu', userId);
    const selectBlockchainText = await t('chain.selectBlockchain', userId);
    const currentText = await t('chain.current', userId);
    const choosePreferredText = await t('chain.choosePreferred', userId);

    const markup = {
        inline_keyboard: [
            [
                { 
                    text: solanaText, 
                    callback_data: "select_chain_solana" 
                },
                { 
                    text: ethereumText, 
                    callback_data: "select_chain_ethereum" 
                }
            ],
            [
                { text: backToMenuText, callback_data: "back_to_menu" }
            ]
        ]
    };

    const imagePath = "./src/assets/chainSelection.jpg"; // Ensure the image is in this path
    await bot.sendPhoto(chatId, imagePath, {
        caption: `<strong>${selectBlockchainText}</strong>\n\n` +
        `${currentText} ${chainEmoji} <strong>${chainName}</strong>\n\n` +
        `${choosePreferredText}`,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

