import TelegramBot from "node-telegram-bot-api";
import { sendSniperMessageeWithImage } from "../messages/solana/sniper/sniper";

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
