import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection } from "../config/connection";
import { getBalance, getSolPrice } from "../services/solana";
import { getBalance as getEthereumBalance, getEtherPrice } from "../services/ethereum/etherscan";
import { getEthereumBalanceContract } from "../services/ethereum/contract"
import { getUserChain } from "./chain";
import { Types } from "mongoose";
import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";

interface Wallet {
    label: string;
    publicKey: string;
    secretKey: string;
    is_active_wallet?: boolean;
}

export const getWalletMessage = async (userId: number, chain?: "solana" | "ethereum") => {
    const user = (await User.findOne({ userId })) || new User();
    
    // If chain not provided, get from user's chain preference
    if (!chain) {
        chain = await getUserChain(userId);
    }
    
    let walletsToDisplay: any[] = [];
    let balanceFetcher: (publicKey: string) => Promise<number>;
    let pricePromise: Promise<number>;
    let currencySymbol: string;

    if (chain === "ethereum") {
        walletsToDisplay = user.ethereumWallets || [];
        balanceFetcher = async (pk) => await getEthereumBalanceContract(pk);
        pricePromise = getEtherPrice();
        currencySymbol = "ETH";
    } else { // solana
        walletsToDisplay = user.wallets || [];
        balanceFetcher = async (pk) => await getBalance(pk);
        pricePromise = Promise.resolve(getSolPrice());
        currencySymbol = "SOL";
    }

    let caption = "";
    const activeWallet = walletsToDisplay.find(wallet => wallet.is_active_wallet);
    const activeWalletIndex = activeWallet ? walletsToDisplay.indexOf(activeWallet) : -1;

    // Get price once for all wallets
    let price = await pricePromise;
    
    // Ensure price is a valid number
    if (typeof price !== 'number' || isNaN(price) || price <= 0) {
        price = chain === "ethereum" ? 3000 : 150; // Default fallback prices
    }

    for (let i = 0; i < walletsToDisplay.length; i++) {
        const wallet = walletsToDisplay[i];
        const balance = await balanceFetcher(wallet.publicKey);
        const amount = balance.toFixed(chain === "ethereum" ? 4 : 5);
        const usdAmount = (balance * price).toFixed(2);
        console.log("withdraw wallet balance", amount, usdAmount);
        
        if (i === activeWalletIndex) {
            caption += `<b>→ ${wallet.label} (Default)</b> - <b>${amount} ${currencySymbol}</b> (<b>$${usdAmount} USD</b>)\n<code>${wallet.publicKey}</code>\n\n`;
        } else {
            caption += `<b>• ${wallet.label}</b> - <b>${amount} ${currencySymbol}</b> (<b>$${usdAmount} USD</b>)\n<code>${wallet.publicKey}</code>\n\n`;
        }
    }
    return caption;
};

export const isExistWallet = (
    wallets: Types.DocumentArray<Wallet>,
    publicKey: string,
) => {
    const index = wallets.findIndex((wallet) => wallet.publicKey === publicKey);
    return index === -1 ? false : true;
};

export const isExistWalletWithName = (
    wallets: Types.DocumentArray<Wallet>,
    label: string,
) => {
    const index = wallets.findIndex((wallet) => wallet.label === label);
    return index === -1 ? false : true;
};

export const txnMethod = ["Ultra", "Jito", "Bloxroute", "Auto", "Node"];
