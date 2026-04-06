import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const withdrawalLogSchema = new mongoose.Schema(
    {
        userId: { type: Number, required: true, index: true },
        chain: { type: String, enum: ["solana", "ethereum"], required: true },
        fromAddress: { type: String, default: "" },
        toAddress: { type: String, default: "" },
        amount: { type: Number, default: 0 },
        txId: { type: String, default: "" },
        status: { type: String, enum: ["success", "failed"], default: "success" },
        error: { type: String, default: "" },
    },
    { timestamps: true },
);

export const WithdrawalLog = mongoConnection.model("WithdrawalLog", withdrawalLogSchema);
