import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const securityLogSchema = new mongoose.Schema(
    {
        userId: { type: Number, required: true, index: true },
        type: {
            type: String,
            required: true,
            enum: [
                "withdraw_pin_fail",
                "withdraw_totp_fail",
                "withdraw_lockout",
                "withdraw_blocked_cooldown",
                "withdraw_blocked_limit",
                "withdraw_session_expired",
                "withdraw_invalid_session",
            ],
        },
        detail: { type: String, default: "" },
    },
    { timestamps: true },
);

export const SecurityLog = mongoConnection.model("SecurityLog", securityLogSchema);
