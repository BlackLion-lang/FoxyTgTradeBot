import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../../services/other";
import { getBalance, walletCreate } from "../../../services/solana";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { isExistWalletWithName } from "../../../utils/config";
import { encryptSecretKey } from "../../../config/security";

export const getCreateWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const wallets = user.wallets;
    bot.sendMessage(
        chatId,
        `What would you like to name your new wallet?`,
    ).then((sentMessage) => {
        bot.once("text", async (reply) => {
            const label = reply.text || "";
            if (hasSpecialCharacters(label)) {
                bot.sendMessage(
                    chatId,
                    `Wallet name cannot contain symbols or special characters.`,
                );
            } else if (isExistWalletWithName(wallets, label)) {
                bot.sendMessage(
                    chatId,
                    `Wallet with this name already exists. Please try again.`,
                );
            } else {
                const { publicKey, secretKey } = walletCreate();
                const balance = await getBalance(publicKey);
                const encrypted = encryptSecretKey(secretKey);
                user.wallets.push({ label, publicKey, encrypted, balance });
                await user.save();
                bot.sendMessage(
                    chatId,
                    `<strong>✅ Foxy Wallet Created!

💳 Name:</strong>

<code>${label}</code>

<strong>🔗 Address:</strong>

<code>${publicKey}</code>

<strong>🔑 Private Key:</strong>

<code>${secretKey}</code>

<strong>⚠️ Keep your private key safe and secure. Foxy will no longer remember your private key, and you will no longer be able to retrieve it after this message. Please import your wallet into Phantom.

💡 To view your other wallets, head over to settings.</strong>`,
                    {
                        parse_mode: "HTML",
                        reply_markup: await walletsBackMarkup(userId),
                    },
                );
            }
        });
    });
};
