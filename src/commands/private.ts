import TelegramBot from "node-telegram-bot-api";
import { sendPrivateKeyWalletMessageWithImage } from "../messages/solana/wallets/private_key";

export const privateKeyWallet = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    await sendPrivateKeyWalletMessageWithImage(bot, msg.chat.id, msg.from?.id || 0, msg.from?.username || "", msg.from?.first_name || "");
};

