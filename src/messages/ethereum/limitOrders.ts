import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";

export const sendEthereumLimitOrdersMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    try {
        const user = await User.findOne({ userId });
        if (!user) {
            await bot.sendMessage(chatId, "❌ User not found.");
            return;
        }
        
        const limitOrders = user.limit_orders || [];
        
        if (limitOrders.length === 0) {
            await bot.sendMessage(
                chatId,
                "🕐 <strong>Pending Orders</strong>\n\nYou have no pending orders.",
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🔙 Back to Menu", callback_data: "menu_back" }
                            ]
                        ]
                    }
                }
            );
        } else {
            let caption = "🕐 <strong>Pending Orders</strong>\n\n";
            await bot.sendMessage(chatId, caption, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🔙 Back to Menu", callback_data: "menu_back" }
                        ]
                    ]
                }
            });
        }
    } catch (error) {
        console.error("Error sending Ethereum limit orders message:", error);
        await bot.sendMessage(chatId, "❌ Error loading limit orders. Please try again.");
    }
};

