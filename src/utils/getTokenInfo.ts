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

export const getTokenDecimal = async (tokenAddress: string) => {
    const tokenAccountInfo = await connection.getParsedAccountInfo(new PublicKey(tokenAddress));
    const data = tokenAccountInfo?.value?.data;
    
    if (data && "parsed" in data) {
        const decimal = data.parsed.info.decimals;
        return decimal;
    } else {
        throw new Error("Unable to fetch token decimals");
    }
};