import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const pendingUserSchema = new mongoose.Schema({
    userId: { type: String, default: "" },
    username: { type: String, default: "" },
    firstName: { type: String, default: "" },
    pendingReferrer: { type: String, default: "" },
    date: { type: String, default: "" },
});

export const PendingUser = mongoConnection.model("PendingUser", pendingUserSchema);
