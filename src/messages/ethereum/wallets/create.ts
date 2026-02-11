import TelegramBot from "node-telegram-bot-api";
import { hasSpecialCharacters } from "../../../services/other";
import { walletCreate } from "../../../services/ethereum/wallet";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { t } from "../../../locales";

export const getCreateWallet = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const user = (await User.findOne({ userId })) || new User();
    const ethereumWallets = user.ethereumWallets || [];
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
            } else if (ethereumWallets.some(w => w.label === label)) {
                bot.sendMessage(
                    chatId,
                    `${await t('createWallet.p3', userId)}`,
                );
            } else {
                const { publicKey, secretKey } = walletCreate();
                const { decryptSecretKey } = await import("../../../config/security");
                const privateKey = decryptSecretKey(secretKey);
                user.ethereumWallets.push({ 
                    label, 
                    publicKey, 
                    secretKey,
                    is_active_wallet: ethereumWallets.length === 0
                });
                await user.save();
                function escapeMarkdownV2(text: string): string {
                    return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
                }
                const escapedLabel = escapeMarkdownV2(label);
                const escapedPublicKey = escapeMarkdownV2(publicKey);
                const escapedPrivateKey = escapeMarkdownV2(privateKey);
                const p4 = escapeMarkdownV2(await t('createWallet.p4', userId));
                const p5 = escapeMarkdownV2(await t('createWallet.p5', userId));
                const p6 = escapeMarkdownV2(await t('createWallet.p6', userId));
                const p7 = escapeMarkdownV2(await t('createWallet.p7', userId));
                const p8 = escapeMarkdownV2(await t('createWallet.p8', userId));
                const p10 = escapeMarkdownV2(await t('createWallet.p10', userId));
                bot.sendMessage(
                    chatId,
                    `*${p4}*

*${p5}*${escapedLabel}

*${p6}* \`${escapedPublicKey}\`

*${p7}*
||${escapedPrivateKey}||

*${p8}*

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
