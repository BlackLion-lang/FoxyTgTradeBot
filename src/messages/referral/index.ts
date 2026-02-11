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
    const settings = await TippingSettings.findOne() || new TippingSettings();
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
                {
                    text: `${await t('referral.viewList', userId)} (${number})`,
                    callback_data: "referral_view_list"
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
    const imagePath = "./src/assets/Referral.jpg";
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

export const getReferralsList = async (
    userId: number,
    page: number = 0,
): Promise<{ caption: string; reply_markup: TelegramBot.InlineKeyboardMarkup }> => {
    const user = await User.findOne({ userId });
    if (!user) throw new Error("User not found");

    const referrals = user.referrals || [];
    const itemsPerPage = 10;
    const totalPages = Math.ceil(referrals.length / itemsPerPage);
    const currentPage = Math.max(0, Math.min(page, totalPages - 1));
    
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageReferrals = referrals.slice(startIndex, endIndex);

    let caption = `<strong>${await t('referral.listTitle', userId)}</strong>\n\n`;
    caption += `${await t('referral.totalReferrals', userId)} : <strong>${referrals.length}</strong>\n\n`;

    if (pageReferrals.length === 0) {
        caption += `${await t('referral.noReferrals', userId)}\n`;
    } else {
        caption += `<strong>${await t('referral.listHeader', userId)}</strong>\n\n`;
        
        const dateLabel = await t('referral.date', userId);
        pageReferrals.forEach((referral, index) => {
            const globalIndex = startIndex + index + 1;
            const date = referral.date ? new Date(referral.date).toLocaleDateString() : 'N/A';
            const referredName = referral.referredName || 'Unknown';
            const referredId = referral.referredId || 'N/A';
            
            caption += `${globalIndex}. <strong>${referredName}</strong>\n`;
            caption += `   ID: <code>${referredId}</code>\n`;
            caption += `   ${dateLabel}: ${date}\n\n`;
        });

        if (totalPages > 1) {
            caption += `\n${await t('referral.pageInfo', userId)}: ${currentPage + 1}/${totalPages}`;
        }
    }

    const reply_markup: TelegramBot.InlineKeyboardButton[][] = [];

    // Pagination buttons
    if (totalPages > 1) {
        const paginationRow: TelegramBot.InlineKeyboardButton[] = [];
        if (currentPage > 0) {
            paginationRow.push({
                text: `⬅️ ${await t('referral.prev', userId)}`,
                callback_data: `referral_list_page_${currentPage - 1}`
            });
        }
        if (currentPage < totalPages - 1) {
            paginationRow.push({
                text: `${await t('referral.next', userId)} ➡️`,
                callback_data: `referral_list_page_${currentPage + 1}`
            });
        }
        if (paginationRow.length > 0) {
            reply_markup.push(paginationRow);
        }
    }

    // Back button
    reply_markup.push([
        { text: `${await t('back', userId)}`, callback_data: "referral_back" }
    ]);

    return { caption, reply_markup: { inline_keyboard: reply_markup } };
};

export const sendReferralsListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    page: number = 0,
) => {
    try {
        const { caption, reply_markup } = await getReferralsList(userId, page);
        bot.sendMessage(chatId, caption, {
            parse_mode: "HTML",
            reply_markup: reply_markup,
        });
    } catch (error) {
        console.error("Error sending referrals list:", error);
        bot.sendMessage(chatId, `❌ ${await t('errors.logError', userId)}`);
    }
};

export const editReferralsListMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    messageId: number,
    page: number = 0,
) => {
    try {
        const { caption, reply_markup } = await getReferralsList(userId, page);
        bot.editMessageText(caption, {
            parse_mode: "HTML",
            chat_id: chatId,
            message_id: messageId,
            reply_markup: reply_markup,
        });
    } catch (error: any) {
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Referrals list message is already up to date');
            return;
        }
        console.error("Error editing referrals list:", error);
    }
};

