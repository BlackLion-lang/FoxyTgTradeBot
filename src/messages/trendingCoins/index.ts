import TelegramBot from "node-telegram-bot-api";
import { User } from "../../models/user";
import { getSolPrice } from "../../services/solana";
import { getTrendingTokens } from "../../services/birdeye";
import { t } from "../../locales";


export const getTrendingPage = async (
    userId: number,
    page: number
) => {
    const tokens = await getTrendingTokens() || [];

    // Split tokens into chunks of 3
    const chunkSize = 3;
    const chunks = [];
    for (let i = 0; i < tokens.length; i += chunkSize) {
        chunks.push(tokens.slice(i, i + chunkSize));
    }

    const maxPage = Math.min(4, chunks.length); // Limit to 4 pages
    const safePage = Math.max(1, Math.min(page, maxPage));
    const pageTokens = chunks[safePage - 1] || [];

    let tokenCaptions = await Promise.all(
        pageTokens.map(async (token) => {
            const rankEmojis = ["🥇", "🥈", "🥉"];
            return (
                `${token.rank == 1 ? rankEmojis[0] : token.rank == 2 ? rankEmojis[1] : token.rank == 3 ? rankEmojis[2] : ""}${await t('trending.p3', userId)} : ${token.rank}\n` +
                `${await t('trending.p4', userId)} : <code>${token.name}</code>\n` +
                `${await t('trending.p5', userId)} : <code>${token.address}</code>\n` +
                `${await t('trending.p6', userId)} : $${formatNumber(token.liquidity || 0)}\n` +
                `${await t('trending.p7', userId)} : $${formatNumber(token.volume24hUSD || 0)}\n` +
                `${await t('trending.p8', userId)} : ${token.volume24hChangePercent?.toFixed(3) || "---"} %\n` +
                `${await t('trending.p9', userId)} : $${token.price?.toFixed(5)}\n\n` +
                `-----------------------------------------\n\n`
            );
        })
    );

    let caption =
        `<strong>${await t('trending.p1', userId)}</strong>\n` +
        `${await t('trending.p2', userId)}\n\n` +
        tokenCaptions.join("");

    caption = caption.replace(/,/g, "");

    const prevPage = safePage > 1 ? safePage - 1 : maxPage;
    const nextPage = safePage < maxPage ? safePage + 1 : 1;

    const reply_markup: TelegramBot.InlineKeyboardMarkup = {
        inline_keyboard: [
            [
                {
                    text: `${await t('trending.previous', userId)}`,
                    callback_data: `trending_page_${prevPage}`
                },
                {
                    text: `${await t('trending.next', userId)}`,
                    callback_data: `trending_page_${nextPage}`
                },
            ],
            [
                {
                    text: `${await t('backMenu', userId)}`,
                    callback_data: "menu_back"
                },
                {
                    text: `${await t('refresh', userId)}`,
                    callback_data: `refresh_trending_${safePage}`
                },
            ],
        ],
    };

    return { caption, reply_markup };
};


export const sendTrendingPageMessage = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    page: number
) => {
    const { caption, reply_markup } = await getTrendingPage(userId, page);
    return bot.sendMessage(chatId, caption, {
        parse_mode: "HTML",
        reply_markup: reply_markup,
    });
};

export const editTrendingPageMessage = async (
    bot: TelegramBot,
    chatId: number,
    messageId: number,
    userId: number,
    page: number
) => {
    const { caption, reply_markup } = await getTrendingPage(userId, page);
    return bot.editMessageText(caption, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "HTML",
        reply_markup: reply_markup,
    });
};

function formatNumber(num: number): string {
    if (num >= 1_000_000_000) {
        return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (num >= 1_000_000) {
        return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1_000) {
        return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
}
