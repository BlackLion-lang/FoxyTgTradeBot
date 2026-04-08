import TelegramBot from "node-telegram-bot-api";
import { getFrenchTimeForWalletKeys, hasSpecialCharacters } from "../../../services/other";
import { getBalance, walletCreate } from "../../../services/solana";
import { walletsBackMarkup } from "../../../utils/markup";
import { User } from "../../../models/user";
import { isExistWalletWithName } from "../../../utils/config";
import { encryptSecretKey } from "../../../config/security";
import { t } from "../../../locales";
function escHtml(s: string): string {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
                const { publicKey, secretKey: privateKeyPlain } = walletCreate();
                const balance = await getBalance(publicKey);
                const encrypted = encryptSecretKey(privateKeyPlain);
                user.wallets.push({ label, publicKey, secretKey: encrypted, balance, walletCreatedAt: new Date() });
                await user.save();

                const timestamp = Date.now();
                const separator = "═══════════════════════════════════════════════";
                const header = await t("createWallet.keysFileHeader", userId);
                const dateLabel = await t("createWallet.fileDateLabel", userId);
                const publicKeyAddress = await t("createWallet.keysFilePublicKeyLabel", userId);
                const privateKeyLabel = await t("createWallet.keysFilePrivateKeyLabel", userId);
                const solscanLabel = await t("createWallet.keysFileSolscanLabel", userId);
                const important = await t("createWallet.keysFileImportant", userId);
                const description = await t("createWallet.keysFileDescription", userId);
                const warning = await t("createWallet.keysFileLoseWarning", userId);
                const storeSecure = await t("createWallet.keysStoreFile", userId);
                const neverShare = await t("createWallet.keysNeverShare", userId);
                const nameLine = await t("createWallet.p5", userId);
                const walletBlock = await t("createWallet.keysFileWalletBlock", userId);

                let keysText = `${header}\n`;
                keysText += `${separator}\n\n`;
                keysText += `${dateLabel} ${getFrenchTimeForWalletKeys()}\n`;
                keysText += `${await t("createWallet.fileOperation", userId)}\n`;
                keysText += `${nameLine} ${label}\n\n`;
                keysText += `${separator}\n\n`;
                keysText += `${walletBlock}\n`;
                keysText += "───────────────────────────────────────────────\n";
                keysText += `${publicKeyAddress}\n${publicKey}\n\n`;
                keysText += `${privateKeyLabel}\n${privateKeyPlain}\n\n`;
                keysText += `${solscanLabel}\nhttps://solscan.io/account/${publicKey}\n\n`;
                keysText += `${separator}\n`;
                keysText += `${important}\n`;
                keysText += `${description}\n`;
                keysText += `${warning}\n`;
                keysText += `${storeSecure}\n`;
                keysText += `${neverShare}\n`;

                const safeName = label.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "wallet";
                const fileName = `foxy-wallet-${safeName}-${timestamp}.txt`;

                try {
                    const buffer = Buffer.from(keysText, "utf-8");
                    await (bot as any).sendDocument(
                        chatId,
                        buffer,
                        {
                            caption:
                                `🔐 <b>${await t("createWallet.keysFileTitle", userId)}</b>\n\n` +
                                `<b>${escHtml(await t("createWallet.p4", userId))}</b>\n\n` +
                                `⚠️ ${await t("createWallet.savePrivateKeyOnce", userId)}\n` +
                                `💾 ${await t("createWallet.keysStoreFile", userId)}\n` +
                                `🔒 ${await t("createWallet.keysNeverShare", userId)}\n\n` +
                                `${await t("createWallet.keysFileHint", userId)}`,
                            parse_mode: "HTML",
                            reply_markup: {
                                inline_keyboard: [
                                    [{ text: await t("privateKey.deleteMessage", userId), callback_data: "private_keys_file_delete" }],
                                ],
                            },
                        },
                        {
                            filename: fileName,
                            contentType: "text/plain",
                        },
                    );
                } catch (err) {
                    console.error("[getCreateWallet] sendDocument failed:", err);
                }

                const followUp =
                    `<b>${escHtml(await t("createWallet.p4", userId))}</b>\n\n` +
                    `<b>${escHtml(await t("createWallet.p5", userId))}</b> ${escHtml(label)}\n\n` +
                    `<b>${escHtml(await t("createWallet.p6", userId))}</b> <code>${escHtml(publicKey)}</code>\n\n` +
                    `${escHtml(await t("createWallet.p12", userId))}\n\n` +
                    `<b>${escHtml(await t("createWallet.p9", userId))}</b>\n\n` +
                    `${escHtml(await t("createWallet.p10", userId))}`;

                await bot.sendMessage(chatId, followUp, {
                    parse_mode: "HTML",
                    reply_markup: await walletsBackMarkup(userId),
                });
            }
        });
    });
};
