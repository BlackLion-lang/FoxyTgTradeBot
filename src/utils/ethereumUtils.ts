// Ethereum-specific utilities that match Titanium-Trading-Bot structure
import TelegramBot from "node-telegram-bot-api";
import { 
    isEvmAddress, 
    capitalizeFirstLetter, 
    formatNumber, 
    formatNumberWithSuffix,
    walletScanUrl,
    walletDexscreenerUrl,
    walletDextoolsUrl,
    walletDefinedUrl
} from "./ethereum";

// Re-export for compatibility
export {
    isEvmAddress,
    capitalizeFirstLetter,
    formatNumber,
    formatNumberWithSuffix,
    walletScanUrl,
    walletDexscreenerUrl,
    walletDextoolsUrl,
    walletDefinedUrl
};

// Dismiss options for Ethereum
export const dismissOptions: TelegramBot.SendMessageOptions = {
    parse_mode: 'HTML',
    reply_markup: {
        inline_keyboard: [
            [
                { text: '❌ Close', callback_data: 'menu_close' }
            ]
        ]
    }
};

