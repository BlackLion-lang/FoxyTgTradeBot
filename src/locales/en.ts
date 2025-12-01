import { Translations } from './types';

export const en: Translations = {
    // Common
    back: "↩️ Back",
    refresh: "🔄 Refresh",
    cancel: "❌ Cancel",
    confirm: "✅ Confirm",
    close: "❌ Close",
    backMenu: "⬅ Back to Menu",
    backWallet: "⬅ Back to Wallet",
    backSettings: "⬅ Back to Settings",
    totals: "totals",

    //command
    commands: {
        start: "Get started with Foxy.",
        menu: "Go to the Foxy main menu.",
        setting: "View Foxy settings.",
        wallet: "View your Foxy wallets.",
        position: "View your token positions."
    },
    //Admin
    admin: {
        p1: "🌠 Welcome, Admin",
        p2: "You can manage the whitelist by adding or removing users as needed.",
        addUser: "Add User",
        removeUser: "Remove user",
        tipPercentage: "💰 Tip Percentage",
        adminWallet: "💼 Admin wallet",
        adminWalletName: "📝 Admin wallet name",
        solanaPrice: "Solana Price",
        wallet : "💼 Wallets",
        p3: "Adresse du portefeuille",
        p4: "Total balance",
        whitelistActive: "Whitelist Active",
        whitelistInactive: "Whitelist Inactive",
        walletName: "None",
        referral: "Rewards per 10 referrals",
        referralSettings: "Custom Referral settings"
    },

    //welcome
    welcome: {
        p1: "Restricted Access – Authorization Required",
        p2: "Hello",
        p3: "This bot is a private service provided by The CryptoFox Learning.",
        p4: "Your Telegram ID is not currently listed in our authorized access list (whitelist).",
        p5: "Access is strictly limited to users who have been manually approved by our team.",
        p6: "To gain access, you must first visit our official website and follow the registration process.",
        p7: "Once your request is submitted, an administrator will contact you to approve or deny your whitelist entry.",
        request: "✅ Request Access",
        visit: "🌐 Visit the Website",
        admin: "👑 Admin Panel"
    },

    // Menu
    menu: {
        p1: "🌠 Hello",
        p2: "Bot's main menu :",
        p3: 'Manage your Solana crypto faster than ever with instant buying and selling, real-time tracking of your positions, and full control of your wallet directly from Telegram.',
        p4: "Your Solana Wallet : ",
        p5: "Enjoy secure transactions, live prices, and reduced fees to optimize every move on the Solana blockchain.",
        p6: "Once the wallet is created, you can iniative transactions directly from the bot.",
        buy: "💰 Buy",
        sell: "🎒 Sell",
        wallet: "💼 Wallet",
        position: "📊 Position",
        settings: "⚙️ Settings",
        referral: "🎁 Referral System",
        help: "🙋‍♂️ Help",
        adminPanel: "👑 Admin Panel",
        trendingCoin: "🥇 Trending Coin"
    },

    //Referral
    referral: {
        p1: "🎁 Referral Program 🎁",
        p2: "Invite your friends and earn exclusive rewards with FoxyBoTracker 🚀",
        p3: "👥 Referred Users",
        p4: "💰 Rewards",
        p5: "🔗 Your referral link",
        p6: "Receive Wallet",
        p7: "Share this link with your friends! Every signup through your link = more profits for you ✨",
        p8: "You receive",
        p9: "for each batch of",
        p10: "referrals",
        wallet: "💼 Set Wallet For Commissions",
        share: "📥 Share your referral link",
        message1: "Please input your wallet for commissions.",
        message2: "Invalid wallet address. Try again!",
        message3: "Invalid wallet address.",
        shareMessage1: "FoxyBoTracker is the best trading bot!",
        shareMessage2: "Manage your Solana crypto faster than ever with instant buying and selling, real-time tracking of your positions, and full control of your wallet directly from Telegram.",
        shareMessage3: "Your referral link :",
        share1: "📥 Share",
    },

    //Buy
    buy: {
        p1: "💰 Buy Menu",
        p2: "🌱 This token is very young. Be cautious.",
        p3: "Token Creation Date :",
        p4: "💸 Price :",
        p5: "🏦 LIQ :",
        p6: "📈 MC :",
        p7: "Renounced",
        p8: "Freeze",
        p9: "Mint",
        p10: "💊 Bonding Curve Progress :",
        p11: "Auto Sell Setting",
        p12: "Status",
        p13: "Take Profit Level :",
        p14: "Stop Loss Level :",
        p15: "🕒 Last Updated (UTC) :",
        p16: "💡 Select an action below.",
        p17: "ago",
        p18: "d",
        p19: "Share token with your friends",
        settings: "⚙️ Settings",
        buy: "Buy",
        default: "Default"
    },

    //sell
    sell: {
        p1: "🎒 Sell Menu",
        p2: "💸 Price :",
        p3: "🏦 LIQ :",
        p4: "📈 MC :",
        p5: "Renounced",
        p6: "Freeze",
        p7: "Mint",
        p8: "💰 Token Balance :",
        p9: "Profit",
        p10: "💹 Avg Entry(MC) :",
        p11: "🕒 Last Updated (UTC) :",
        p12: "💡 Select an action below.",
        p13: "Auto Sell Status :",
        p14: "✅ Successful trade, here is the PNL image of your performance.",
        settings: "⚙️ Settings",
        sell: "Sell",
        p15: "Share token with your friends",
        default: "Default"
    },

    //Positions
    positions: {
        p1: "💼 Foxy Positions",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "💰 Token Balance :",
        p5: "📉 Profit :",
        p6: "💹 Avg. Entry (MC) :",
        p7: "🕒 Last Updated (UTC) :",
        importPosition: "Import Position"
    },

    // Wallets
    wallets: {
        p1: "💼 Foxy Wallet Settings",
        p2: "Your Solana Wallet :",
        p3: "❓ Need more help?",
        p4: "Click Here!",
        p5: "⬇️ Create, manage and import wallets here.",
        p6: "📚 Your Solana Wallets",
        p7: "💁 Tip : Keep your Fox wallets secure",
        p8: "🔒 Select an option below",
        p9: "💡 Select a setting you wish to change",
        p10: "Maximum number of wallets",
        settings: "⚙️ Settings",
        createWallet: "🆕 Create Wallet",
        importWallet: "📥 Import Wallet",
        deleteWallet: "🗑 Delete Wallet",
        renameWallet: "📝 Rename Wallet",
        exportPrivateKey: "🔐 Export Private Key",
        withdraw: "💸 Withdraw",
        switch: "✅ Change Default Wallet",
    },

    // Settings
    settings: {
        p1: "💼 Foxy Settings",
        p2: "❓ Need more help?",
        p3: "Click Here!",
        p4: "🔒 Select an option below?",
        p5: "💡 Select a setting you wish to change.",
        fee: "⛽ Fee",
        slippage: "💦 Slippage",
        wallet: "💳 Wallets",
        language: "🌏 Language",
        quickBuy: "⚡ Quick Buy",
        quickSell: "💰 Quick Sell",
        young: "🌱 Young Token",
        autoImage: "Auto PNL Image",
        autoSell: "🕹️ Auto Sell",
        mev: "MEV Protect"
    },

    // Help
    help: {
        p1: "🎧 Help & Support",
        p2: "📚 For FAQs, guides, and tutorials, visit our Documentation.",
        p3: "🐦 For the latest updates and news, follow us on Twitter.",
        p4: "💬 Need assistance? Contact our Support Manager below.",
        p5: "We are here for you 24/7 !",
        documentation: "📚 Getting Started Guide",
        contactSupport: "💬 Contact Support",
    },

    //Change default wallet
    switch: {
        p1: "🔁 Switch Wallet",
        p2: "Active Wallet :",
        p3: "Address :",
        p4: "Label :",
        p5: "Wallet Balance :",
        p6: "✅ indicates the active wallet",
        p7: "🔓 indicates that the wallet was exported",
        p8: "To switch to another wallet, click on its address below"
    },

    //Import wallet
    importWallet: {
        p1: "✅ Wallet Successfully Imported!",
        p2: "💳 Name : ",
        p3: "🔗 Address : ",
        p4: "💡 To view your other wallets, head over to settings.",
        settings: "⚙️ Settings",
    },

    //Rename wallet
    renameWallet: {
        p1: "✏️ Rename Wallet",
        p2: "💡 Select a wallet you wish to rename."
    },

    //Delete wallet
    deleteWallet: {
        p1: "🗑️ Delete Wallet",
        p2: "💡 Select a wallet you wish to delete.",
        p3: "Are you sure you want to delete the wallet",
        p4: "This action cannot be undone.",
        delete: "🗑️ Delete"
    },

    //Withdraw
    withdrawWallet: {
        p1: "💸 Withdraw",
        p2: "💡 Select a wallet you want to withdraw funds from.",
    },

    //dangerZoneMessage
    dangerZoneMessage: {
        p1: "⚠️ Danger zone!",
        p2: "Be careful, exporting your private key is a dangerous operation.",
        p3: "Anyone",
        p4: "with access to your private key can access your wallet and steal your funds.",
        p5: "WE'LL NO LONGER GUARANTEE THE SAFETY OF YOUR FUNDS.",
        p6: "Are you sure you want to proceed?",
        exportPrivateKey: "🔑 Export",
    },

    //exportPrivate Key
    exportPrivateKey: {
        p1: "🔐 Export Private Key",
        p2: "💡 Select the wallet you wish to export."
    },

    //privateKey
    privateKey: {
        p1: "🔐 Wallet : ",
        p2: "Address : ",
        p3: "🔑Private Key : ",
        p4: "View on Solscan",
        p5: "DO NOT SHARE IT WITH ANYONE",
        p6: "Keep it safe and secure, as it grants full access to your wallet and funds",
        p7: "Once you're done, press DELETE MESSAGE button below",
        revealKey: "🔐 Reveal Key",
        deleteMessage: "🗑️ Delete Message"
    },

    //fee settings
    feeSettings: {
        p1: "⛽️ Fee Settings",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "Fast⚡: Uses around 0.001 SOL per transaction",
        p5: "Fast⚡⚡: Uses around 0.005 SOL per transaction",
        p6: "💡 Increasing your buy and sell fees will speed up the transaction landing on-chain.",
        p7: "⚠️ You have to enter a value between 0 and 1 for every fee value update.",
        p8: "Slow",
        p9: "Normal",
        p10: "Fast",
        p11: "🤖 Recommended Fee Settings",
        p12: "📚 Need more help?",
        p13: "Click Here!",
        p14: "🌎 Current Recommended Fee :",
        p15: "💡 Automatically let Foxy calculate the recommended MEV tip.",
        p16: "⚡ Fee Speed :",
        buyFee: "⛽BuyFee :",
        sellFee: "⛽SellFee :",
        buyTip: "💸BuyTip :",
        sellTip: "💸SellTip :"
    },

    //slippage setting
    slippageSettings: {
        p1: "💦 Slippage Settings",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "💡 Higher slippage % boosts transaction success. For example, 50% increases chances of order being filled.",
        buy: "💦 Buy :",
        sell: "💦 Sell :"
    },

    //language
    language: {
        p1: "Please select your preferred language.",
        english: "English",
        french: "French"
    },

    //Quick Buy
    quickBuy: {
        p1: "⛽️ Quick Buy Settings",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "🌐 Customize your quick buy amounts here.",
        p5: "⚙️ Buy Amounts",
        p6: "💡 Select a quick buy amount you wish to change.",
        p7: "🔃 Quick Buy",
        p8: "Transaction",
        p9: "Slippage",
        p10: "🟡 Buy Pending",
        p11: "Market Cap :",
        p12: "🟢 Buy Success",
        p13: "View on Solscan",
        p14: "Wallet",
        p15: "Token",
        viewToken: "🔄 View Token",
        positions: "📊 Positions",
        sell: "🎒 Sell"
    },

    //Quick Sell
    quickSell: {
        p1: "⛽️ Quick Sell Settings",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "🌐 Customize your quick sell percentages here.",
        p5: "⚙️ Sell Percentages",
        p6: "💡 Select a quick sell percentage you wish to change.",
        p7: "🔃 Quick Sell",
        p8: "Transaction",
        p9: "Amount :",
        p10: "Sell Amount :",
        p11: "Slippage",
        p12: "🟡 Sell Pending",
        p13: "Token balance :",
        p14: "Sell Amount :",
        p15: "Market Cap :",
        p16: "🟢 Sell Success",
        p17: "View on Solscan",
        p18: "Wallet",
        viewToken: "🔄 View Token",
        positions: "📊 Positions",
        buy: "💰 Buy"
    },

    //Auto Sell
    autoSell: {
        p1: "⛽️ Auto Sell Settings",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "🌐 When auto sell is enabled, Foxy will automatically sell any token you paste based on your rules.",
        p5: "Default",
        p6: "📈 Take Profit Level :",
        p7: "📉 Stop Loss Level :",
        p8: "💡 Configure your auto sell settings below.",
        status1: "Enabled",
        status2: "Disabled",
        wallet: "💳 Wallet :",
    },

    //Tp & Sl
    TpSl: {
        p1: "💸 Auto Sell Take Profit & Stop Loss Levels",
        p2: "📚 Need more help?",
        p3: "Click Here!",
        p4: "🌐 After a successful buy trade, a sell limit order will automatically be created based on your profit or stop loss levels.",
        p5: "📈 Take Profit Level : ",
        p6: "📉 Stop Loss Level : ",
        p7: "💡 Add a New Stop Loss or Take Profit Level below.",
        tp: "📈 New Take Profit Level : ",
        sl: "📉 New Stop Loss Level : "
    },

    //withdrawal
    withdrawal: {
        p1: "💳 Withdrawal",
        p2: "Transaction",
        p3: "Withdrawal Pending",
        p4: "View on Solscan",
        p5: "Withdrawal Failed",
        p6: "Withdrawal Success",
        p7: "💸 Confirm Withdrawal",
        p8: "From",
        p9: "To",
        p10: "Amount : ",
        p11: "💡 Would you like to confirm this withdrawal?",
        confirm: "✅ Confirm",
        view: "View Transaction"
    },

    image: {
        buy: "Token buy",
        sell: "Token sell",
        gain: "Gain/Loss",
        date: "Sell Date",
    },

    trending: {
        p1: "🚀 Trending Coins",
        p2: "🔥 Top 10 Trending Tokens",
        p3: "Rank",
        p4: "💠Token Name",
        p5: "🆔Token Address",
        p6: "🪙Liquidity",
        p7: "💲24h Volume",
        p8: "💹Volume Change",
        p9: "💰Price",
        next: "⏭️ Next",
        previous: "⏮️ Previous"
    },

    //Messages
    messages: {
        accessDenied: "Access denied. You are not whitelisted.",
        addRemoveUser: "Please input the user's Telegram ID.",
        removed1: "✅ User with Telegram ID",
        removed2: "has been removed.",
        useradd: "✅ User added successfully",
        successLog: "✅ You have successfully logged in. Welcome to",
        buy: "Reply with a token address to buy.",
        sell: "Reply with a token address to sell.",
        buy_x: "Reply with the amount of SOL you want to trade.",
        sell_x: "Reply with the percent of tokens you want to trade. 10 -> 10%, 20 -> 20%",
        withdraw1: "Please enter the amount you want to withdraw. (in SOL) - Example: 5",
        withdraw2: "Please enter the wallet address you would like to withdraw to.",
        createName: "Please enter the name of your new wallet.",
        createSuccess1: "✅ Wallet",
        createSuccess2: "created successfully!",
        renameWallet1: "Please enter wallet name.",
        renameWallet2: "✅ Wallet name updated successfully to",
        deleteWallet1: "✅ Wallet",
        deleteWallet2: "has been successfully deleted.",
        deleteWallet3: "🔄 Refreshing wallet list...",
        positionImport1: "Enter the token address of the position you want to import.",
        positionImport2: "Have not this token",
        feeinput: "Please enter the fee value (0-1).",
        slippageInput: "Please enter the slippage percentage (0-100).",
        youngInput: "Please enter youong token setting date (1-24).",
        quickBuy: "Please enter the new Buy amount value.",
        quickSell: "Please enter the new Sell Percentage value. (in %) - Example: 100",
        tp: "Please enter the 'Take profit level' percent. 10 -> 10%, 20 -> 20%",
        sl: 'Please enter the "Stop Loss level" percent. -10 -> -10%, -20 -> -20%',
        pnl: "✅Generation of the NLP image in progress...",
        importwallet1: "Wallet name cannot contain symbols or special characters.",
        importwallet2: "Wallet with this name already exists. Please try again.",
        importwallet3: "Please enter the private key of the wallet.",
        importwallet4: "Wallet with this private key already exists. Please try again.",
        importwallet5: "What would you like to name your new wallet?",
        walletLimits: "Please input the wallet limit!",
        autoSell1: "🚀 Your position has been closed automatically.",
        autoSell2: "Token :",
        autoSell3: "💸 Take Profit hit :",
        autoSell4: "🔁 Automatic sale at :",
        autoSell5: "🔁 Automatic sale amount :",
        autoSell6: "The market rose and your take profit level was reached, securing your gains.",
        autoSell7: "🛡️ Your position has been closed automatically.",
        autoSell8: "🚫 The market dropped and your stop loss was triggered, limiting your losses and protecting your remaining capital.",
        entertip: "Please enter the tip percentage!(0-100)",
        enterreferral: "Please enter the referral reward in SOL!",
        referral1: "🎉 Your friend",
        referral2: "joined via your referral link!",
        referral3: "Welcome! You joined with referral code from user",
        enterreferralSettings: "Please enter the referral settings value!(greater than 0)",
        refreshLimit: "Too many refreshes. Please slow down.",
        refreshwarning: "⚠️ Warning ⚠️",
        fee: "Network fees are automatically deducted"
    },

    // Errors
    errors: {
        invalidId: "❌ Invalid Telegram ID. Please enter a Telegram user ID or username.",
        targetUser: "❌ This Telegram user doesn't exist in the whitelist.",
        invalidAddress: "❌ Validation error: The Solana token address you entered is invalid. Please check that it’s correct and try again.",
        removederror: "⚠️ An error occurred while trying to remove the user.",
        logError: "❌ You are not whitelisted to use this bot. Please contact the administrator.",
        invalidAmount: "❌ Validation error: Invalid amount. Try again!",
        invalidSellAmount: "❌ Validation error: Invalid trade amount. Please enter a value between 1 and 100.",
        invalidPrivateKey: "❌ Invalid private key. Please provide a valid private key.",
        walletNotFound: "❌ There must be at least one wallet created.",
        insufficientBalance: "❌ Insufficient balance.",
        invalidWithdrawal: "Invalid withdrawal amount. Please try again.",
        invalidwallet: "Invalid wallet address. Please try again.",
        invalidselection: "❌ Invalid wallet selection.",
        invalidsecretkey: "❌ Wallet does not have a valid secret key or public key.",
        invalidwWalletName1: "❌ Invalid wallet name. Please try again.",
        invalidwWalletName2: "❌ A wallet with this name already exists. Please choose a different name.",
        invalidUser: "❌ User not found. Please try again later.",
        invalidCopy1: "❌ Could not find wallet to copy.",
        invalidCopy2: "❌ No private key available.",
        invalidFee: "❌ Validation error: Invalid fee value. Try again!",
        invalidSlippage: "❌ Validation error: Invalid slippage percentage. Try again!",
        invalidyoung: "❌ Validation error: Invalid date. You must input the number between 1 and 24 Try again!",
        invalidBuy: "Invalid buy amount.",
        invalidSell: "Invalid sell percentage.",
        invalidAutoWallet: "❌ No wallets available to set as default.",
        invalidTp: "❌ Validation error: Invalid value. Please enter a value greater than 0. Try again!",
        invalidSl: "❌ Validation error: Invalid value. Please enter a value less than 0. Try again!",
        alreadyWhitelist: "⚠️ User is already whitelisted",
        notToken: "Token not found",
        transactionFailed: "❌ Transaction failed: Wallet balance is low or transaction was not confirmed in 60.00 seconds.",
        transactionError: "❌ Error: Token balance is low or has not been purchased.",
        invalidtip: "❌ Validation error: Invalid tip percentage. Please enter a value between 0 and 100.",
        invalidsettings: "❌ Validation error: Invalid referral settings. Please enter a value greater than 0.",
        invalidwallets: "❌ Validation error: Invalid wallet limits. Please enter a value between 1 and 100.",
        walletLimit: "❌ Wallet limit reached. You cannot create more than"
    },
};
