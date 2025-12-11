import TelegramBot from "node-telegram-bot-api";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { decryptSecretKey } from "../config/security";
import { SubscribeModel } from "../models/subscribe";
import { User } from "../models/user";
import { TippingSettings } from "../models/tipSettings";
import { t } from "../locales";

type PlanKey = "week" | "month" | "year";

const getSubscriptionOptions = async (): Promise<Record<PlanKey, { priceSol: number; label: string; durationMs: number | null }>> => {
    const settings = await TippingSettings.findOne() || new TippingSettings();
    
    const weekPrice = settings.subscriptionPriceWeek ?? 0.3;
    const monthPrice = settings.subscriptionPriceMonth ?? 0.5;
    const yearPrice = settings.subscriptionPriceYear ?? 5;

    return {
        week: {
            priceSol: weekPrice,
            label: `📅 1 Week (${weekPrice} SOL)`,
            durationMs: 7 * 24 * 60 * 60 * 1000,
        },
        month: {
            priceSol: monthPrice,
            label: `⏱️ 1 Month (${monthPrice} SOL)`,
            durationMs: 30 * 24 * 60 * 60 * 1000,
        },
        year: {
            priceSol: yearPrice,
            label: `📅 1 Year (${yearPrice} SOL)`,
            durationMs: 365 * 24 * 60 * 60 * 1000,
        },
    };
};

interface SubscriptionActionParams {
    bot: TelegramBot;
    action?: string | null;
    chatId: number;
    telegramId: number;
    callbackQueryId: string;
}

export const handleSubscriptionAction = async ({
    bot,
    action,
    chatId,
    telegramId,
    callbackQueryId,
}: SubscriptionActionParams): Promise<boolean> => {
    if (!action || !action.startsWith("subscribe")) {
        return false;
    }

    try {
        await bot.answerCallbackQuery(callbackQueryId);
    } catch (error) {
        console.warn("Failed to answer subscribe callback:", error);
    }

    if (action === "subscribe") {
        await sendSubscriptionOptions(bot, chatId, telegramId);
        return true;
    }

    const planKey = action.replace("subscribe_", "") as PlanKey;
    if (!isPlanKey(planKey)) {
        return false;
    }

    await processSubscription(bot, chatId, telegramId, planKey);
    return true;
};

const isPlanKey = (value: string): value is PlanKey => {
    return value === "week" || value === "month" || value === "year";
};

export const sendSubscriptionOptions = async (bot: TelegramBot, chatId: number, telegramId: number) => {
    const now = Date.now();
    const activeSubscription = await findActiveSubscription(telegramId, now);

    if (activeSubscription) {
        if (activeSubscription.expiresAt) {
            const remaining = activeSubscription.expiresAt - now;
            const { days, hours, minutes } = formatRemaining(remaining);
            await bot.sendMessage(
                chatId,
                `✅ ${await t('subscribe.alreadySubscribed', telegramId)}\n\n📦 ${await t('subscribe.plan', telegramId)}: *${await formatPlanLabel(activeSubscription.plan, telegramId)}*\n🗓️ ${await t('subscribe.started', telegramId)}: *${formatDate(activeSubscription.startDate)}*\n⏳ ${await t('subscribe.expiresIn', telegramId)}: *${days}d ${hours}h ${minutes}m*`,
                { parse_mode: "Markdown" },
            );
        } else {
            // Legacy subscription without expiration (should not happen for new subscriptions)
            await bot.sendMessage(
                chatId,
                `✅ ${await t('subscribe.alreadySubscribed', telegramId)}\n\n📦 ${await t('subscribe.plan', telegramId)}: *${await formatPlanLabel(activeSubscription.plan, telegramId)}*\n🗓️ ${await t('subscribe.started', telegramId)}: *${formatDate(activeSubscription.startDate)}*`,
                { parse_mode: "Markdown" },
            );
        }
        return;
    }

    const subscriptionOptions = await getSubscriptionOptions();

    const imagePath = "./src/assets/Subscribe.jpg";
    await bot.sendPhoto(
        chatId,
        imagePath,
        {
            caption: `💸 *${await t('subscribe.options', telegramId)}:*\n\n${await t('subscribe.unlockFeatures', telegramId)}\n✨ ${await t('subscribe.sniping', telegramId)}\n\n${await t('subscribe.choosePlan', telegramId)}`,
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await formatPlanLabel('week', telegramId)} (${subscriptionOptions.week.priceSol} ${await t('bundleWallets.sol', telegramId)})`, callback_data: "subscribe_week" }],
                    [{ text: `${await formatPlanLabel('month', telegramId)} (${subscriptionOptions.month.priceSol} ${await t('bundleWallets.sol', telegramId)})`, callback_data: "subscribe_month" }],
                    [{ text: `${await formatPlanLabel('year', telegramId)} (${subscriptionOptions.year.priceSol} ${await t('bundleWallets.sol', telegramId)})`, callback_data: "subscribe_year" }],
                    [{ text: await t('subscribe.backToMenu', telegramId), callback_data: "menu_back" }],
                ],
            },
        },
    );
};

const getSubscriptionWallet = (() => {
    let cache: PublicKey | null = null;

    return async (): Promise<PublicKey | null> => {
        if (cache) {
            return cache;
        }

        const settings = await TippingSettings.findOne();
        if (!settings?.adminSolAddress?.publicKey) {
            return null;
        }

        cache = new PublicKey(settings.adminSolAddress.publicKey);
        return cache;
    };
})();

const processSubscription = async (bot: TelegramBot, chatId: number, telegramId: number, planKey: PlanKey) => {
    const subscriptionWallet = await getSubscriptionWallet();
    if (!subscriptionWallet) {
        await bot.sendMessage(chatId, `⚠️ ${await t('subscribe.walletNotConfigured', telegramId)}`);
        return;
    }

    const user = await User.findOne({ userId: telegramId });
    if (!user) {
        await bot.sendMessage(chatId, `❌ ${await t('subscribe.userNotFound', telegramId)}`);
        return;
    }

    const wallet = user.wallets.find((w: any) => w.is_active_wallet);
    if (!wallet || !wallet.secretKey) {
        await bot.sendMessage(chatId, `❌ ${await t('subscribe.addWalletFirst', telegramId)}`);
        return;
    }

    const subscriptionOptions = await getSubscriptionOptions();
    const option = subscriptionOptions[planKey];
    const lamports = Math.floor(option.priceSol * LAMPORTS_PER_SOL);

    try {
        const decrypted = decryptSecretKey(wallet.secretKey, "password");
        const keypair = Keypair.fromSecretKey(bs58.decode(decrypted));

        const balance = await connection.getBalance(keypair.publicKey);
        if (balance <= lamports) {
            await bot.sendMessage(
                chatId,
                `❌ ${await t('subscribe.insufficientSol', telegramId)}\n${await t('subscribe.needed', telegramId)}: ${option.priceSol} ${await t('bundleWallets.sol', telegramId)}\n${await t('subscribe.available', telegramId)}: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} ${await t('bundleWallets.sol', telegramId)}`,
            );
            return;
        }

        const latestBlockhash = await connection.getLatestBlockhash("finalized");
        const tx = new Transaction({
            feePayer: keypair.publicKey,
            recentBlockhash: latestBlockhash.blockhash,
        }).add(
            SystemProgram.transfer({
                fromPubkey: keypair.publicKey,
                toPubkey: subscriptionWallet,
                lamports,
            }),
        );

        tx.sign(keypair);
        const signature = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
        await connection.confirmTransaction(
            {
                signature,
                blockhash: latestBlockhash.blockhash,
                lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            "confirmed",
        );

        const now = Date.now();
        const expiresAt = option.durationMs ? now + option.durationMs : null;

        await SubscribeModel.updateMany({ telegramId, active: true }, { active: false });
        await SubscribeModel.create({
            telegramId,
            username: user.username || "",
            plan: planKey,
            amountSol: option.priceSol,
            txid: signature,
            startDate: now,
            expiresAt,
            active: true,
        });

        const successMessage = `✅ ${await t('subscribe.subscriptionSuccessful', telegramId)}\n\n📦 ${await t('subscribe.plan', telegramId)}: *${await formatPlanLabel(planKey, telegramId)} (${option.priceSol} ${await t('bundleWallets.sol', telegramId)})*\n🧾 ${await t('subscribe.txid', telegramId)}: \`${signature}\`\n⏳ ${await t('subscribe.activeUntil', telegramId)}: *${formatDate(expiresAt)}*`;

        await bot.sendMessage(chatId, successMessage, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        });
    } catch (error) {
        console.error("Subscription failed:", error);
        await bot.sendMessage(chatId, `❌ ${await t('subscribe.subscriptionFailed', telegramId)}`);
    }
};

const findActiveSubscription = async (telegramId: number, now: number) => {
    const subscription = await SubscribeModel.findOne({ telegramId, active: true }).sort({ startDate: -1 }).lean();
    if (!subscription) {
        return null;
    }

    if (subscription.expiresAt && subscription.expiresAt <= now) {
        await SubscribeModel.updateOne({ _id: subscription._id }, { active: false });
        return null;
    }

    return subscription;
};

const formatRemaining = (ms: number) => {
    const days = Math.max(Math.floor(ms / (1000 * 60 * 60 * 24)), 0);
    const hours = Math.max(Math.floor((ms / (1000 * 60 * 60)) % 24), 0);
    const minutes = Math.max(Math.floor((ms / (1000 * 60)) % 60), 0);
    return { days, hours, minutes };
};

const formatPlanLabel = async (plan: string, userId: number) => {
    switch (plan) {
        case "week":
            return await t('subscribe.week', userId);
        case "month":
            return await t('subscribe.month', userId);
        case "year":
            return await t('subscribe.year', userId);
        default:
            return plan;
    }
};

const formatDate = (timestamp: number | null | undefined) => {
    if (!timestamp) {
        return "N/A";
    }
    return new Date(timestamp).toDateString();
};