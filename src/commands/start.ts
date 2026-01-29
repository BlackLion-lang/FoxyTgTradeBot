import TelegramBot from "node-telegram-bot-api";
import { sendWelcomeMessage } from "../messages";

export const start = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    sendWelcomeMessage(
        bot,
        msg.chat.id,
        msg.from?.id || 0,
        msg.message_id,
        msg.from?.username,
        msg.from?.first_name,
    );
};
