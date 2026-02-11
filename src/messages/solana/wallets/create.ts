import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../../services/other";
import { getBalance, walletCreate } from "../../../services/solana";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { isExistWalletWithName } from "../../../utils/config";
import { encryptSecretKey } from "../../../config/security";
import { t } from "../../../locales";

export const getCreateWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const wallets = user.wallets;
    bot.sendMessage(
        chatId,
        `${await t('createWallet.p1', userId)}`,
    ).then((sentMessage) => {
        bot.once("text", async (reply) => {
            const label = reply.text || "";
            if (hasSpecialCharacters(label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('createWallet.p2', userId)}`,
                );
            } else if (isExistWalletWithName(wallets, label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('createWallet.p3', userId)}`,
                );
            } else {
                const { publicKey, secretKey } = walletCreate();
                const balance = await getBalance(publicKey);
                const encrypted = encryptSecretKey(secretKey);
                user.wallets.push({ label, publicKey, secretKey: encrypted, balance });
                await user.save();
                function escapeMarkdownV2(text: string): string {
                    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
                }
                const escapedLabel = escapeMarkdownV2(label);
                const escapedPublicKey = escapeMarkdownV2(publicKey);
                const escapedRawSecretKey = escapeMarkdownV2(secretKey);
                const p4 = escapeMarkdownV2(await t('createWallet.p4', userId));
                const p5 = escapeMarkdownV2(await t('createWallet.p5', userId));
                const p6 = escapeMarkdownV2(await t('createWallet.p6', userId));
                const p7 = escapeMarkdownV2(await t('createWallet.p7', userId));
                const p9 = escapeMarkdownV2(await t('createWallet.p9', userId));
                const p10 = escapeMarkdownV2(await t('createWallet.p10', userId));
                bot.sendMessage(
                    chatId,
                    `*${p4}*

*${p5}*${escapedLabel}

*${p6}* \`${escapedPublicKey}\`

*${p7}*
||${escapedRawSecretKey}||

*${p9}*

${p10}`,
                    {
                        parse_mode: "MarkdownV2",
                        reply_markup: await walletsBackMarkup(userId),
                    },
                );
            }
        });
    });
};
