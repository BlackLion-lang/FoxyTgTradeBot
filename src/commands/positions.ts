import TelegramBot from "node-telegram-bot-api";
import { sendPositionsMessageWithImage } from "../messages/solana/positions";
import { sendEthereumPositionsMessageWithImage } from "../messages/ethereum/positions";
import { User } from "../models/user";
import { getUserChain } from "../utils/chain";

export const positions = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    const userId = msg.from?.id || 0;
    const chain = await getUserChain(userId);
    
    if (chain === "ethereum") {
        const user = await User.findOne({ userId });
        if (!user) {
            await bot.sendMessage(msg.chat.id, "❌ User not found. Please use /start first.");
            return;
        }
        const wallets = user.ethereumWallets || [];
        sendEthereumPositionsMessageWithImage(
            bot,
            msg.chat.id,
            userId,
            msg.message_id,
            0,
            0,
            wallets[0]?.label || "Wallet",
        );
    } else {
        console.log('debug bot position')
        const user = await User.findOne({ userId });
        if (!user) {
            await bot.sendMessage(msg.chat.id, "❌ User not found. Please use /start first.");
            return;
        }
        const wallets = user.wallets;
        sendPositionsMessageWithImage(
            bot,
            msg.chat.id,
            userId,
            msg.message_id,
            0,
            0,
            wallets[0]?.label || "",
        );
    }
};
