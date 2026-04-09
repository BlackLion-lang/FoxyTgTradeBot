import TelegramBot from "node-telegram-bot-api";
import { sendPnlMessage } from "../messages/solana/pnl";
import { getUserChain } from "../utils/chain";
import { t } from "../locales";

export const pnl = async (bot: TelegramBot, msg: TelegramBot.Message, _match: RegExpExecArray | null) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id || 0;
    const userChain = await getUserChain(userId);
    if (userChain !== "solana") {
        await bot.sendMessage(chatId, await t("pnl.ethereumNotSupported", userId));
        return;
    }
    await sendPnlMessage(bot, chatId, userId, "7d");
};
