import TelegramBot from "node-telegram-bot-api";
import { getCloseButton } from "../utils/markup";

const LEGAL_TEXT = `📜 Terms of Use - Trading BOT

➡️ Service Overview
This trading bot allows users to buy, sell, and track the wallets of novice and/or experienced traders, and to automatically replicate their strategies.
By using this service, you agree to all the terms described below.

➡️ Acceptance of Terms
Registration and use of the service imply full and complete acceptance of these terms.
If you do not agree with these terms, you must not use the service.

➡️ Use of the Service
The service is reserved for individuals who are of legal age and have legal capacity.
You agree to provide accurate and up-to-date information.
You are responsible for the security of your access and credentials.
The bot executes operations automatically or manually by copying transactions from the traders you follow.

➡️ Risks and Responsibilities
Trading involves significant financial risks, which may result in the total loss of invested capital.
You are solely responsible for your decisions and for your use of the service.

➡️ Bot Operation
The bot replicates transactions from selected wallets.
Past performance does not guarantee future results.
The service may be suspended or interrupted at any time for technical, maintenance, or security reasons.

➡️ Limitation of Liability
The service is provided "as is," without any guarantee of performance or results.
No liability shall be held for any financial losses or indirect damages resulting from its use.

➡️ Personal Data
Collected data is processed in accordance with privacy regulations.
You have the right to access, modify, and delete your data.

➡️ Intellectual Property
All content and technologies related to the service are protected.
Any unauthorized reproduction or use is strictly prohibited.`;

export const legal = async (
    bot: TelegramBot,
    msg: TelegramBot.Message,
    _match: RegExpExecArray | null,
) => {
    const userId = msg.from?.id || 0;
    await bot.sendMessage(msg.chat.id, LEGAL_TEXT, {
        reply_markup: {
            inline_keyboard: [[await getCloseButton(userId)]],
        },
    });
};
