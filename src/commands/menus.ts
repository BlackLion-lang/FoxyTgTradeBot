import TelegramBot from "node-telegram-bot-api";
import { sendWalletsMessage } from "../messages/wallets";
import { sendMenuMessage, sendMenuMessageWithImage } from "../messages";

// Menus command handler
export const menus = async (
  bot: TelegramBot,
  msg: TelegramBot.Message,
  match: RegExpExecArray | null,
) => {
  await sendMenuMessage(
    bot,
    msg.chat.id,
    msg.from?.id || 0,
    msg.from?.username || "",
    msg.from?.first_name || ""
  );
};
