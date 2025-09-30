import { mongoConnection } from "../config/connection";
import mongoose from "mongoose"
import { WhiteListUser } from "./whitelist";

const tippingSettingsSchema = new mongoose.Schema({
  referralReward: { type: Number, default: 0.01 }, // Reward per referral in SOL
  BotStatus: { type: Date, default: Date.now },
  WhiteListUser: { type : Boolean, default: false},
  feePercentage: { type: Number, default: 1.5 },
  wallets: { type: Number, default: 5 },
  referralSettings: { type: Number, default: 10},
  adminSolAddress: {
    type: {
      publicKey: { type: String, default: "" },
      secretKey: { type: String, default: "" },
      balance: { type: Number, default: 0 },
      label: { type: String, default: "" },
    },
    default: {}
  }
})

export const TippingSettings = mongoConnection.model("TippingSettings", tippingSettingsSchema)