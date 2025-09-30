import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../../config/connection";
import { getBalance, getSolPrice, walletCreate, getSolanaPrice } from "../../services/solana";
import { getWalletMessage } from "../../utils/config";
import { getAdminPanelMarkup, getMenuMarkup } from "../../utils/markup";
import { WhiteListUser } from "../../models/whitelist";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array } from "../../config/security";
import { error } from "console";
import { swapToken } from "../../services/jupiter";
import { t } from "../../locales";
import { settings } from "../../commands/settings";
import { TippingSettings } from "../../models/tipSettings";

export const getReferral = async (
    userId: number,
) => {
    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
    if (!settings) throw new Error("Tipping settings not found!");

    let user = await User.findOne({ userId });
    const sol_price = getSolPrice();
    const number = user?.referrals.length;
    const rewards = (Number(number) / settings.referralSettings) * settings.referralReward;

    let caption =
        `<strong>${await t('referral.p1', userId)}</strong>\n\n` +
        `${await t('referral.p2', userId)}\n\n` +
        `${await t('referral.p8', userId)} ${settings.referralReward} SOL ${await t('referral.p9', userId)} ${settings.referralSettings} ${await t('referral.p10', userId)}\n\n` +
        `${await t('referral.p3', userId)} : ${number}\n` +
        `${await t('referral.p4', userId)} : ${rewards.toFixed(4)} SOL\n\n` +
        `${await t('referral.p5', userId)} :\n` +
        `<code> https://t.me/Tcfl_trade_bot?start=ref_${userId} </code>\n\n` +
        `${await t('referral.p6', userId)} : ${user?.referrer_wallet ? user.referrer_wallet : `${await t('admin.walletName', userId)}`}  \n\n` +
        `${await t('referral.p7', userId)}\n`;
    const reply_markup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {
                    text: `${await t('referral.wallet', userId)}`,
                    callback_data: "referral_wallet",
                },
            ],
            [
                {
                    text: `${await t('referral.share', userId)}`,
                    callback_data: "share_link"
                },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" }
            ],
        ],
    };
    return { caption, reply_markup };
};

export const sendReferralMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
) => {
    const { caption, reply_markup } = await getReferral(
        userId,
    );
    const imagePath = "./src/assets/Referral.jpg"; // Path to the image
    bot.sendPhoto(chatId, imagePath, {
        caption,
        parse_mode: "HTML",
        reply_markup: reply_markup,
    });
};

export const editReferralMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
) => {
    const { caption, reply_markup } = await getReferral(
        userId
    );

    bot.editMessageCaption(caption, {
        parse_mode: "HTML",
        chat_id: chatId,
        message_id: messageId,
        reply_markup: reply_markup,
    });
};

