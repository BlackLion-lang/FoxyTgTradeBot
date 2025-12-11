import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { Model } from "mongoose";
import { User } from "../../models/user";
import { encryptSecretKey } from "../../config/security";
import { bot } from "../../config/constant";
import { t } from "../../locales";

const bundleCreateHandler = async (UserModel: Model<any>, userId: number, chatId: number, count: number, bundleType: string = 'safe') => {
  // Validate count for Safe Bundler only
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

  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    const privateKeyPlain = bs58.encode(keypair.secretKey);
    const encryptedPrivateKey = encryptSecretKey(privateKeyPlain, "password");
    const publicKey = keypair.publicKey.toBase58();

    // Save encrypted to DB (using secretKey to match user model structure)
    wallets.push({ publicKey, secretKey: encryptedPrivateKey });

    // Masked (HTML spoiler)
    const masked = `<tg-spoiler>${privateKeyPlain}</tg-spoiler>`;

    // Send blurred private key (HTML parse mode)
    // await bot.sendMessage(
    //   chatId,
    //   `🧾 <b>Wallet #${i + 1}</b>\n\n🔐 <b>Private Key (tap to reveal):</b>\n${masked}\n\n🔓 <b>Public Key:</b>\n<code>${publicKey}</code>`,
    //   { parse_mode: "HTML" }
    // );
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

  await bot.sendMessage(
    chatId,
    `✅ <b>${await t('bundleWallets.congratulations', userId)}</b> ${count} ${await t('bundleWallets.walletsCreated', userId)} <b>${bundleTypeName}</b>.\n\n📌 <i>${await t('bundleWallets.savePrivateKeys', userId)}</i>`,
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







