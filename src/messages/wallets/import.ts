import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../services/other";
import {
    isValidPrivateKey,
    walletCreate,
    walletFromPrvKey,
} from "../../services/solana";
import { walletsBackMarkup } from "../../utils/markup";
import { User } from "../../models/user";
import { getBalance, getSolPrice } from "../../services/solana";
import { isExistWallet, isExistWalletWithName } from "../../utils/config";
import { sendMenuMessage } from "..";
import {encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array} from "../../config/security";
import { t } from "../../locales";

export const getImportWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const wallets = user.wallets;
    bot.sendMessage(
        chatId,
        `${await t('messages.importwallet5', userId)}`,
    ).then((sentMessage) => {
        bot.once("text", async (reply) => {
            const label = reply.text || "";
            if (hasSpecialCharacters(label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.importwallet1', userId)}`,
                );
            } else if (isExistWalletWithName(wallets, label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.importwallet2', userId)}`,
                );
            } else {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.importwallet3', userId)}`,
                ).then((sentMessage) => {
                    bot.once("text", async (reply) => {
                        const input = reply.text || "";
                        if (isValidPrivateKey(input)) {
                            const { publicKey } = walletFromPrvKey(input);
                            const balance = await getBalance(publicKey);
                            console.log(balance);
                            const sol_price = getSolPrice();
                            if (isExistWallet(wallets, publicKey)) {
                                bot.sendMessage(
                                    chatId,
                                    `${await t('messages.importwallet4', userId)}`,
                                );
                                setTimeout(() => {
                                    bot.deleteMessage(chatId, sentMessage.message_id).catch(() => { });
                                }, 5000);
                            } else {
                                const secretKey = encryptSecretKey(input, "password")
                                wallets.push({
                                    label,
                                    publicKey,
                                    secretKey,
                                    balance
                                });
                                await user.save();
                                await bot.sendMessage(
                                    chatId,
                                    `<strong>${await t('importWallet.p1', userId)}</strong>\n\n` +
                                    `<strong>${await t('importWallet.p2', userId)}</strong>\n${label} - ${balance.toFixed(2)} SOL - ${(sol_price * balance).toFixed(2)} USD\n\n` +
                                    `<strong>${await t('importWallet.p3', userId)}</strong>\n<code>${publicKey}</code>\n\n` +
                                    `<strong>${await t('importWallet.p4', userId)}</strong>`,
                                    {
                                        parse_mode: "HTML",
                                        reply_markup: {
                                            inline_keyboard: [
                                                [
                                                    {
                                                        text: `${await t('importWallet.settings', userId)}`,
                                                        callback_data: "settings",
                                                    },
                                                ],
                                                [
                                                    { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                                                ],
                                            ],
                                        },
                                    }
                                );
                            }
                        } else
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidPrivateKey', userId)}`);
                        bot.deleteMessage(chatId, reply.message_id);
                        bot.deleteMessage(chatId, sentMessage.message_id);
                    });
                });
                bot.deleteMessage(chatId, sentMessage.message_id);
                bot.deleteMessage(chatId, reply.message_id);
            }
        });
    });
};
