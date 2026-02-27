import { StringExpression } from "mongoose";

export interface Translations {
    // Common
    back: string;
    currencySymbol_solana: string;
    currencySymbol_ethereum: string;
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
        sniper: string;
        help: string;
        chains: string;
        language: string;
        copytrading: string;
    };

    //Admin
    admin: {
        p1: string;
        p2: string;
        addUser: string;
        removeUser: string;
        tipPercentage: string;
        tipPercentageEth: string;
        adminWallet: string;
        solanaPrice: string;
        addSniperUser: string;
        removeSniperUser: string
        adminWalletName: string;
        walletSolanaLimit: string;
        walletEthereumLimit: string;
        wallet: string;
        p3: string;
        p4: string;
        whitelistActive: string;
        whitelistInactive: string;
        walletName: string;
        referral: string;
        referralSettings: string;
        defaultLanguage: string;
        languageEn: string;
        languageFr: string;
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
        p8: string;
        importPosition: string;
        noPositionsFound: string;
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
        openLink: string;
        viewList: string;
        listTitle: string;
        totalReferrals: string;
        noReferrals: string;
        listHeader: string;
        date: string;
        pageInfo: string;
        prev: string;
        next: string;
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
        p3_ethereum: string;
        p4: string;
        p5: string;
        p5_ethereum: string;
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
        copyTrade: string;
        chain: string;
        chainButton: string;
        botVersion: string;
    };

    // Wallets
    wallets: {
        p1: string;
        p2: string;
        p2_solana: string;
        p2_ethereum: string;
        p3: string;
        p4: string;
        p5: string;
        p6: string;
        p6_solana: string;
        p6_ethereum: string;
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
        changelogs: string;
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

    //Create wallet
    createWallet: {
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
    },

    //Import wallet
    importWallet: {
        p1: string;
        p2: string;
        p3: string;
        p4: string;
        settings: string;
    },

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
    },

    //Default wallet
    defaultWallet: {
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
        p4_ethereum: string;
        p5: string;
        p5_ethereum: string;
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
        buyFee: string;
        sellFee: string;
        buyTip: string;
        sellTip: string;
        gasFeeSettingsEthereum: string;
        configureGasFeeEthereum: string;
        currentGasValues: string;
        gasValue1: string;
        gasValue2: string;
        gasValue3: string;
        veryFast: string;
        low: string;
        recommendedGasFeeSettings: string;
        currentRecommendedGas: string;
        autoCalculateGasPrice: string;
        recommendedFeeSettings: string;
        currentRecommendedFee: string;
        autoCalculateMEVTip: string;
        slowButton: string;
        fastButton: string;
        normalButton: string;
        slowButton2: string;
        enterGasFee: string;
        invalidGasFee: string;
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
        p16: string;
        viewToken: string;
        positions: string;
        sell: string;
        enterBuyAmountEth: string;
        invalidAmountEth: string;
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
        p19: string;
        viewToken: string;
        positions: string;
        buy: string;
        tokenBalance: string;
        selling: string;
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
        withdraw100: string;
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
        viewOnDexscreener: string;
        next: string;
        previous: string;
    };

    // Subscribe
    subscribe: {
        title: string;
        options: string;
        unlockFeatures: string;
        sniping: string;
        choosePlan: string;
        alreadySubscribed: string;
        plan: string;
        started: string;
        expiresIn: string;
        subscriptionRequired: string;
        pressSubscribe: string;
        walletNotConfigured: string;
        userNotFound: string;
        addWalletFirst: string;
        insufficientSol: string;
        insufficientEth: string;
        needed: string;
        available: string;
        subscriptionSuccessful: string;
        txid: string;
        activeUntil: string;
        subscriptionFailed: string;
        subscribeButton: string;
        backToMenu: string;
        week: string;
        month: string;
        year: string;
    };

    // Sniper
    sniper: {
        active: string;
        stopped: string;
        detectedActiveTokens: string;
        noDetectedTokens: string;
        panelDescription: string;
        panelDescription2: string;
        exampleLink: string;
        important: string;
        importantNote: string;
        tokenDetection: string;
        startSnipping: string;
        stopSnipping: string;
        slippage: string;
        buy: string;
        buyLimit: string;
        takeProfit: string;
        stopLoss: string;
        timeLimit: string;
        allowAutoBuy: string;
        allowAutoSell: string;
        advance: string;
        advanceDown: string;
        enableTwitterChannel: string;
        disableTwitterChannel: string;
        bondingCurveMin: string;
        bondingCurveMax: string;
        minMC: string;
        maxMC: string;
        minTokenAge: string;
        maxTokenAge: string;
        minHolders: string;
        maxHolders: string;
        minVolume: string;
        maxVolume: string;
        minLiquidity: string;
        maxLiquidity: string;
        minTXNS: string;
        maxTXNS: string;
        sniperButton: string;
        sniperButtonLocked: string;
        tokenDetectionList: string;
        tokenInfoInstruction: string;
        unknownToken: string;
        detailsUnavailable: string;
        buyToken1: string;
        buyToken2: string;
        buyToken3: string;
        buyToken4: string;
        buyToken5: string;
        lastRefreshed: string;
        tokenStatus: string;
        tokenStatusMigrated: string;
        tokenStatusOnBonding: string;
        tokenStatusBoth: string;
        view: string;
        price: string;
        marketCap: string;
        minutes: string;
        enterBuyLimit: string;
        enterTakeProfit: string;
        enterStopLoss: string;
        enterTimeLimit: string;
        enterBondingCurveMin: string;
        enterBondingCurveMax: string;
        enterMinMarketCap: string;
        enterMaxMarketCap: string;
        enterMinTokenAge: string;
        enterMaxTokenAge: string;
        enterMinHolders: string;
        enterMaxHolders: string;
        enterMinVolume: string;
        enterMaxVolume: string;
        enterMinLiquidity: string;
        enterMaxLiquidity: string;
        enterMinTransactions: string;
        enterMaxTransactions: string;
        stopLossLabel: string;
    };

    // Snipping Settings (Admin)
    snippingSettings: {
        title: string;
        subscriptionRequired: string;
        subscriptionNotRequired: string;
        week: string;
        month: string;
        year: string;
        subscriptionRequirement: string;
        manageDescription: string;
        enterSubscriptionPriceWeek: string;
        enterSubscriptionPriceMonth: string;
        enterSubscriptionPriceYear: string;
        invalidSubscriptionPrice: string;
    }

    copyTrade: {
        title: string;
        subtitle: string;
        enabledOn: string;
        enabledOff: string;
        currentlyMonitoring: string;
        wallets: string;
        addWallet: string;
        removeWallet: string;
        walletSettings: string;
        back: string;
        noWallets: string;
        noWalletsInSettings: string;
        addFirst: string;
        enterAddress: string;
        invalidAddress: string;
        confirmAdd: string;
        addressDetected: string;
        yesAdd: string;
        no: string;
        cancel: string;
        addedSuccess: string;
        removedSuccess: string;
        settingsFor: string;
        copyOnNewToken: string;
        buyAmount: string;
        minAmount: string;
        maxAmount: string;
        rename: string;
        remove: string;
        label: string;
        enterBuyAmount: string;
        enterMinAmount: string;
        enterMaxAmount: string;
        enterLabel: string;
        invalidNumber: string;
        disclaimer: string;
        newTokenDetected: string;
        targetBought: string;
        trackedWallet: string;
        attemptingBuy: string;
        tapBuyToCopy: string;
        viewToken: string;
        buyToken: string;
        copyBuySuccessLaunch: string;
        copyBuySuccessPurchase: string;
        copyBuyFailedLaunch: string;
        copyBuyFailedPurchase: string;
        copyBuySkippedBalance: string;
        copyBuyPending: string;
        modeAuto: string;
        modeManual: string;
        tpSl: string;
        tpSlOn: string;
        tpSlOff: string;
        takeProfit: string;
        stopLoss: string;
        enterTakeProfitCopy: string;
        enterStopLossCopy: string;
        tpSlOnlyCopy: string;
    }

    //Messages
    messages: {
        accessDenied: string;
        addRemoveUser: string;
        removed1: string;
        removed2: string;
        successLog: string;
        buy: string;
        addRemoveSniperUser: string;
        removedSniperUser1: string;
        removedSniperUser2: string;
        sniperUseradd: string;
        sell: string;
        buy_x: string;
        buy_x_ethereum: string;
        sell_x: string;
        withdraw1: string;
        withdraw1_ethereum: string;
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
        walletLimitSolana: string;
        walletLimitEthereum: string;
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
        enterreferral_ethereum: string;
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
        errorOccurred: string;
        walletNotFound: string;
        insufficientBalance: string;
        invalidwallet: string;
        invalidwWalletName1: string;
        invalidwWalletName2: string;
        invalidUser: string;
        invalidselection: string;
        invalidsecretkey: string;
        alreadySniperWhitelist: string;
        targetSniperUser: string;
        invalidCopy1: string;
        invalidCopy2: string;
        invalidFee: string;
        invalidSlippage: string;
        invalidyoung: string;
        userNotFound: string;
        invalidBuy: string;
        invalidSell: string;
        invalidAutoWallet: string;
        invalidTp: string;
        invalidSl: string;
        alreadyWhitelist: string;
        notToken: string;
        transactionFailed: string;
        transactionError: string;
        insufficientFundsForGas: string;
        insufficientFundsForSwap: string;
        insufficientFundsSimple: string;
        invalidtip: string;
        walletLimit: string;
        walletLimitSolana: string;
        walletLimitEthereum: string;
        invalidwallets: string;
        invalidsettings: string;
    };

    // Bundle Wallets
    bundleWallets: {
        // Menu
        menuTitle: string;
        menuDescription: string;
        safeBundler: string;
        maxWallets: string;
        fasterExecution: string;
        bestForOperations: string;
        currentWallets: string;
        chooseOption: string;
        viewWallets: string;
        createWallets: string;
        fundWallets: string;
        cleanFundBundles: string;
        withdrawFromBundles: string;
        resetBundledWallets: string;
        backToBundleWallets: string;
        
        // View
        bundleWalletsTitle: string;
        noBundleWallets: string;
        noBundleWalletsDesc: string;
        totalWallets: string;
        walletNumber: string;
        address: string;
        sol: string;
        eth: string;
        tokens: string;
        noTokens: string;
        errorLoading: string;
        
        // Create
        createTitle: string;
        howManyWallets: string;
        maxWalletsNote: string;
        invalidCount: string;
        invalidCountDesc: string;
        selectedWallets: string;
        all: string;
        youSelectedCount: string;
        pleaseSelectMaxOrFewer: string;
        youSelectedForBundler: string;
        clickToProceed: string;
        creatingWallets: string;
        congratulations: string;
        walletsCreated: string;
        savePrivateKeys: string;
        invalidWalletCount: string;
        pleaseEnterValidNumber: string;
        walletKeysTitle: string;
        storeSecurely: string;
        neverShare: string;
        downloadAndSave: string;
        keysFileSent: string;
        
        // Bundle Wallet Keys File
        bundleWalletKeysHeader: string;
        dateLabel: string;
        operationBundleCreation: string;
        bundleTypeLabel: string;
        totalWalletsLabel: string;
        bundleWalletNumber: string;
        publicKeyAddress: string;
        privateKeyLabel: string;
        solscanLabel: string;
        importantKeepKeysSafe: string;
        bundleWalletKeysDescription: string;
        loseKeysWarning: string;
        storeFileSecure: string;
        neverShareKeys: string;
        
        // Recovery Keys File
        recoveryKeysHeader: string;
        operationCleanFunding: string;
        totalAmountLabel: string;
        bundleWalletsLabel: string;
        tempWalletsLabel: string;
        devWalletLabel: string;
        tempWalletNumber: string;
        publicKeyLabel: string;
        recoveryKeysDescription: string;
        tempWalletsClosed: string;
        recoveryInstructions: string;
        
        // Fund
        fundTitle: string;
        activeWallet: string;
        balance: string;
        bundles: string;
        enterAmount: string;
        enterAmount_ethereum: string;
        fundingInProgress: string;
        userNotFound: string;
        activeWalletNotConfigured: string;
        noBundleWalletsFound: string;
        invalidAmount: string;
        fundingAlreadyInProgress: string;
        startingDistribution: string;
        amount: string;
        wallets: string;
        status: string;
        insufficientAmount: string;
        provided: string;
        required: string;
        breakdown: string;
        distribution: string;
        feesReserves: string;
        addMore: string;
        insufficientBalance: string;
        available: string;
        pleaseAdd: string;
        toActiveWallet: string;
        
        // Clean Fund
        cleanFundTitle: string;
        cleanFundDesc: string;
        cleanFundDesc_ethereum: string;
        mayTakeMoment: string;
        cleanFundComplete: string;
        tempWalletsCleaned: string;
        
        // Withdraw
        withdrawTitle: string;
        activeBalance: string;
        totalWithdrawable: string;
        fromWallets: string;
        willWithdrawAll: string;
        typeConfirm: string;
        withdrawalCancelled: string;
        withdrawingFunds: string;
        processing: string;
        processed: string;
        totalWithdrawn: string;
        withdrawalComplete: string;
        successfullyWithdrew: string;
        fundsInActiveWallet: string;
        noWithdrawableFunds: string;
        allWalletsInsufficient: string;
        needRentExempt: string;
        
        // Reset
        resetTitle: string;
        resetWarning: string;
        willDeleteAll: string;
        cannotBeUndone: string;
        savePrivateKeysIfNeeded: string;
        typeReset: string;
        resetCancelled: string;
        resetComplete: string;
        allWalletsDeleted: string;
        noBundleWalletsToReset: string;
        
        // Buy/Sell
        noBundleWalletsForBuy: string;
        needCreateFirst: string;
        goToCreate: string;
        bundleBuyStarted: string;
        token: string;
        usingAllBalance: string;
        walletsWithBalance: string;
        bundleBuy: string;
        success: string;
        failed: string;
        bundleBuyComplete: string;
        successful: string;
        totalBought: string;
        successfulTransactions: string;
        failedWallets: string;
        insufficientBalanceForBuy: string;
        noneHaveEnoughSol: string;
        needAtLeast: string;
        needAtLeast_ethereum: string;
        bundleSellStarted: string;
        selling: string;
        percentOfBalance: string;
        checkingBalances: string;
        noTokenBalance: string;
        noneHaveToken: string;
        foundTokensIn: string;
        bundleSell: string;
        bundleSellComplete: string;
        sold: string;
        activeWalletNotConfiguredBuy: string;
        
        // Funding process messages
        recoveryKeysTitle: string;
        recoveryKeysCaption: string;
        recoveryKeysWarning: string;
        recoveryKeysDownload: string;
        recoveryKeysRecover: string;
        recoveryKeysStart: string;
        criticalError: string;
        failedToSendRecovery: string;
        operationAborted: string;
        checkInternetConnection: string;
        cleanDistribution: string;
        validated: string;
        distributable: string;
        distributable_ethereum: string;
        creatingTempWallets: string;
        phase: string;
        fundingTemps: string;
        tempWallets: string;
        funded: string;
        fundingFailed: string;
        couldNotFundTempWallets: string;
        phaseComplete: string;
        tempsFunded: string;
        breakingHeuristics: string;
        heuristics: string;
        fundingBundles: string;
        allTempWalletsExhausted: string;
        distributionIncomplete: string;
        someBundlesNotFunded: string;
        checkRecoveryKeys: string;
        bundleNumber: string;
        fundingComplete: string;
        fundingSuccess: string;
        perWallet: string;
        accountsClosed: string;
        recovered: string;
        transactionExplorer: string;
        tempFunding: string;
        wsolOperations: string;
        bundleDistribution: string;
        accountClosure: string;
        allTempAccountsClosed: string;
        bundleWalletsReady: string;
        viewOnSolscan: string;
        distributingToBundles: string;
        confirmingTransactions: string;
        closingAccounts: string;
        bundleFunded: string;
        insufficient: string;
        
        // Button labels
        bundleBuyButton: string;
        bundleSellButton: string;
    };

    // Chain Selection
    chain: {
        selectBlockchain: string;
        current: string;
        choosePreferred: string;
        solana: string;
        ethereum: string;
        solanaSelected: string;
        ethereumSelected: string;
    };
}
