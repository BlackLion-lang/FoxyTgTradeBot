import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const tokenSchema = new mongoose.Schema({
    address: { type: String, default: '' },
    name: { type: String, default: '' },
    symbol: { type: String, default: '' },
    decimal: { type: Number, default: 0 },
    dex_name: { type: String, default: '' },
    pairAddress: { type: String, default: '' },
    priceChange: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    priceUsd: { type: Number, default: 0 },
    initial_price: { type: Number, default: 0 },
    initial_priceUsd: { type: Number, default: 0 },    
    liquidity: { type: Number, default: 0 },
    market_cap: { type: Number, default: 0 },
    createdTime: { type: Number, default: 0 },
    buy_tx_fee: { type: Number, default: 0 },
    sell_tx_fee: { type: Number, default: 0 },
    tran_tx_fee: { type: Number, default: 0 },
    chain: { type: Number, default: 1 }
}, {
    timestamps: true,
    versionKey: false
});

tokenSchema.index({ address: 1 });

export const Token = mongoConnection.model('Token', tokenSchema);

