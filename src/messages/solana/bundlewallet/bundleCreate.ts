import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { Model } from "mongoose";
import { encryptSecretKey } from "../../../config/security";
import { bot } from "../../../config/constant";
import { t } from "../../../locales";
import { getFrenchTimeForWalletKeys } from "../../../services/other";

const bundleCreateHandler = async (UserModel: Model<any>, userId: number, chatId: number, count: number, bundleType: string = 'safe') => {
  const SAFE_BUNDLER_MAX = 20;
  
  if (count > SAFE_BUNDLER_MAX) {
    return bot.sendMessage(
      chatId,
      `❌ <b>${await t('bundleWallets.invalidCount', userId)}</b>\n\n` +
      `${await t('bundleWallets.safeBundler', userId)} ${await t('bundleWallets.invalidCountDesc', userId)} <b>${SAFE_BUNDLER_MAX} ${await t('bundleWallets.selectedWallets', userId)}</b>.\n` +
      `${await t('bundleWallets.youSelectedCount', userId)} <b>${count} ${await t('bundleWallets.selectedWallets', userId)}</b>.\n\n` +
      (await t('bundleWallets.pleaseSelectMaxOrFewer', userId)).replace('{max}', SAFE_BUNDLER_MAX.toString()),
      { parse_mode: "HTML" }
    );
  }

  const bundleTypeName = await t('bundleWallets.safeBundler', userId);
  await bot.sendMessage(
    chatId,
    `🔄 ${await t('bundleWallets.creatingWallets', userId)} <b>${count} ${await t('bundleWallets.selectedWallets', userId)}</b> for <b>${bundleTypeName}</b>...`,
    { parse_mode: "HTML" }
  );

  const wallets = [];
  const walletKeys: Array<{ index: number; publicKey: string; privateKey: string }> = [];

  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    const privateKeyPlain = bs58.encode(keypair.secretKey);
    const encryptedPrivateKey = encryptSecretKey(privateKeyPlain);
    const publicKey = keypair.publicKey.toBase58();

    wallets.push({ publicKey, secretKey: encryptedPrivateKey });
    walletKeys.push({
      index: i + 1,
      publicKey: publicKey,
      privateKey: privateKeyPlain
    });
  }

  await UserModel.findOneAndUpdate(
    { userId: userId },
    {
      $set: {
        bundleWallets: wallets
      }
    },
    { new: true }
  );

  // Create wallet keys export file
  const timestamp = Date.now();
  const separator = `═══════════════════════════════════════════════`;
  
  // Pre-translate all strings to avoid await in forEach
  const header = await t('bundleWallets.bundleWalletKeysHeader', userId);
  const dateLabel = await t('bundleWallets.dateLabel', userId);
  const operation = await t('bundleWallets.operationBundleCreation', userId);
  const bundleTypeLabel = await t('bundleWallets.bundleTypeLabel', userId);
  const totalWalletsLabel = await t('bundleWallets.totalWalletsLabel', userId);
  const walletNumber = await t('bundleWallets.bundleWalletNumber', userId);
  const publicKeyAddress = await t('bundleWallets.publicKeyAddress', userId);
  const privateKeyLabel = await t('bundleWallets.privateKeyLabel', userId);
  const solscanLabel = await t('bundleWallets.solscanLabel', userId);
  const important = await t('bundleWallets.importantKeepKeysSafe', userId);
  const description = await t('bundleWallets.bundleWalletKeysDescription', userId);
  const warning = await t('bundleWallets.loseKeysWarning', userId);
  const storeSecure = await t('bundleWallets.storeFileSecure', userId);
  const neverShare = await t('bundleWallets.neverShareKeys', userId);
  
  let keysText = `${header}\n`;
  keysText += `${separator}\n\n`;
  keysText += `${dateLabel} ${getFrenchTimeForWalletKeys()}\n`;
  keysText += `${operation}\n`;
  keysText += `${bundleTypeLabel} ${bundleTypeName}\n`;
  keysText += `${totalWalletsLabel} ${count}\n\n`;
  keysText += `${separator}\n\n`;

  walletKeys.forEach((wallet, idx) => {
    keysText += `${walletNumber}${wallet.index}\n`;
    keysText += `───────────────────────────────────────────────\n`;
    keysText += `${publicKeyAddress}\n${wallet.publicKey}\n\n`;
    keysText += `${privateKeyLabel}\n${wallet.privateKey}\n\n`;
    keysText += `${solscanLabel}\nhttps://solscan.io/account/${wallet.publicKey}\n\n`;
    if (idx < walletKeys.length - 1) {
      keysText += `${separator}\n\n`;
    }
  });

  keysText += `${separator}\n`;
  keysText += `${important}\n`;
  keysText += `${description}\n`;
  keysText += `${warning}\n`;
  keysText += `${storeSecure}\n`;
  keysText += `${neverShare}\n`;

  // Send wallet keys file to user
  try {
    const buffer = Buffer.from(keysText, 'utf-8');
    // Use the same format as fundBundledWallets.ts
    await (bot as any).sendDocument(
      chatId,
      buffer,
      {
        caption:
          `🔐 *${await t('bundleWallets.walletKeysTitle', userId)}*\n\n` +
          `✅ ${count} ${await t('bundleWallets.walletsCreated', userId)} <b>${bundleTypeName}</b>\n\n` +
          `⚠️ ${await t('bundleWallets.savePrivateKeys', userId)}\n` +
          `💾 ${await t('bundleWallets.storeSecurely', userId)}\n` +
          `🔒 ${await t('bundleWallets.neverShare', userId)}\n\n` +
          `${await t('bundleWallets.downloadAndSave', userId)}\n`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: `${await t('privateKey.deleteMessage', userId)}`, callback_data: "bundle_keys_delete" }
            ]
          ]
        },
      },
      {
        filename: `bundle-wallets-keys-${timestamp}.txt`,
        contentType: 'text/plain',
      },
    );
  } catch (error) {
    console.error('Error sending wallet keys file:', error);
  }

  await bot.sendMessage(
    chatId,
    `✅ <b>${await t('bundleWallets.congratulations', userId)}</b>\n\n` +
    `${count} ${await t('bundleWallets.walletsCreated', userId)} <b>${bundleTypeName}</b>.\n\n` +
    `📎 ${await t('bundleWallets.keysFileSent', userId)}\n\n` +
    `📌 <i>${await t('bundleWallets.savePrivateKeys', userId)}</i>`,
    { 
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: await t('bundleWallets.backToBundleWallets', userId), callback_data: "bundled_wallets" }]
        ]
      }
    }
  );
};

export default bundleCreateHandler;







