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
  copyTradeMonitoredWalletsLimit: { type: Number, default: 10 }, // Max monitored wallets per user (copy trading)
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
  defaultLanguage: { type: String, default: "fr", enum: ["fr", "en"] }, // Bot default language for users who have not set one
  /** Wallets younger than this many days are "fresh" (daily limits + cooldown apply). */
  withdrawFreshWalletDays: { type: Number, default: 7 },
  withdrawFreshDailyLimitSol: { type: Number, default: 5 },
  withdrawFreshDailyLimitEth: { type: Number, default: 0.5 },
  /** Minutes after wallet creation before first withdrawal (0 = off). Only for fresh wallets. */
  withdrawFreshCooldownMinutes: { type: Number, default: 0 },
  withdrawPinLockoutAttempts: { type: Number, default: 5 },
  withdrawPinLockoutMinutes: { type: Number, default: 15 },
})

export const TippingSettings = mongoConnection.model("TippingSettings", tippingSettingsSchema)