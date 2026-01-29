import TelegramBot from "node-telegram-bot-api";
import { sendSettingsMessage, sendSettingsMessageWithImage } from "../messages/solana/settings";

export const settings = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    await sendSettingsMessageWithImage(bot, msg.chat.id, msg.from?.id || 0, msg.from?.username || "", msg.from?.first_name || "");
};
