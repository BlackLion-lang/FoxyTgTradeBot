import TelegramBot from "node-telegram-bot-api";
import { t } from "../locales";
import { TippingSettings } from "../models/tipSettings";
import { settings } from "../commands/settings";


export const getAdminPanelMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    const settings = await TippingSettings.findOne() || new TippingSettings(); // Get the first document
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
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('close', userId)}`, callback_data: "menu_close" },
                { text: `${await t('refresh', userId)}`, callback_data: "admin_refresh" },
            ],
        ],
    };
};

export async function getMenuMarkup(userId: number): Promise<TelegramBot.InlineKeyboardMarkup> {

    let buttons: TelegramBot.InlineKeyboardButton[][];

    if (userId === 7994989802 || userId === 2024002049) {
        // Admin user: show admin panel button
        buttons = [
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
            ],
            [
                { text: `🔫 Sniper 🔫`, callback_data: "sniper" },
            ],
            [
                { text: `${await t('menu.referral', userId)}`, callback_data: "referral_system" },
                { text: `${await t('menu.trendingCoin', userId)}`, callback_data: "trending_coin" },
            ],
            [
                { text: `${await t('menu.adminPanel', userId)}`, callback_data: "admin_panel" },
                { text: `${await t('close', userId)}`, callback_data: "menu_close" }
            ]
        ];
    } else {
        buttons = [
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
            ],
            [
                { text: `🔫 Sniper 🔫`, callback_data: "sniper" },
            ],
            [
                { text: `${await t('menu.referral', userId)}`, callback_data: "referral_system" },
                { text: `${await t('menu.trendingCoin', userId)}`, callback_data: "trending_coin" },
            ],
            [
                // { text: `${await t('menu.adminPanel', userId)}`, callback_data: "admin_panel" },
                { text: `${await t('close', userId)}`, callback_data: "menu_close" }
            ],
        ];
    }

    return { inline_keyboard: buttons };
}

export const getWalletsMarkup = async (userId: number): Promise<TelegramBot.InlineKeyboardMarkup> => {
    return {
        inline_keyboard: [
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
            [
                { text: `${await t('wallets.settings', userId)}`, callback_data: "settings" },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: "menu_back" },
                { text: `${await t('refresh', userId)}`, callback_data: "wallets_refresh" },
            ]
        ],
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