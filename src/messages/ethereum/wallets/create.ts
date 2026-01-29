import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../../services/other";
import { walletCreate } from "../../../services/ethereum/wallet";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getBalance, getEtherPrice } from "../../../services/ethereum/etherscan";

export const getCreateWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();

    const ethereumWallets = user.ethereumWallets || [];
    
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
            } else if (ethereumWallets.some(w => w.label === label)) {
                bot.sendMessage(
                    chatId,
                    `Wallet with this name already exists. Please try again.`,
                );
            } else {
                const { publicKey, secretKey } = walletCreate();
                const balance = await getBalance(publicKey);
                const eth_price = await getEtherPrice();
                const chainName = "ETH";
                
                const { decryptSecretKey } = await import("../../../config/security");
                const privateKey = decryptSecretKey(secretKey);
                
                user.ethereumWallets.push({ 
                    label, 
                    publicKey, 
                    secretKey,
                    is_active_wallet: ethereumWallets.length === 0
                });
                await user.save();
                
                bot.sendMessage(
                    chatId,
                    `<strong>✅ Foxy Wallet Created!

💳 Name:</strong>

<code>${label}</code>

<strong>🔗 Address:</strong>

<code>${publicKey}</code>

<strong>🔑 Private Key:</strong>

<code>${privateKey}</code>

<strong>⚠️ Keep your private key safe and secure. Foxy will no longer remember your private key, and you will no longer be able to retrieve it after this message. Please import your wallet into MetaMask.

💡 To view your other wallets, head over to settings.</strong>`,
                    {
                        parse_mode: "HTML",
                        reply_markup: await walletsBackMarkup(userId),
                    },
                );
            }
            bot.deleteMessage(chatId, sentMessage.message_id).catch(() => {});
            bot.deleteMessage(chatId, reply.message_id).catch(() => {});
        });
    });
};

