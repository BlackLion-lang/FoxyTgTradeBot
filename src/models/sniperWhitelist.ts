import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

const SniperWhitelistSchema = new mongoose.Schema({
  userId: { type: Number, unique: true, required: true },
  username: { type: String, default: "" },
  addedAt: { type: Date, default: Date.now },
});

export const SniperWhitelist = mongoConnection.model('SniperWhitelist', SniperWhitelistSchema);

