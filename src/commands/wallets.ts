import TelegramBot from "node-telegram-bot-api";
import { sendWalletsMessageWithImage } from "../messages/solana/wallets";
import { sendWalletsMessageWithImage as sendEthereumWalletsMessageWithImage } from "../messages/ethereum/wallets";
import { getUserChain } from "../utils/chain";

export const wallets = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    const userId = msg.from?.id || 0;
    const chain = await getUserChain(userId);

    if (chain === "ethereum") {
        sendEthereumWalletsMessageWithImage(bot, msg.chat.id, userId, msg.message_id);
    } else {
        sendWalletsMessageWithImage(bot, msg.chat.id, userId, msg.message_id);
    }
};
