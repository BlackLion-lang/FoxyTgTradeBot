import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";

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
    const chainName = currentChain === "solana" ? "Solana" : "Ethereum";

    const markup = {
        inline_keyboard: [
            [
                { 
                    text: currentChain === "solana" ? "✅ Solana" : "Solana", 
                    callback_data: "select_chain_solana" 
                },
                { 
                    text: currentChain === "ethereum" ? "✅ Ethereum" : "Ethereum", 
                    callback_data: "select_chain_ethereum" 
                }
            ],
            [
                { text: "🔙 Back to Menu", callback_data: "back_to_menu" }
            ]
        ]
    };

    const imagePath = "./src/assets/chainSelection.jpg"; // Ensure the image is in this path
    await bot.sendPhoto(chatId, imagePath, {
        caption: `<strong>🔗 Select Blockchain</strong>\n\n` +
        `Current: ${chainEmoji} <strong>${chainName}</strong>\n\n` +
        `Choose your preferred blockchain for trading:`,
        parse_mode: "HTML",
        reply_markup: markup,
    });
};

