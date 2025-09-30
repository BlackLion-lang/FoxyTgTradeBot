import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const WhiteListUserSchema = new mongoose.Schema({
  telegramId: { type: String, unique: true, required: true },
  // approved: { type: Boolean, default: false },
  addedAt: { type: Date, default: Date.now },
  userId: { type: Number },
});

export const WhiteListUser = mongoConnection.model('WhiteListUser', WhiteListUserSchema);
