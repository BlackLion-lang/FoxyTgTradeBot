import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const limitOrderSchema = new mongoose.Schema(
    {
        user_id: { type: Number, required: true },
        wallet: {type:String, required: true},
        token_mint: { type: String, required: true },
        token_amount: { type: Number, required: true },
        Tp: { type: Number, required: true },
        Sl: { type: Number, required: true },
        target_price1: { type: Number, required: true },
        target_price2: { type: Number, required: true },
        auto_sell_percent: { type: Number },
        /** Last time DexScreener snapshot differed (price/volume/txns) — used for sell-on-no-activity. */
        lastActivityAt: { type: Date },
        lastActivityFingerprint: { type: String, default: "" },
        status: {
            type: String,
            enum: ["Pending", "Success", "Failed"],
            default: "Pending",
        },
    },
    { timestamps: true },
);

export const limitOrderData = mongoConnection.model("LimitOrder", limitOrderSchema);
