import { mongoConnection } from "../config/connection";
import mongoose from "mongoose"
import { WhiteListUser } from "./whitelist";

const tippingSettingsSchema = new mongoose.Schema({
  referralReward: { type: Number, default: 0.01 }, // Reward per referral in SOL
  BotStatus: { type: Date, default: Date.now },
  WhiteListUser: { type : Boolean, default: false},
  feePercentage: { type: Number, default: 1.5 }, // Fee percentage for Solana
  feePercentageEth: { type: Number, default: 1.5 }, // Fee percentage for Ethereum
  wallets: { type: Number, default: 5 }, // Deprecated: use walletsSolana / walletsEthereum
  walletsSolana: { type: Number, default: 20 }, // Max Solana wallets per user (create + import)
  walletsEthereum: { type: Number, default: 20 }, // Max Ethereum wallets per user (create + import)
  referralSettings: { type: Number, default: 10},
  subscriptionPriceWeek: { type: Number, default: 0.3 }, // Subscription price for 1 week in SOL
  subscriptionPriceMonth: { type: Number, default: 0.5 }, // Subscription price for 1 month in SOL
  subscriptionPriceYear: { type: Number, default: 5 }, // Subscription price for 1 year in SOL
  sniperSubscriptionRequired: { type: Boolean, default: true }, // Whether subscription is required for sniper access
  adminSolAddress: {
    type: {
      publicKey: { type: String, default: "" },
      secretKey: { type: String, default: "" },
      balance: { type: Number, default: 0 },
      label: { type: String, default: "" },
    },
    default: {}
  },
  defaultLanguage: { type: String, default: "fr", enum: ["fr", "en"] } // Bot default language for users who have not set one
})

export const TippingSettings = mongoConnection.model("TippingSettings", tippingSettingsSchema)