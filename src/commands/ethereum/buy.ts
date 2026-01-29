import TelegramBot from "node-telegram-bot-api"
import { capitalizeFirstLetter, dismissOptions, formatNumber, formatNumberWithSuffix, isEvmAddress, walletDefinedUrl, walletDexscreenerUrl, walletDextoolsUrl, walletScanUrl } from "../../utils/ethereumUtils"
import { User } from "../../models/user"
import { Token } from "../../models/token"
const { Contract } = require("ethers");
import { newTokenRegistered } from "../../services/ethereum/dexscreener"
import { getBalance, getEtherPrice } from "../../services/ethereum/etherscan"
import { t } from "../../locales"
import { formatNumberStyle, formatWithSuperscript, getLastUpdatedTime, msToTime } from "../../services/other"

export async function Buy(bot: TelegramBot, chatId: number, userId: number, address: string) {
    try {
        const user = await User.findOne({ userId })
        if (!user) {
            await bot.sendMessage(chatId, `❌ User not found.`, dismissOptions);
            return;
        }
        const settings = user.settings || {};
        const wallets = user.ethereumWallets || [];

        let token = await Token.findOne({ address: { $regex: new RegExp(`^${address}$`, "i") } })
        if (!token) {
            token = await newTokenRegistered(address)
            if (token) {
            } else {
                await bot.sendMessage(chatId, `❌ Not a valid token:${address}`, dismissOptions)
                return
            }
        }
        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        const active_wallet_balance = active_wallet ? await getBalance(active_wallet.publicKey || '') : 0
        const eth_price = await getEtherPrice()
        const chainName = 'ETH'

        let options = []

        options.push([
            {
                text: "Etherscan",
                url: walletScanUrl(address),
            },
            {
                text: "DexScreener",
                url: walletDexscreenerUrl(address),
            },
        ])

        options.push([
            {
                text: `${await t('buy.p19', userId)}`,
                switch_inline_query: walletDexscreenerUrl(address),
            },
        ])

        if (active_wallet) {
            options.push([
                {
                    text: `💳 ${active_wallet.label || 'Wallet'} : ${active_wallet_balance.toFixed(4)} ${chainName} ( $${(active_wallet_balance * eth_price).toFixed(2)} )`,
                    callback_data: "wallets_default"
                },
            ])
        }

        options.push([
            { text: `${await t('buy.settings', userId)}`, callback_data: "settings" },
            {
                text: `💦 ${await t('buy.buy', userId)} : ${settings.slippage_eth?.buy_slippage_eth || 0.5} %`,
                callback_data: "settings_buy_slippage_eth"
            }
        ])
        // Gas fee selection buttons
        const gasValues = settings.gas_values_eth || [10, 50, 100];
        const currentGas = settings.option_gas_eth || 10;
        options.push([
            {
                text: (currentGas !== gasValues[0] && currentGas !== gasValues[1] && currentGas !== gasValues[2])
                    ? `⛽ ${currentGas} Gwei 🟢`
                    : `⛽ Gas`,
                callback_data: "settings_buy_gas_eth"
            },
            {
                text: currentGas === gasValues[0] ? `${gasValues[0]} 🟢` : `${gasValues[0]}`,
                callback_data: "buy_gas_eth_0"
            },
            {
                text: currentGas === gasValues[1] ? `${gasValues[1]} 🟢` : `${gasValues[1]}`,
                callback_data: "buy_gas_eth_1"
            },
            {
                text: currentGas === gasValues[2] ? `${gasValues[2]} 🟢` : `${gasValues[2]}`,
                callback_data: "buy_gas_eth_2"
            }
        ])

        const buy_amount = settings.quick_buy_eth?.buy_amount_eth || [0.1, 0.2, 0.5, 1];
        const buy_amounts = buy_amount.length >= 5 ? buy_amount : [...buy_amount, ...Array(5 - buy_amount.length).fill(1)];
        options.push(...[
            [
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[0]} ${chainName}`, callback_data: 'buy_amount_0' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[1]} ${chainName}`, callback_data: 'buy_amount_1' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[2]} ${chainName}`, callback_data: 'buy_amount_2' },
            ],
            [
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[3]} ${chainName}`, callback_data: 'buy_amount_3' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[4] || buy_amounts[3]} ${chainName}`, callback_data: 'buy_amount_4' },
                { text: `💰${await t('buy.buy', userId)} X ${chainName}`, callback_data: 'buy_amount_x' },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: 'menu_back' },
                { text: `${await t('refresh', userId)}`, callback_data: 'manual_refresh' },
            ]
        ])

        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: options
        }

        const tokenPriceUsd = token?.priceUsd || 0
        const tokenPriceEth = token?.price || 0
        const tokenSymbol = token?.symbol || 'TOKEN'
        
        // Calculate token creation time
        const createDate = token?.createdTime || 0
        const now = Date.now()
        const difftime = createDate > 0 ? (now - createDate) : 0
        const { days, hours, minutes, seconds } = msToTime(difftime)
        
        let warning = ""
        if (createDate > 0 && difftime < 1000 * 60 * 60 * (user.settings?.youngTokenDate || 24)) {
            warning = `${await t('buy.p2', userId)}`
        } else if (createDate > 0) {
            warning = `${await t('buy.p3', userId)}`
        }
        
        const text = user.settings.auto_sell?.enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const status = user.settings.auto_sell?.enabled ? "🟢" : "🔴"
        const p1 = user.settings.mev ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const p2 = user.settings.mev ? "🟢" : "🔴"

        let caption = `<strong>${await t('buy.p1', userId)}</strong>\n\n` +
            `💎 ${token?.name || 'Token'} | <strong>$${tokenSymbol}</strong>\n` +
            `<code>${address}</code>\n\n`
        
        // Add token creation time warning if available
        if (warning && createDate > 0) {
            caption += `<strong>${warning}</strong> ${days}${await t('buy.p18', userId)} ${hours}h ${minutes}m ${seconds}s ${await t('buy.p17', userId)}\n\n`
        }
        
        caption += `${await t('buy.p4', userId)} <strong>$${formatWithSuperscript(tokenPriceUsd.toString())}</strong> - ` +
            `${await t('buy.p5', userId)} <strong>$${formatNumberStyle(token?.liquidity || 0)}</strong> - ` +
            `${await t('buy.p6', userId)} <strong>$${formatNumberStyle(token?.market_cap || 0)}</strong>\n\n` +
            `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${active_wallet_balance.toFixed(4)} ETH ($${(active_wallet_balance * eth_price).toFixed(2)} USD)\n` +
            `<code>${active_wallet?.publicKey || ''}</code>\n\n` +
            // `<strong>${await t('settings.mev', userId)} :</strong> ${p2} ${p1}\n\n` +
            `<strong>${await t('buy.p11', userId)} :</strong>\n` +
            `   <strong>${await t('buy.p12', userId)} :</strong> ${status} ${text}\n` +
            `   <strong>${await t('buy.p13', userId)}</strong> ${user.settings.auto_sell?.takeProfitPercent || 0} %\n` +
            `   <strong>${await t('buy.p14', userId)}</strong> ${user.settings.auto_sell?.stopLossPercent || 0} %\n\n` +
            `${await t('buy.p15', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
            `<strong>${await t('buy.p16', userId)}</strong>`

        bot.sendMessage(chatId, caption, {
            parse_mode: 'HTML',
            reply_markup: newMarkup,
            disable_web_page_preview: true
        }).then(async sentMessage => {
            if (user.manual_message_id) {
                bot.deleteMessage(chatId, user.manual_message_id).catch(() => { });
            }
            user.manual_message_id = sentMessage.message_id;
            await user.save()
        })
    } catch (error) {

    }
}

export async function BuyEdit(bot: TelegramBot, chatId: number, userId: number, messageId: number, address: string) {
    try {
        const user = await User.findOne({ userId })
        if (!user) {
            await bot.sendMessage(chatId, `❌ User not found.`, dismissOptions);
            return;
        }
        const settings = user.settings || {};
        const wallets = user.ethereumWallets || [];

        let token = await Token.findOne({ address: { $regex: new RegExp(`^${address}$`, "i") } })
        if (!token) {
            token = await newTokenRegistered(address)
            if (token) {
            } else {
                await bot.sendMessage(chatId, `❌ Not a valid token:${address}`, dismissOptions)
                return
            }
        }
        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        const active_wallet_balance = active_wallet ? await getBalance(active_wallet.publicKey || '') : 0
        const eth_price = await getEtherPrice()
        const chainName = 'ETH'

        let options = []

        options.push([
            {
                text: "Etherscan",
                url: walletScanUrl(address),
            },
            {
                text: "DexScreener",
                url: walletDexscreenerUrl(address),
            },
        ])

        options.push([
            {
                text: `${await t('buy.p19', userId)}`,
                switch_inline_query: walletDexscreenerUrl(address),
            },
        ])

        if (active_wallet) {
            options.push([
                {
                    text: `💳 ${active_wallet.label || 'Wallet'} : ${active_wallet_balance.toFixed(4)} ${chainName} ( $${(active_wallet_balance * eth_price).toFixed(2)} )`,
                    callback_data: "wallets_default"
                },
            ])
        }

        options.push([
            { text: `${await t('buy.settings', userId)}`, callback_data: "settings" },
            {
                text: `💦 ${await t('buy.buy', userId)} : ${settings.slippage_eth?.buy_slippage_eth || 0.5} %`,
                callback_data: "settings_buy_slippage_eth"
            }
        ])
        // Gas fee selection buttons
        const gasValues = settings.gas_values_eth || [10, 50, 100];
        const currentGas = settings.option_gas_eth || 10;
        options.push([
            {
                text: (currentGas !== gasValues[0] && currentGas !== gasValues[1] && currentGas !== gasValues[2])
                    ? `⛽ ${currentGas} Gwei 🟢`
                    : `⛽ Gas`,
                callback_data: "settings_buy_gas_eth"
            },
            {
                text: currentGas === gasValues[0] ? `${gasValues[0]} 🟢` : `${gasValues[0]}`,
                callback_data: "buy_gas_eth_0"
            },
            {
                text: currentGas === gasValues[1] ? `${gasValues[1]} 🟢` : `${gasValues[1]}`,
                callback_data: "buy_gas_eth_1"
            },
            {
                text: currentGas === gasValues[2] ? `${gasValues[2]} 🟢` : `${gasValues[2]}`,
                callback_data: "buy_gas_eth_2"
            }
        ])

        const buy_amount = settings.quick_buy_eth?.buy_amount_eth || [0.1, 0.2, 0.5, 1];
        const buy_amounts = buy_amount.length >= 5 ? buy_amount : [...buy_amount, ...Array(5 - buy_amount.length).fill(1)];
        options.push(...[
            [
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[0]} ${chainName}`, callback_data: 'buy_amount_0' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[1]} ${chainName}`, callback_data: 'buy_amount_1' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[2]} ${chainName}`, callback_data: 'buy_amount_2' },
            ],
            [
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[3]} ${chainName}`, callback_data: 'buy_amount_3' },
                { text: `💰${await t('buy.buy', userId)} ${buy_amounts[4] || buy_amounts[3]} ${chainName}`, callback_data: 'buy_amount_4' },
                { text: `💰${await t('buy.buy', userId)} X ${chainName}`, callback_data: 'buy_amount_x' },
            ],
            [
                { text: `${await t('backMenu', userId)}`, callback_data: 'menu_back' },
                { text: `${await t('refresh', userId)}`, callback_data: 'manual_refresh' },
            ]
        ])

        const newMarkup: TelegramBot.InlineKeyboardMarkup = {
            inline_keyboard: options
        }

        const tokenPriceUsd = token?.priceUsd || 0
        const tokenPriceEth = token?.price || 0
        const tokenSymbol = token?.symbol || 'TOKEN'
        
        // Calculate token creation time
        const createDate = token?.createdTime || 0
        const now = Date.now()
        const difftime = createDate > 0 ? (now - createDate) : 0
        const { days, hours, minutes, seconds } = msToTime(difftime)
        
        let warning = ""
        if (createDate > 0 && difftime < 1000 * 60 * 60 * (user.settings?.youngTokenDate || 24)) {
            warning = `${await t('buy.p2', userId)}`
        } else if (createDate > 0) {
            warning = `${await t('buy.p3', userId)}`
        }
        
        const text = user.settings.auto_sell?.enabled ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const status = user.settings.auto_sell?.enabled ? "🟢" : "🔴"
        const p1 = user.settings.mev ? `${await t('autoSell.status1', userId)}` : `${await t('autoSell.status2', userId)}`
        const p2 = user.settings.mev ? "🟢" : "🔴"

        let caption = `<strong>${await t('buy.p1', userId)}</strong>\n\n` +
            `💎 ${token?.name || 'Token'} | <strong>$${tokenSymbol}</strong>\n` +
            `<code>${address}</code>\n\n`
        
        // Add token creation time warning if available
        if (warning && createDate > 0) {
            caption += `<strong>${warning}</strong> ${days}${await t('buy.p18', userId)} ${hours}h ${minutes}m ${seconds}s ${await t('buy.p17', userId)}\n\n`
        }
        
        caption += `${await t('buy.p4', userId)} <strong>$${formatWithSuperscript(tokenPriceUsd.toString())}</strong> - ` +
            `${await t('buy.p5', userId)} <strong>$${formatNumberStyle(token?.liquidity || 0)}</strong> - ` +
            `${await t('buy.p6', userId)} <strong>$${formatNumberStyle(token?.market_cap || 0)}</strong>\n\n` +
            `💳 <strong>${user.username} (${await t('buy.default', userId)})</strong> : ${active_wallet_balance.toFixed(4)} ETH ($${(active_wallet_balance * eth_price).toFixed(2)} USD)\n` +
            `<code>${active_wallet?.publicKey || ''}</code>\n\n` +
            // `<strong>${await t('settings.mev', userId)} :</strong> ${p2} ${p1}\n\n` +
            `<strong>${await t('buy.p11', userId)} :</strong>\n` +
            `   <strong>${await t('buy.p12', userId)} :</strong> ${status} ${text}\n` +
            `   <strong>${await t('buy.p13', userId)}</strong> ${user.settings.auto_sell?.takeProfitPercent || 0} %\n` +
            `   <strong>${await t('buy.p14', userId)}</strong> ${user.settings.auto_sell?.stopLossPercent || 0} %\n\n` +
            `${await t('buy.p15', userId)} ${getLastUpdatedTime(Date.now())}\n\n` +
            `<strong>${await t('buy.p16', userId)}</strong>`

        // Try to edit as text message first
        try {
            await bot.editMessageText(caption, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: "HTML",
                reply_markup: newMarkup,
            });
        } catch (textError: any) {
            // If it fails because there's no text to edit, try editing as caption (for photo messages)
            if (textError.message && textError.message.includes('there is no text in the message to edit')) {
                await bot.editMessageCaption(caption, {
                    chat_id: chatId,
                    message_id: messageId,
                    parse_mode: "HTML",
                    reply_markup: newMarkup,
                });
            } else {
                // Handle other errors (like "message is not modified")
                if (textError.message && textError.message.includes('message is not modified')) {
                    // Silent return, this is not an error
                    return;
                }
                throw textError;
            }
        }
    } catch (error: any) {
        // Handle the "message is not modified" error gracefully
        if (error?.message && error.message.includes('message is not modified')) {
            console.log('Buy message is already up to date');
            return; // Silent return, this is not an error
        }
        console.error('Error editing buy message:', error);
    }
}
