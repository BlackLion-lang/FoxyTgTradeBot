import mongoose from "mongoose"
import { mongoConnection } from "../config/connection";

const apiDataSchema = new mongoose.Schema({
    address: { type: String },
    decimals: { type: Number },
    liquidity: { type: Number },
    logoURI: { type: String },
    name: { type: String },
    symbol: { type: String },
    volume24hUSD: { type: Number },
    volume24hChangePercent: { type: Number },
    rank: { type: Number },
    price: { type: Number },
    updatedAt: { type: Date, default: Date.now }
});

apiDataSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 }); // 1 hour TTL index

export const ApiData = mongoConnection.model("ApiData", apiDataSchema);