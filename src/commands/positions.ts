import TelegramBot from "node-telegram-bot-api";
import { sendPositionsMessageWithImage } from "../messages/positions";
import { User } from "../models/user";

export const positions = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    match: RegExpExecArray | null,
) => {
    console.log('debug bot position')
    const user = (await User.findOne({ userId: msg.from?.id })) || new User();
    const wallets = user.wallets
    sendPositionsMessageWithImage(
        bot,
        msg.chat.id,
        msg.from?.id || 0,
        msg.message_id,
        0,
        0,
        wallets[0].label,
    );
};
