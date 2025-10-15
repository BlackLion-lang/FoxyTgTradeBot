import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";
import { time, timeStamp } from "console";
import { approveInstructionData } from "@solana/spl-token";
import { am } from "@raydium-io/raydium-sdk-v2/lib/api-80d620f3";


const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
        },
        first_name: {
            type: String,
        },
        userId: {
            type: Number,
        },
        language: {
            type: String,
            default: "fr"
        },
        hasSeenIntro: {
            type: Boolean,
            default: false,
        },
        wallets: {
            type: [
                {
                    publicKey: { type: String, default: "" },
                    secretKey: { type: String, default: "" },
                    balance: { type: String, default: "0" },
                    is_active_wallet: {
                        type: Boolean,
                        default: false,
                    },
                    label: {
                        type: String,
                        default: "Start Wallet",
                    },

                    tradeHistory: [
                        {
                            token_address: String,
                            transaction_type: String, //buy or sell
                            amount: Number,         //swap amount of usd on buy precent of sell
                            token_price: Number,      //price in SOL/USDC
                            token_amount: Number,       //amont token in buy, amount sol in sell
                            token_balance: Number,
                            mc: Number,
                            date: String,
                            name: String,
                            tip: Number,
                            pnl: { type: Boolean, default: true },
                        }],
                    positions: [
                        {
                            amount: { type: Number, default: 0 },
                            solAmount: { type: Number, default: 0 },
                            mint: { type: String, default: "" },
                            price: { type: Number, default: 0 },
                            timestamp: { type: Number, default: Date.now() },
                        }],
                },
            ],
            default: [],
        },
        referrer_wallet: {
            type: String,
            default: ""
        },
        referrals: {
            type: [
                {
                    referredId: { type: String, default: "" }, // Telegram ID of referred user
                    referredName: { type: String, default: "" }, // Username of referred user
                    date: { type: Date, default: Date.now }
                }
            ],
            default: []
        },
        referredIdBy: { type: String, default: "" }, // optional: who referred this user
        referredNameBy: { type: String, default: "" }, // optional: who referred this user
        settings: {
            type: {
                auto_tip: {
                    type: String,
                    default: "high",
                    enum: ["medium", "high", "veryHigh"],
                },
                fee_setting: {
                    type: {
                        buy_fee: { type: Number, default: 0.001 },
                        sell_fee: { type: Number, default: 0.001 },
                        buy_tip: { type: Number, default: 0.005 },
                        sell_tip: { type: Number, default: 0.005 },
                        auto_tip: {
                            type: {
                                is_enabled: {
                                    type: Boolean,
                                    default: false,
                                },
                                max_tip: {
                                    type: Number,
                                    default: 0.005,
                                },
                            },
                            default: {},
                        },
                    },
                    default: {},
                },
                slippage: {
                    type: {
                        buy_slippage: { type: Number, default: 0.5 },
                        sell_slippage: {
                            type: Number,
                            default: 0.5,
                        },
                    },
                    default: {},
                },
                quick_buy: {
                    type: {
                        buy_amount: {
                            type: [
                                {
                                    type: Number,
                                    default: 0,
                                },
                            ],
                            default: [0.5, 1, 2, 5, 10],
                        },
                        is_auto_sell: {
                            type: Boolean,
                            default: false,
                        },
                    },
                    default: {},
                },
                quick_sell: {
                    type: {
                        sell_percent: {
                            type: [
                                {
                                    type: Number,
                                    default: 0,
                                },
                            ],
                            default: [10, 20, 50, 75, 100],
                        },
                    },
                    default: {},
                },

                mev: { type: Boolean, default: true },

                youngTokenDate: {
                    type: Number,
                    default: 6,
                },
                image_activation: {
                    type: Boolean,
                    default: false
                },
                auto_sell: {
                    type: {
                        enabled: { type: Boolean, default: false },
                        // sellOnce: { type: Boolean, default: true},
                        sellPercent: { type: Number, default: 100 },
                        takeProfitPercent: { type: Number, default: 10 },
                        stopLossPercent: { type: Number, default: -40 }
                    },
                    default: {},
                },
                language: {
                    type: String,
                    default: "en",
                    enum: [
                        "en",
                        "fr"
                    ],
                },
            },
            default: {},
        },
        sniper: {
            type: {
                is_snipping: { type: Boolean, default: false },
                allowAutoSell: { type: Boolean, default: true },
                allowAutoBuy: { type: Boolean, default: true },
                advance_mode: { type: Boolean, default: false },
                min_mc: { type: Number, default: null },
                max_mc: { type: Number, default: null },
                min_liq: { type: Number, default: null },
                max_liq: { type: Number, default: null },
                min_vol: { type: Number, default: null },
                max_vol: { type: Number, default: null },
                TXNS_MIN: { type: Number, default: null },
                TXNS_MAX: { type: Number, default: null },
                min_token_age: { type: Number, default: null },
                max_token_age: { type: Number, default: null },
                min_holders: { type: Number, default: null },
                max_holders: { type: Number, default: null },
                bonding_curve_min: { type: Number, default: null },
                bonding_curve_max: { type: Number, default: null },
                time_limit: { type: Number, default: null }, //minutes
                social_check: { type: Boolean, default: false },
                twitter_check: { type: Boolean, default: false },
                buy_amount: { type: Number, default: null },
                buy_limit: { type: Number, default: null },
                buy_tip: { type: Number, default: null },
                sell_tip: { type: Number, default: null },
                slippage: { type: Number, default: 10 },
                mev: { type: Boolean, default: true },
                auto_sell: { type: Boolean, default: false },
                take_profit: { type: Number, default: null },
                stop_loss: { type: Number, default: null },
                tokenlist: {
                    type: [String],
                    default: [],
                }
            },
            default: {},
        },
    },
    {
        timestamps: true,
    },
);

export const User = mongoConnection.model("User", userSchema);
