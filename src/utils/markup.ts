import TelegramBot from "node-telegram-bot-api";
import { t } from "../locales";
import { TippingSettings } from "../models/tipSettings";
import { settings } from "../commands/settings";
import { SniperWhitelist } from "../models/sniperWhitelist";
import { SubscribeModel } from "../models/subscribe";
import { getUserChain } from "./chain";


const hasActiveSubscription = async (telegramId: number): Promise<boolean> => {
    const tippingSettings = await TippingSettings.findOne() || new TippingSettings();

    if (!tippingSettings.sniperSubscriptionRequired) {
        return true;
    }

    const subscription = await SubscribeModel.findOne({ telegramId, active: true })
        .sort({ expiresAt: -1 })
        .lean();

    if (!subscription) {
        return false;
    }

    if (typeof subscription.expiresAt === "number" && subscription.expiresAt > 0) {
        return subscription.expiresAt > Date.now();
    }

    return true;
};

export const getAdminPanelMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings) throw new Error("Tipping settings not found!");
    const status = settings.WhiteListUser ? "🟢" : "🔴";
    const text = settings.WhiteListUser ? `${await t('admin.whitelistActive', userId)}` : `${await t('admin.whitelistInactive', userId)}`
    return {
        inline_keyboard: [
            [
                { text: `📥 ${await t('admin.addUser', userId)}`, callback_data: "add_user" },
                { text: `🗑️ ${await t('admin.removeUser', userId)}`, callback_data: "remove_user" },
            ],
            [
                { text: `${await t('admin.tipPercentage', userId)} : ${settings.feePercentage} %`, callback_data: "admin_tip_percentage" },
            ],
            [
                { text: `${await t('admin.wallet', userId)} : ${settings.wallets}`, callback_data: "admin_wallets" },
            ],
            [
                { text: `${await t('admin.referral', userId)} : ${settings.referralReward} SOL`, callback_data: "admin_referral" },
            ],
            [
                { text: `${await t('admin.referralSettings', userId)} : ${settings.referralSettings}`, callback_data: "admin_referralSettings" },
            ],
            [
                { text: `${status} ${text}`, callback_data: "whitelist_active" },
            ],
            [
                { text: `${await t('admin.adminWallet', userId)}`, callback_data: "admin_wallet" },
                { text: `${await t('admin.adminWalletName', userId)}`, callback_data: "admin_wallet_name" },
            ],
            [
                { text: `🔫 ${await t('snippingSettings.title', userId)}`, callback_data: "snipping_settings" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('close', userId)}`, callback_data: "menu_close" },
                { text: `${await t('refresh', userId)}`, callback_data: "admin_refresh" },
            ],
        ],
    };
};

export async function getMenuMarkup(userId: number): Promise<TelegramBot.InlineKeyboardMarkup> {

    let buttons: TelegramBot.InlineKeyboardButton[][];
    const isAdmin = userId === 7994989802 || userId === 2024002049;

    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";

    const isWhitelisted = await SniperWhitelist.findOne({ userId });
    const hasAccess = !!isWhitelisted || await hasActiveSubscription(userId);
    const sniperButtonText = hasAccess
        ? `🔫 ${await t('sniper.sniperButton', userId)} 🔫`
        : `🔒 ${await t('sniper.sniperButtonLocked', userId)} 🔒`;

    if (isAdmin && process.env.ADMIN_BUTTON_SHOW === "1") {
        buttons = [
            [
                { text: `🔗 Chain`, callback_data: "select_chain" },
            ],
            [
                { text: `${await t('menu.buy', userId)}`, callback_data: "buy" },
                { text: `${await t('menu.sell', userId)}`, callback_data: "sell" },
            ],
        ];

        buttons.push([
            { text: `${await t('menu.wallet', userId)}`, callback_data: "wallets" },
            { text: `${await t('menu.position', userId)}`, callback_data: "positions" }
        ]);

        buttons.push([
            { text: `${await t('menu.settings', userId)}`, callback_data: "settings" },
            { text: `${await t('menu.help', userId)}`, callback_data: "help" },
        ]);

        if (!isEthereum) {
            buttons.push([
                { text: sniperButtonText, callback_data: "sniper" },
            ]);
        }

        if (!isEthereum) {
            buttons.push([
                { text: `${await t('menu.referral', userId)}`, callback_data: "referral_system" },
                { text: `${await t('menu.trendingCoin', userId)}`, callback_data: "trending_coin" },
            ]);
        } else {
            buttons.push([
                { text: `${await t('menu.referral', userId)}`, callback_data: "referral_system" },
            ]);
        }

        buttons.push([
            { text: `${await t('menu.adminPanel', userId)}`, callback_data: "admin_panel" },
            { text: `${await t('close', userId)}`, callback_data: "menu_close" }
        ]);
    } else {
        buttons = [
            [
                { text: `🔗 Chain`, callback_data: "select_chain" },
            ],
            [
                { text: `${await t('menu.buy', userId)}`, callback_data: "buy" },
                { text: `${await t('menu.sell', userId)}`, callback_data: "sell" },
            ],
            [
                { text: `${await t('menu.wallet', userId)}`, callback_data: "wallets" },
                { text: `${await t('menu.position', userId)}`, callback_data: "positions" }

            ],
            [
                { text: `${await t('menu.settings', userId)}`, callback_data: "settings" },
                { text: `${await t('menu.help', userId)}`, callback_data: "help" },
            ]
        ];

        if (!isEthereum) {
            buttons.push([
                { text: sniperButtonText, callback_data: "sniper" },
            ]);
        }

        buttons.push(
            [
                { text: `${await t('menu.referral', userId)}`, callback_data: "referral_system" },
                { text: `${await t('menu.trendingCoin', userId)}`, callback_data: "trending_coin" },
            ],
            [
                { text: `${await t('close', userId)}`, callback_data: "menu_close" }
            ],
        );
    }

    return { inline_keyboard: buttons };
}

export const getWalletsMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    const userChain = await getUserChain(userId);
    const isEthereum = userChain === "ethereum";

    const buttons: TelegramBot.InlineKeyboardButton[][] = [
        [
            { text: `${await t('wallets.createWallet', userId)}`, callback_data: "wallets_create" },
            { text: `${await t('wallets.importWallet', userId)}`, callback_data: "wallets_import" },
        ],
        [
            { text: `${await t('wallets.switch', userId)}`, callback_data: "wallets_default" },
        ],
        [
            { text: `${await t('wallets.renameWallet', userId)}`, callback_data: "wallets_rename" },
            { text: `${await t('wallets.deleteWallet', userId)}`, callback_data: "wallets_delete" },
        ],
        [
            { text: `${await t('wallets.withdraw', userId)}`, callback_data: "wallets_withdraw" },
            { text: `${await t('wallets.exportPrivateKey', userId)}`, callback_data: "wallets_export" },
        ],
    ];

    if (!isEthereum) {
        buttons.push([
            { text: `👜 ${await t('bundleWallets.bundleWalletsTitle', userId)}`, callback_data: "bundled_wallets" },
        ]);
    }

    buttons.push(
        [
            { text: `${await t('wallets.settings', userId)}`, callback_data: "settings" },
        ],
        [
            { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
            { text: `${await t('refresh', userId)}`, callback_data: "wallets_refresh" },
        ]
    );

    return {
        inline_keyboard: buttons,
    };
};


export const settingsbackButton = async (userId: number): Promise<TelegramBot.InlineKeyboardButton[]> => {
    return [
        { text: `${await t('backSettings', userId)}`, callback_data: "settings_back" },
    ];
};
export const settingsbackButton_1: TelegramBot.InlineKeyboardButton[] = [
    { text: "⬅ Back", callback_data: "settings_back" },
];

export const feebackButton: TelegramBot.InlineKeyboardButton[] = [
    { text: "⬅ Back", callback_data: "settings_fee_back" },
];

export const walletBackButton = async (userId: number): Promise<TelegramBot.InlineKeyboardButton[]> => {
    return [
        { text: `${await t('backWallet', userId)}`, callback_data: "wallets_back" },
    ];
};
export const walletRefreshButton = async (userId: number): Promise<TelegramBot.InlineKeyboardButton[]> => {
    return [
        { text: "⬅ Back to Menu", callback_data: "menu_back" },
        { text: "🔄 Refresh", callback_data: "settings_refresh" },
    ];
};

export const menuBackButton = async (userId: number): Promise<TelegramBot.InlineKeyboardButton[]> => {
    return [
        {
            text: `${await t('backMenu', userId)}`,
            callback_data: "menu_back",
        }
    ];
};

export const walletsBackMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    return {
        inline_keyboard: [await walletBackButton(userId)],
    };
};

export const getSnippingSettingsMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    const settings = await TippingSettings.findOne() || new TippingSettings();
    const subscriptionStatus = settings.sniperSubscriptionRequired ? "🟢" : "🔴";
    const subscriptionText = settings.sniperSubscriptionRequired
        ? await t('snippingSettings.subscriptionRequired', userId)
        : await t('snippingSettings.subscriptionNotRequired', userId);

    return {
        inline_keyboard: [
            [
                { text: `${subscriptionStatus} ${await t('subscribe.subscriptionRequired', userId)} : ${subscriptionText}`, callback_data: "snipping_toggle_subscription" },
            ],
            [
                { text: `📥 ${await t('admin.addSniperUser', userId)}`, callback_data: "add_sniper_user" },
                { text: `🗑️ ${await t('admin.removeSniperUser', userId)}`, callback_data: "remove_sniper_user" },
            ],
            [
                { text: `🔫${await t('snippingSettings.week', userId)} : ${settings.subscriptionPriceWeek || 0.3} ${await t('bundleWallets.sol', userId)}`, callback_data: "admin_subscription_price_week" },
                { text: `🔫${await t('snippingSettings.month', userId)} : ${settings.subscriptionPriceMonth || 0.5} ${await t('bundleWallets.sol', userId)}`, callback_data: "admin_subscription_price_month" },
                { text: `🔫${await t('snippingSettings.year', userId)} : ${settings.subscriptionPriceYear || 5} ${await t('bundleWallets.sol', userId)}`, callback_data: "admin_subscription_price_year" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "admin_panel" },
            ],
        ],
    };
};