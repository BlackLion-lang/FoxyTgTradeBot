import TelegramBot from "node-telegram-bot-api";
import { sendSniperMessageeWithImage } from "../messages/sniper/sniper";

// sniper command handler
export const sniperCommand = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
) => {
  await sendSniperMessageeWithImage(
    bot,
    msg.chat.id,
    msg.from?.id || 0,
  );
};
