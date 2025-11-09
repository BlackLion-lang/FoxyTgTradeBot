import TelegramBot from "node-telegram-bot-api";
import { sendHelpMessageWithImage } from "../messages/help";
import { sendMenuMessage, sendMenuMessageWithImage } from "../messages";

// help command handler
export const help = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
) => {
  await sendHelpMessageWithImage(
    bot,
    msg.chat.id,
    msg.from?.id || 0,
  );
};
