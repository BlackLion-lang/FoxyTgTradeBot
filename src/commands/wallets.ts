import TelegramBot from "node-telegram-bot-api";
import { sendWalletsMessageWithImage } from "../messages/wallets";

export const wallets = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    sendWalletsMessageWithImage(bot, msg.chat.id, msg.from?.id || 0, msg.message_id);
};
