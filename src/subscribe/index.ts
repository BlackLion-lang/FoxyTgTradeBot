import TelegramBot from "node-telegram-bot-api";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { decryptSecretKey } from "../config/security";
import { SubscribeModel } from "../models/subscribe";
import { User } from "../models/user";
import { TippingSettings } from "../models/tipSettings";

type PlanKey = "week" | "month" | "lifetime";

const SUBSCRIPTION_OPTIONS: Record<PlanKey, { priceSol: number; label: string; durationMs: number | null }> = {
    week: {
        priceSol: 0.3,
        label: "📅 1 Week (0.3 SOL)",
        durationMs: 7 * 24 * 60 * 60 * 1000,
    },
    month: {
        priceSol: 0.5,
        label: "⏱️ 1 Month (0.5 SOL)",
        durationMs: 30 * 24 * 60 * 60 * 1000,
    },
    lifetime: {
        priceSol: 5,
        label: "♾️ Year (5 SOL)",
        durationMs: null,
    },
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
    return value === "week" || value === "month" || value === "lifetime";
};

const sendSubscriptionOptions = async (bot: TelegramBot, chatId: number, telegramId: number) => {
    const now = Date.now();
    const activeSubscription = await findActiveSubscription(telegramId, now);

    if (activeSubscription) {
        if (activeSubscription.expiresAt) {
            const remaining = activeSubscription.expiresAt - now;
            const { days, hours, minutes } = formatRemaining(remaining);
            await bot.sendMessage(
                chatId,
                `✅ You are already subscribed!\n\n📦 Plan: *${formatPlanLabel(activeSubscription.plan)}*\n🗓️ Started: *${formatDate(activeSubscription.startDate)}*\n⏳ Expires in: *${days}d ${hours}h ${minutes}m*`,
                { parse_mode: "Markdown" },
            );
        } else {
            await bot.sendMessage(
                chatId,
                `✅ You have a *Lifetime* subscription!\n\n🗓️ Started: *${formatDate(activeSubscription.startDate)}*\n♾️ Never expires!`,
                { parse_mode: "Markdown" },
            );
        }
        return;
    }

    await bot.sendMessage(
        chatId,
        `💸 *Subscription Options:*\n\nUnlock premium features:\n✨ Sniping\n\nChoose the plan that fits you best:`,
        {
            parse_mode: "Markdown",
            reply_markup: {
                inline_keyboard: [
                    [{ text: SUBSCRIPTION_OPTIONS.week.label, callback_data: "subscribe_week" }],
                    [{ text: SUBSCRIPTION_OPTIONS.month.label, callback_data: "subscribe_month" }],
                    [{ text: SUBSCRIPTION_OPTIONS.lifetime.label, callback_data: "subscribe_lifetime" }],
                    [{ text: "⬅️ Back to Menu", callback_data: "menu_back" }],
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
        await bot.sendMessage(chatId, "⚠️ Subscription wallet is not configured. Please contact support.");
        return;
    }

    const user = await User.findOne({ userId: telegramId });
    if (!user) {
        await bot.sendMessage(chatId, "❌ Unable to find your user record. Please try /start again.");
        return;
    }

    const wallet = user.wallets.find((w: any) => w.is_active_wallet);
    if (!wallet || !wallet.secretKey) {
        await bot.sendMessage(chatId, "❌ Please add and activate a wallet before subscribing.");
        return;
    }

    const option = SUBSCRIPTION_OPTIONS[planKey];
    const lamports = Math.floor(option.priceSol * LAMPORTS_PER_SOL);

    try {
        const decrypted = decryptSecretKey(wallet.secretKey, "password");
        const keypair = Keypair.fromSecretKey(bs58.decode(decrypted));

        const balance = await connection.getBalance(keypair.publicKey);
        if (balance <= lamports) {
            await bot.sendMessage(
                chatId,
                `❌ Insufficient SOL.\nNeeded: ${option.priceSol} SOL\nAvailable: ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`,
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
            plan: planKey,
            amountSol: option.priceSol,
            txid: signature,
            startDate: now,
            expiresAt,
            active: true,
        });

        const successMessage =
            planKey === "lifetime"
                ? `✅ *Lifetime Subscription Activated!*\n\n📦 Plan: *${option.label}*\n🧾 TXID: \`${signature}\`\n\nEnjoy unlimited premium access!`
                : `✅ Subscription successful!\n\n📦 Plan: *${option.label}*\n🧾 TXID: \`${signature}\`\n⏳ Active until: *${formatDate(expiresAt)}*`;

        await bot.sendMessage(chatId, successMessage, {
            parse_mode: "Markdown",
            disable_web_page_preview: true,
        });
    } catch (error) {
        console.error("Subscription failed:", error);
        await bot.sendMessage(chatId, "❌ Subscription failed. Please try again later.");
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

const formatPlanLabel = (plan: string) => {
    switch (plan) {
        case "week":
            return "📅 1 Week";
        case "month":
            return "⏱️ 1 Month";
        case "lifetime":
            return "♾️ Lifetime";
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