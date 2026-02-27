import mongoose from "mongoose";
import { mongoConnection } from "../config/connection";

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
            default: "en"
        },
        chain: {
            type: String,
            default: "solana",
            enum: ["solana", "ethereum"]
        },
        hasSeenIntro: {
            type: Boolean,
            default: false,
        },
        bundleWallets: {
            type: [
                {
                    publicKey: { type: String, default: "" },
                    secretKey: { type: String, default: "" },
                }
            ],
            default: [],
        },
        
        // Solana wallets (keeping 'wallets' for backward compatibility)
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
        // Ethereum wallets
        ethereumWallets: {
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
                            transaction_type: String,
                            amount: Number,
                            token_price: Number,
                            token_amount: Number,
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
                        buy_slippage: { type: Number, default: 1 },
                        sell_slippage: {
                            type: Number,
                            default: 1,
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
                        enabled_solana: { type: Boolean, default: false },
                        enabled_ethereum: { type: Boolean, default: false },
                        // sellOnce: { type: Boolean, default: true},
                        sellPercent: { type: Number, default: 100 },
                        // Chain-specific TP/SL settings
                        takeProfitPercent_solana: { type: Number, default: 10 },
                        stopLossPercent_solana: { type: Number, default: -40 },
                        takeProfitPercent_ethereum: { type: Number, default: 10 },
                        stopLossPercent_ethereum: { type: Number, default: -40 }
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
                // Ethereum gas settings
                gas_values_eth: {
                    type: [Number],
                    default: [10, 50, 100]
                },
                option_gas_eth: {
                    type: Number,
                    default: 10
                },
                auto_gas_eth: {
                    type: String,
                    default: "medium",
                    enum: ["low", "medium", "high", "veryHigh"]
                },
                slippage_eth: {
                    type: {
                        buy_slippage_eth: { type: Number, default: 1 },
                        sell_slippage_eth: { type: Number, default: 1 },
                    },
                    default: {},
                },
                // Ethereum quick buy settings
                quick_buy_eth: {
                    type: {
                        buy_amount_eth: {
                            type: [Number],
                            default: [0.1, 0.2, 0.5, 1, 2]
                        },
                    },
                    default: {},
                },
                // Ethereum quick sell settings
                quick_sell_eth: {
                    type: {
                        sell_percent_eth: {
                            type: [Number],
                            default: [10, 20, 50, 75, 100]
                        },
                    },
                    default: {},
                },
            },
            default: {},
        },
        manual_message_id: {
            type: Number,
            default: 0
        },
        sniper: {
            type: {
                is_snipping: { type: Boolean, default: false },
                allowAutoSell: { type: Boolean, default: false },
                allowAutoBuy: { type: Boolean, default: false },
                advance_mode: { type: Boolean, default: false },
                min_mc: { type: Number, default: 1 },
                max_mc: { type: Number, default: 10 },
                min_liq: { type: Number, default: 1 },
                max_liq: { type: Number, default: 100 },
                min_vol: { type: Number, default: 1 },
                max_vol: { type: Number, default: 100 },
                TXNS_MIN: { type: Number, default: 1 },
                TXNS_MAX: { type: Number, default: 1000 },
                min_token_age: { type: Number, default: 1 },
                max_token_age: { type: Number, default: 600 },
                min_holders: { type: Number, default: 1 },
                max_holders: { type: Number, default: 10000 },
                bonding_curve_min: { type: Number, default: 10 },
                bonding_curve_max: { type: Number, default: 80 },
                token_status: { 
                    type: String, 
                    default: "both",
                    enum: ["migrated", "on_bonding", "both"] // migrated = pump swap, on_bonding = pump.fun bonding curve, both = all
                },
                time_limit: { type: Number, default: 30 }, //minutes
                social_check: { type: Boolean, default: false },
                twitter_check: { type: Boolean, default: false },
                buy_amount: { type: Number, default: 0.01 },
                buy_limit: { type: Number, default: 1 },
                buy_tip: { type: Number, default: null },
                sell_tip: { type: Number, default: null },
                slippage: { type: Number, default: 1 },
                mev: { type: Boolean, default: true },
                auto_sell: { type: Boolean, default: false },
                take_profit: { type: Number, default: 20 },
                stop_loss: { type: Number, default: -10 },
                tokenlist: {
                    type: [String],
                    default: [],
                }
            },
            default: {},
        },
        limit_orders: {
            type: [
                {
                    limit_id: { type: String, default: '' },
                    buysell_mode: { type: String, default: 'buy', enum: ['buy', 'sell', 'sell_exact'] },
                    secret_keys: [{ type: String }],
                    limit_mode: { type: Number, default: 0 },
                    token_address: { type: String, default: '' },
                    value: { type: Number, default: 0 },
                    initial_marketcap: { type: Number, default: 0 },
                    gas_amount: { type: Number, default: 0 },
                    slippage: { type: Number, default: 1 },
                    start_time: { type: Number, default: 0 },
                    expiration_time: { type: Number, default: 0 },
                    is_take_profit: { type: Boolean, default: true },
                    message_id: { type: Number, default: 0 },
                    is_cancelled: { type: Boolean, default: false },
                }
            ],
            default: []
        },
        // Copy Trading / Monitor Wallets: target Solana addresses to watch and copy on Pump.fun launches
        copyTrade: {
            type: {
                enabled: { type: Boolean, default: true }, // on/off for the whole copy trading module
                mode: { type: String, default: "auto", enum: ["auto", "manual"] }, // auto = bot buys on new token; manual = notify only, user clicks Buy
                tpSlEnabled: { type: Boolean, default: true },     // on/off for TP/SL on copy-trade positions
                takeProfitPercent: { type: Number, default: 10 },   // TP % for copy-trade positions only
                stopLossPercent: { type: Number, default: -40 },    // SL % for copy-trade positions only
                monitoredWallets: {
                    type: [
                        {
                            address: { type: String, required: true },
                            label: { type: String, default: "" },
                            minAmountSol: { type: Number, default: 0 },
                            maxAmountSol: { type: Number, default: 100 },
                            copyOnNewToken: { type: Boolean, default: true },
                            buyAmountSol: { type: Number, default: 0.01 },
                        }
                    ],
                    default: [],
                },
                pendingAddAddress: { type: String, default: "" }, // temporary: address to confirm add
                pendingAddLabel: { type: String, default: "" },   // temporary: label for the wallet being added
            },
            default: {},
        },
        // pending removed - no longer used
        // pending: {
        //     type: {
        //         from_eth_wallet: { type: Number, default: 0 },
        //         to_eth_wallet: { type: String, default: '' },
        //         token_address: { type: String, default: '' },
        //         from_token_wallet: { type: Number, default: 0 },
        //         to_token_wallet: { type: String, default: '' }
        //     },
        //     default: {}
        // },
    },
    {
        timestamps: true,
    },
);

export const User = mongoConnection.model("User", userSchema);
