import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const subscribeSchema = new mongoose.Schema(
    {
        telegramId: { type: Number, required: true, index: true },
        username: { type: String, default: "" },
        plan: { type: String, required: true }, // 'week' | 'month' | 'year'
        amountSol: { type: Number, required: true }, // SOL price
        txid: { type: String }, // blockchain transaction ID
        startDate: { type: Number },
        expiresAt: { type: Number },
        active: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

export interface SubscribeDocument extends mongoose.Document {
    telegramId: number;
    username: string;
    plan: string;
    amountSol: number;
    txid?: string;
    startDate?: number;
    expiresAt?: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

subscribeSchema.index({ telegramId: 1, active: 1 });

export const SubscribeModel = mongoConnection.model<SubscribeDocument>("Subscribe", subscribeSchema);