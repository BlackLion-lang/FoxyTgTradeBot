import { StringExpression } from "mongoose";

export interface Translations {
    // Common
    back: string;
    refresh: string;
    cancel: string;
    confirm: string;
    close: string;
    backMenu: string;
    backSettings: string;
    backWallet: string;
    totals: string;

    //command
    commands: {
        start: string;
        menu: string;
        setting: string;
        wallet: string;
        position: string;
    };

    //Admin
    admin: {
        p1: string;
        p2: string;
        addUser: string;
        removeUser: string;
        tipPercentage: string;
        adminWallet: string;
        solanaPrice: string;
        adminWalletName: string;
        wallet: string;
        p3: string;
        p4: string;
        whitelistActive: string;
        whitelistInactive: string;
        walletName: string;
        referral: string;
        referralSettings: string;
    };

    //welcome
    welcome: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        request: string;
        visit: string;
        admin: string;
    },

    //buy
    buy: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        p12: string;
        p13: string;
        p14: string;
        p15: string;
        p16: string;
        p17: string;
        p18: string;
        p19: string;
        settings: string;
        buy: string;
        default: string;
    };

    //sell
    sell: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        p12: string;
        p13: string;
        p14: string;
        p15:string;
        settings: string;
        sell: string;
        default: string;
    }

    //Positions
    positions: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        importPosition: string;
    }

    //Referral
    referral: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        wallet: string;
        share: string;
        message1: string;
        message2: string;
        message3: string;
        shareMessage1: string;
        shareMessage2: string;
        shareMessage3: string;
        share1: string;
    }

    // Menu
    menu: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        buy: string;
        sell: string;
        wallet: string;
        position: string;
        settings: string;
        help: string;
        referral: string;
        adminPanel: string;
        trendingCoin: string;
    };

    // Wallets
    wallets: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        switch: string;
        createWallet: string;
        importWallet: string;
        renameWallet: string;
        deleteWallet: string;
        withdraw: string;
        exportPrivateKey: string;
        settings: string;
    };

    // Settings
    settings: {
        p1: string,
        p2: string,
        p3: string,
        p4: string,
        p5: string,
        // p6: string,
        // p7: string,
        // p8: string,
        fee: string;
        slippage: string;
        wallet: string;
        language: string;
        quickBuy: string;
        quickSell: string;
        young: string;
        autoImage: string;
        autoSell: string;
        mev: string;
    };

    // Help
    help: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        documentation: string;
        contactSupport: string;
    };

    //Change default wallet
    switch: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
    };

    //Import wallet
    importWallet: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        settings: string;
    };

    //Rename wallet
    renameWallet: {
        p1: string;
        p2: string;
    };

    //Delete wallet
    deleteWallet: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        delete: string;
    };

    //Withdraw wallet
    withdrawWallet: {
        p1: string;
        p2: string;
    }

    //dangerZoneMessage
    dangerZoneMessage: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        exportPrivateKey: string;
    };

    //exportPrivate Key
    exportPrivateKey: {
        p1: string;
        p2: string;
    };

    //privateKey
    privateKey: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        revealKey: string;
        deleteMessage: string;
    };

    //fee settings
    feeSettings: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        p12: string;
        p13: string;
        p14: string;
        p15: string;
        p16: string;
        buyFee: string;
        sellFee: string;
        buyTip: string;
        sellTip: string;
    };

    //slippage setting
    slippageSettings: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        buy: string;
        sell: string;
    }

    //language
    language: {
        p1: string;
        english: string;
        french: string;
    };

    //Quick Buy
    quickBuy: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        p12: string;
        p13: string;
        p14: string;
        p15: string;
        viewToken: string;
        positions: string;
        sell: string;
    };

    //Quick Sell
    quickSell: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        p12: string;
        p13: string;
        p14: string;
        p15: string;
        p16: string;
        p17: string;
        p18: string;
        viewToken: string;
        positions: string;
        buy: string;
    }

    //Auto Sell
    autoSell: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        status1: string;
        status2: string;
        wallet: string;
    };

    //withdrawal
    withdrawal: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        p10: string;
        p11: string;
        confirm: string;
        view: string;
    }

    //Tp & Sl
    TpSl: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        tp: string;
        sl: string;
    };

    image: {
        buy: string;
        sell: string;
        gain: string;
        date: string;
    }

    trending: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p7: string;
        p8: string;
        p9: string;
        next: string;
        previous: string;
    }

    //Messages
    messages: {
        accessDenied: string;
        addRemoveUser: string;
        removed1: string;
        removed2: string;
        successLog: string;
        buy: string;
        sell: string;
        buy_x: string;
        sell_x: string;
        withdraw1: string;
        withdraw2: string;
        createName: string;
        createSuccess1: string;
        createSuccess2: string;
        renameWallet1: string;
        renameWallet2: string;
        deleteWallet1: string;
        deleteWallet2: string;
        deleteWallet3: string;
        positionImport1: string;
        positionImport2: string;
        feeinput: string;
        slippageInput: string;
        youngInput: string;
        quickBuy: string;
        quickSell: string;
        tp: string;
        sl: string;
        useradd: string;
        pnl: string;
        walletLimits: string;
        importwallet1: string;
        importwallet2: string;
        importwallet3: string;
        importwallet4: string;
        importwallet5: string;
        autoSell1: string;
        autoSell2: string;
        autoSell3: string;
        autoSell4: string;
        autoSell5: string;
        autoSell6: string;
        autoSell7: string;
        autoSell8: string;
        entertip: string;
        referral1: string;
        referral2: string;
        referral3: string;
        enterreferral: string;
        enterreferralSettings: string;
        refreshLimit: string;
        refreshwarning: string;
        fee: string;
    };

    // Errors
    errors: {
        invalidId: string;
        targetUser: string;
        removederror: string;
        logError: string;
        invalidAddress: string;
        invalidWithdrawal: string;
        invalidAmount: string;
        invalidSellAmount: string;
        invalidPrivateKey: string;
        walletNotFound: string;
        insufficientBalance: string;
        invalidwallet: string;
        invalidwWalletName1: string;
        invalidwWalletName2: string;
        invalidUser: string;
        invalidselection: string;
        invalidsecretkey: string;
        invalidCopy1: string;
        invalidCopy2: string;
        invalidFee: string;
        invalidSlippage: string;
        invalidyoung: string;
        invalidBuy: string;
        invalidSell: string;
        invalidAutoWallet: string;
        invalidTp: string;
        invalidSl: string;
        alreadyWhitelist: string;
        notToken: string;
        transactionFailed: string;
        transactionError: string;
        invalidtip: string;
        walletLimit: string;
        invalidwallets: string;
        invalidsettings: string;
    };
}
