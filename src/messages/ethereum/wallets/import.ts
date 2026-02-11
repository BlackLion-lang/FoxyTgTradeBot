import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../../services/other";
import {
    isValidPrivateKey,
    walletFromPrvKey,
} from "../../../services/ethereum/wallet";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { getBalance, getEtherPrice } from "../../../services/ethereum/etherscan";
import { isExistWallet, isExistWalletWithName } from "../../../utils/config";
import { sendMenuMessage } from "../..";
import { encryptSecretKey } from "../../../config/security";
import { t } from "../../../locales";

export const getImportWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const ethereumWallets = user.ethereumWallets || [];
    
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
            } else if (ethereumWallets.some(w => w.label === label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.importwallet2', userId)}`,
                );
            } else {
                bot.sendMessage(
                    chatId,
                    `${await t('messages.importwallet3', userId)}`,
                ).then((sentMessage2) => {
                    bot.once("text", async (reply2) => {
                        const input = reply2.text || "";
                        if (isValidPrivateKey(input)) {
                            try {
                                const { publicKey, secretKey: normalizedPrivateKey } = walletFromPrvKey(input);
                                const balance = await getBalance(publicKey);
                                const eth_price = await getEtherPrice();
                                
                                if (ethereumWallets.some(w => w.publicKey === publicKey)) {
                                    bot.sendMessage(
                                        chatId,
                                        `${await t('messages.importwallet4', userId)}`,
                                    );
                                    setTimeout(() => {
                                        bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => { });
                                    }, 5000);
                                } else {
                                    const secretKey = encryptSecretKey(normalizedPrivateKey);
                                    user.ethereumWallets.push({
                                        label,
                                        publicKey,
                                        secretKey,
                                        is_active_wallet: ethereumWallets.length === 0
                                    });
                                    await user.save();
                                    await bot.sendMessage(
                                        chatId,
                                        `<strong>${await t('importWallet.p1', userId)}</strong>\n\n` +
                                        `<strong>${await t('importWallet.p2', userId)}</strong>\n${label} - ${balance.toFixed(4)} ETH - $${(eth_price * balance).toFixed(2)} USD\n\n` +
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
                            } catch (error: any) {
                                console.error('Error importing wallet:', error);
                                bot.sendMessage(
                                    chatId,
                                    `${await t('errors.invalidPrivateKey', userId)}: ${error.message || 'Failed to import wallet'}`,
                                );
                            }
                        } else {
                            bot.sendMessage(
                                chatId,
                                `${await t('errors.invalidPrivateKey', userId)}`);
                        }
                        bot.deleteMessage(chatId, reply2.message_id).catch(() => {});
                        bot.deleteMessage(chatId, sentMessage2.message_id).catch(() => {});
                    });
                });
                bot.deleteMessage(chatId, sentMessage.message_id);
                bot.deleteMessage(chatId, reply.message_id);
            }
        });
    });
};

