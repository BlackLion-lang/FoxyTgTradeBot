import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection } from "../config/connection";
import { getBalance, getSolPrice } from "../services/solana";
import { Types } from "mongoose";
import TelegramBot from "node-telegram-bot-api";
import { User } from "../models/user";

interface Wallet {
    label: string;
    publicKey: string;
    secretKey: string;
}

export const getWalletMessage = async (userId: number) => {
    const user = (await User.findOne({ userId })) || new User();
    const wallets = user.wallets;
    const sol_price = getSolPrice();
    let caption = "";
    const default_wallet = user.get("default_wallet") ?? 0;
    for (let i = 0; i < wallets.length; i++) {
        const balance = await getBalance(wallets[i].publicKey);
        const solAmount = balance.toFixed(5);
        const usdAmount = (balance * (await sol_price)).toFixed(2);
        if (i === default_wallet) {
            caption += `<b>→ ${wallets[i].label} (Default)</b> - <b>${solAmount} SOL</b> (<b>$${usdAmount} USD</b>)\n<code>${wallets[i].publicKey}</code>\n\n`;
        } else {
            caption += `<b>• ${wallets[i].label}</b> - <b>${solAmount} SOL</b> (<b>$${usdAmount} USD</b>)\n<code>${wallets[i].publicKey}</code>\n\n`;
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
