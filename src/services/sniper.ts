import WebSocket from 'ws';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import { User } from "../models/user";
import BN from "bn.js";
import * as dotenv from 'dotenv';
import AntService from './antService';
import { sendMessageToUser } from "../bot";
import {
  getBalance,
  getSolPrice,
} from "../services/solana";
import { swapToken } from "./jupiter";

dotenv.config();

console.log('Pump Sniper service starting...');

const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=8cdb777a-195a-4cfe-a1ec-d5a4f70ccfe1";
const connection = new Connection(
  RPC_ENDPOINT,
  'confirmed',
);

// Note: Using Jupiter swap instead of pump.fun SDK for buy/sell operations

interface SniperInstance {
  ws: WebSocket;
  intervals: NodeJS.Timeout[];
  cleanup: () => void;
}

interface TokenData {
  tokenAddress: string;
  address: string;
  name?: string;
  symbol?: string;
  description?: string;
  imageUri?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  volume: number;
  holders: number;
  bondingCurve: number;
  createdAt: number | null; // Can be null if age is unknown
  numBuys: number;
  numSells: number;
  isMigrated?: boolean; // true if token has migrated to pump swap only, false if still on pump.fun bonding curve
}

interface FilterCriteria {
  volume?: { min?: number; max?: number };
  age?: { min?: number; max?: number };
  holders?: { min?: number; max?: number };
  liquidity?: { min?: number; max?: number };
  marketCap?: { min?: number; max?: number };
  bondingCurve?: { min?: number; max?: number };
  numBuys?: { min?: number; max?: number };
  numSells?: { min?: number; max?: number };
  totalTxns?: { min?: number; max?: number }; // Total transactions (numBuys + numSells)
  twitter?: { min?: number; max?: number };
  telegram?: boolean;
  atLeastOneSocial?: boolean;
}

interface Position {
  mint: string;
  amount: BN | number;
  solAmount: BN | number;
  price: number;
  timeStamp?: number;
  timestamp?: number;
}

// Sniper manager to track running instances
const activeSnipers = new Map<number, SniperInstance>();

// Shared AntService instance (primary service for token detection)
let sharedAntService: AntService | null = null;

// Initialize shared AntService
const initSharedAntService = async (): Promise<AntService> => {
  if (!sharedAntService) {
    sharedAntService = new AntService();
  }
  return sharedAntService;
};

// Helper function to convert AntService pulse response to token format
const convertAntPulseToToken = (pulseItem: any, isMigrated: boolean = false): TokenData | null => {
  const tokenAddress = pulseItem.base || pulseItem.mint || pulseItem.token_address || pulseItem.address || pulseItem.id;
  if (!tokenAddress) return null;

  const marketCap = parseFloat(pulseItem.market_cap || pulseItem.usd_market_cap || pulseItem.marketCap || '0');
  const liquidity = parseFloat(pulseItem.liquidity || pulseItem.usd_liquidity || pulseItem.liquidity_usd || '0');

  return {
    tokenAddress: tokenAddress,
    address: tokenAddress,
    name: pulseItem.name || pulseItem.token_name,
    symbol: pulseItem.symbol || pulseItem.token_symbol,
    description: pulseItem.description,
    imageUri: pulseItem.image_uri || pulseItem.image,
    twitter: pulseItem.tw || pulseItem.twitter || pulseItem.twitter_url,
    telegram: pulseItem.tg || pulseItem.telegram || pulseItem.telegram_url,
    website: pulseItem.web || pulseItem.website || pulseItem.website_url,
    marketCap: marketCap,
    liquidity: liquidity,
    volume24h: parseFloat(pulseItem.volume_usd || pulseItem.volume_24h || pulseItem.volume24h || pulseItem.volume_usd_24h || '0'),
    volume: parseFloat(pulseItem.volume_usd || pulseItem.volume_24h || pulseItem.volume24h || pulseItem.volume_usd_24h || '0'),
    holders: parseInt(pulseItem.holders || pulseItem.holder_count || pulseItem.holders_count || '0', 10),
    // AntService returns bonding_curve as decimal (0.2175 = 21.75%), convert to percentage for consistency
    // Note: Migrated tokens may not have bonding_curve (they're on Raydium, not bonding curve)
    bondingCurve: isMigrated ? 100 : (parseFloat(pulseItem.bonding_curve || pulseItem.bondingCurve || '0') * 100),
    isMigrated: isMigrated, // Mark if token has migrated to pump swap only
    // Try multiple possible timestamp fields from AntService
    // If none found, use null instead of Date.now() to indicate unknown age
    createdAt: (() => {
      // Try created_at first (most common)
      if (pulseItem.created_at) {
        if (typeof pulseItem.created_at === 'number') {
          // If it's a Unix timestamp in seconds, convert to milliseconds
          return pulseItem.created_at < 10000000000 ? pulseItem.created_at * 1000 : pulseItem.created_at;
        }
        if (typeof pulseItem.created_at === 'string') {
          if (pulseItem.created_at.includes('T') || pulseItem.created_at.includes('-')) {
            return new Date(pulseItem.created_at).getTime();
          }
          const parsed = parseInt(pulseItem.created_at, 10);
          if (!isNaN(parsed)) {
            return parsed < 10000000000 ? parsed * 1000 : parsed;
          }
        }
      }
      // Try created_timestamp
      if (pulseItem.created_timestamp) {
        if (typeof pulseItem.created_timestamp === 'number') {
          return pulseItem.created_timestamp < 10000000000 ? pulseItem.created_timestamp * 1000 : pulseItem.created_timestamp;
        }
        if (typeof pulseItem.created_timestamp === 'string') {
          if (pulseItem.created_timestamp.includes('T') || pulseItem.created_timestamp.includes('-')) {
            return new Date(pulseItem.created_timestamp).getTime();
          }
          const parsed = parseInt(pulseItem.created_timestamp, 10);
          if (!isNaN(parsed)) {
            return parsed < 10000000000 ? parsed * 1000 : parsed;
          }
        }
      }
      // Try timestamp
      if (pulseItem.timestamp) {
        if (typeof pulseItem.timestamp === 'number') {
          return pulseItem.timestamp < 10000000000 ? pulseItem.timestamp * 1000 : pulseItem.timestamp;
        }
        if (typeof pulseItem.timestamp === 'string') {
          const parsed = parseInt(pulseItem.timestamp, 10);
          if (!isNaN(parsed)) {
            return parsed < 10000000000 ? parsed * 1000 : parsed;
          }
        }
      }
      // Try created
      if (pulseItem.created) {
        if (typeof pulseItem.created === 'number') {
          return pulseItem.created < 10000000000 ? pulseItem.created * 1000 : pulseItem.created;
        }
        if (typeof pulseItem.created === 'string') {
          if (pulseItem.created.includes('T') || pulseItem.created.includes('-')) {
            return new Date(pulseItem.created).getTime();
          }
          const parsed = parseInt(pulseItem.created, 10);
          if (!isNaN(parsed)) {
            return parsed < 10000000000 ? parsed * 1000 : parsed;
          }
        }
      }
      // If age is provided in seconds, calculate createdAt from current time
      if (pulseItem.age != null && typeof pulseItem.age === 'number' && pulseItem.age >= 0) {
        return Date.now() - (pulseItem.age * 1000);
      }
      // No timestamp found - return null to indicate unknown age
      return null;
    })(),
    numBuys: parseInt(pulseItem.btnxs || pulseItem.num_buys || pulseItem.buy_count || '0', 10),
    numSells: parseInt(pulseItem.stnxs || pulseItem.num_sells || pulseItem.sell_count || '0', 10),
  };
};

// Filter tokens based on criteria
const filterTokens = (tokens: TokenData[], filters: FilterCriteria): TokenData[] => {
  return tokens.filter((token) => {
    if (filters.volume) {
      const volume = token.volume24h || token.volume || 0;
      if (filters.volume.min != null && typeof filters.volume.min === 'number' && volume < filters.volume.min) return false;
      if (filters.volume.max != null && typeof filters.volume.max === 'number' && volume > filters.volume.max) return false;
    }

    if (filters.age) {
      // Only filter by age if we have a valid createdAt timestamp
      if (token.createdAt != null && token.createdAt > 0) {
        const age = (Date.now() - token.createdAt) / 1000;
        // Skip age filtering if age is negative (future timestamp) or invalid
        if (age >= 0 && age < 31536000) { // Max 1 year in seconds
          if (filters.age.min != null && typeof filters.age.min === 'number' && age < filters.age.min) return false;
          if (filters.age.max != null && typeof filters.age.max === 'number' && age > filters.age.max) return false;
        }
        // If age is invalid (negative or too large), skip age filtering for this token
      } else if (filters.age.min != null) {
        // If min age is required but we don't have createdAt, skip age filtering for this token
        // Don't reject - allow tokens with unknown age to pass if other filters match
        // This allows detection of tokens even when age info is missing
      }
    }

    if (filters.holders) {
      const holders = token.holders || 0;
      if (filters.holders.min != null && typeof filters.holders.min === 'number' && holders < filters.holders.min) return false;
      if (filters.holders.max != null && typeof filters.holders.max === 'number' && holders > filters.holders.max) return false;
    }

    if (filters.liquidity) {
      // IMPORTANT: Pump.fun tokens don't need liquidity (they're on bonding curve)
      // Only apply liquidity filter to migrated tokens (pump swap only)
      // Migrated tokens require real liquidity in the pump swap pool
      if (token.isMigrated === true) {
        const liquidity = token.liquidity || 0;
        if (filters.liquidity.min != null && typeof filters.liquidity.min === 'number' && liquidity < filters.liquidity.min) return false;
        if (filters.liquidity.max != null && typeof filters.liquidity.max === 'number' && liquidity > filters.liquidity.max) return false;
      }
      // If token is still on pump.fun (isMigrated === false or undefined), skip liquidity filtering
      // This allows pump.fun tokens to pass even with 0 liquidity
    }

    if (filters.marketCap) {
      const marketCap = token.marketCap || 0;
      if (filters.marketCap.min != null && typeof filters.marketCap.min === 'number' && marketCap < filters.marketCap.min) return false;
      if (filters.marketCap.max != null && typeof filters.marketCap.max === 'number' && marketCap > filters.marketCap.max) return false;
    }

    if (filters.bondingCurve) {
      // Only apply bonding curve filter to tokens that are NOT migrated
      // Migrated tokens don't have bonding curves (they've moved to pump swap only, not on bonding curve)
      if (token.isMigrated === true) {
        // Skip bonding curve filter for migrated tokens - they don't have bonding curves
      } else {
        const bondingCurve = token.bondingCurve || 0;
        if (filters.bondingCurve.min != null && typeof filters.bondingCurve.min === 'number' && bondingCurve < filters.bondingCurve.min) return false;
        if (filters.bondingCurve.max != null && typeof filters.bondingCurve.max === 'number' && bondingCurve > filters.bondingCurve.max) return false;
      }
    }

    if (filters.numBuys) {
      const numBuys = token.numBuys || 0;
      if (filters.numBuys.min != null && typeof filters.numBuys.min === 'number' && numBuys < filters.numBuys.min) return false;
      if (filters.numBuys.max != null && typeof filters.numBuys.max === 'number' && numBuys > filters.numBuys.max) return false;
    }

    if (filters.numSells) {
      const numSells = token.numSells || 0;
      if (filters.numSells.min != null && typeof filters.numSells.min === 'number' && numSells < filters.numSells.min) return false;
      if (filters.numSells.max != null && typeof filters.numSells.max === 'number' && numSells > filters.numSells.max) return false;
    }

    if (filters.totalTxns) {
      const totalTxns = (token.numBuys || 0) + (token.numSells || 0);
      if (filters.totalTxns.min != null && typeof filters.totalTxns.min === 'number' && totalTxns < filters.totalTxns.min) return false;
      if (filters.totalTxns.max != null && typeof filters.totalTxns.max === 'number' && totalTxns > filters.totalTxns.max) return false;
    }

    if (filters.twitter) {
      const hasTwitter = !!token.twitter;
      if (filters.twitter.max === 1 && !hasTwitter) return false;
      if (filters.twitter.min === 1 && !hasTwitter) return false;
    }

    if (filters.telegram !== undefined) {
      const hasTelegram = !!token.telegram;
      if (filters.telegram && !hasTelegram) return false;
    }

    if (filters.atLeastOneSocial) {
      if (!token.twitter && !token.telegram && !token.website) return false;
    }

    return true;
  });
};

// Helper function to get SPL token balance
const getSPLBalance = async (connection: Connection, mint: PublicKey, owner: PublicKey): Promise<number> => {
  try {
    const tokenAccount = getAssociatedTokenAddressSync(mint, owner);
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount);
  } catch (error) {
    return 0;
  }
};

// Cleanup function for a sniper instance
export function stopSniper(user_id: number): void {
  const sniper = activeSnipers.get(user_id);
  if (sniper) {
    console.log(`🛑 Stopping sniper for user: ${user_id}`);
    
    if (sniper.ws && sniper.ws.readyState === WebSocket.OPEN) {
      sniper.ws.close();
    }
    
    if (sniper.intervals) {
      sniper.intervals.forEach(interval => clearInterval(interval));
    }
    
    activeSnipers.delete(user_id);
    console.log(`✅ Sniper stopped for user: ${user_id}`);
  }
}

export async function runSniper(user_id: number): Promise<void> {
  if (activeSnipers.has(user_id)) {
    console.log(`⏭️  Sniper already running for user: ${user_id}, skipping...`);
    return;
  }

  const user = await User.findOne({ userId: user_id });
  if (!user || !user.sniper.is_snipping) {
    console.log(`⏭️  User ${user_id} has sniper disabled, skipping...`);
    return;
  }

  console.log(`🚀 Starting sniper for user: ${user_id}`);

  const ws = new WebSocket('wss://pumpportal.fun/api/data');
  
  const intervals: NodeJS.Timeout[] = [];
  const cleanup = () => {
    stopSniper(user_id);
  };

  activeSnipers.set(user_id, { ws, intervals, cleanup });

  if (!user) {
    stopSniper(user_id);
    throw new Error("No User");
  }

  const active_wallet = user.wallets.find(
    (wallet) => wallet.is_active_wallet,
  );

  if (!active_wallet) {
    stopSniper(user_id);
    throw new Error("No active wallet found");
  }

  const walletPubKeyStr = typeof active_wallet.publicKey === 'string' ? active_wallet.publicKey : (active_wallet.publicKey as any).toString();
  await getBalance(walletPubKeyStr);
  const sol_price = await getSolPrice();

  const BUY_LIMIT = 1 * Number(user.sniper.buy_limit);
  const BUY_AMOUNT = Number(user.sniper.buy_amount);
  const BONDING_CURVE_MIN = Number((user.sniper as any).bonding_curve_min || 0);
  const BONDING_CURVE_MAX = Number((user.sniper as any).bonding_curve_max || 0);
  // User input is in "K" format (e.g., 1 = 1K = 1000 USD)
  // Convert directly to USD (multiply by 1000), no need to convert to SOL and back
  const MC_MIN = Number((user.sniper as any).min_mc * 1000);
  const MC_MAX = Number((user.sniper as any).max_mc * 1000);
  const AGE_MIN = Number((user.sniper as any).min_token_age || 0);
  const AGE_MAX = Number((user.sniper as any).max_token_age || 0);
  const HOLDER_MIN = Number((user.sniper as any).min_holders || 0);
  const HOLDER_MAX = Number((user.sniper as any).max_holders || 0);
  const ALLOW_AUTO_SELL = user.sniper.allowAutoSell;
  // User model uses min_vol/max_vol, not volume_min/volume_max
  const VOLUME_MIN = (user.sniper as any).min_vol ? Number((user.sniper as any).min_vol * 1000) : null;
  const VOLUME_MAX = (user.sniper as any).max_vol ? Number((user.sniper as any).max_vol * 1000) : null;
  const LIQ_MIN = Number((user.sniper as any).min_liq * 1000);
  const LIQ_MAX = Number((user.sniper as any).max_liq * 1000);
  const TXNS_MIN = (user.sniper as any).TXNS_MIN ? Number((user.sniper as any).TXNS_MIN) : null;
  const TXNS_MAX = (user.sniper as any).TXNS_MAX ? Number((user.sniper as any).TXNS_MAX) : null;
  const NUM_BUYS_MIN = (user.sniper as any).NUM_BUYS_MIN ? Number((user.sniper as any).NUM_BUYS_MIN) : null;
  const NUM_BUYS_MAX = (user.sniper as any).NUM_BUYS_MAX ? Number((user.sniper as any).NUM_BUYS_MAX) : null;
  const NUM_SELLS_MIN = (user.sniper as any).NUM_SELLS_MIN ? Number((user.sniper as any).NUM_SELLS_MIN) : null;
  const NUM_SELLS_MAX = (user.sniper as any).NUM_SELLS_MAX ? Number((user.sniper as any).NUM_SELLS_MAX) : null;
  const DEV_HOLDING_MIN = (user.sniper as any).DEV_HOLDING_MIN ? Number((user.sniper as any).DEV_HOLDING_MIN) : null;
  const DEV_HOLDING_MAX = (user.sniper as any).DEV_HOLDING_MAX ? Number((user.sniper as any).DEV_HOLDING_MAX) : null;

  let processing = false;

  const buy = async (mintAddress: string): Promise<void> => {

    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      console.log(`🛑 User ${user_id} disabled sniper during buy, stopping...`);
      stopSniper(user_id);
      return;
    }

    const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
    if (!currentActiveWallet) {
      throw new Error("No active wallet found for user.");
    }

    const currentBuyCnt = currentActiveWallet?.positions?.length || 0;
    const currentBuyLimit = Number(currentUser.sniper.buy_limit);
    if (processing || currentBuyCnt >= currentBuyLimit) return;
    
    const startTime = Date.now();
    processing = true;
    
    try {
      // Subscribe to token trade events via WebSocket
      const payload = {
        method: "subscribeTokenTrade",
        keys: [mintAddress]
      };
      ws.send(JSON.stringify(payload));

      const currentBuyAmount = Number(currentUser.sniper.buy_amount);
      const slippage = currentUser.sniper.slippage || 50; // Default slippage in basis points
      const fee = typeof currentUser.settings?.mev === 'number' ? currentUser.settings.mev : (currentUser.settings?.mev ? 0 : 0);

      // Use Jupiter swap for buying tokens
      const result = await swapToken(
        user_id,
        currentActiveWallet.publicKey,
        mintAddress,
        currentBuyAmount, // Amount of SOL to spend
        "buy",
        slippage,
        fee
      );

      if (result.success && result.signature) {
        const submitTime = Date.now();
        console.log(`Buy Transaction sent: ${mintAddress} : https://solscan.io/tx/${result.signature}`);
        console.log(`Buy Transaction confirmed: ${mintAddress} : in ${Date.now() - submitTime}ms | Total: ${Date.now() - startTime}ms`);
        
        const tokenUrl = `https://solscan.io/token/${mintAddress}`;
        const msg = `✅ Successfully bought token: [${mintAddress}](${tokenUrl})\nAmount: ${currentBuyAmount} SOL`;
        await sendMessageToUser(user_id, msg, { parse_mode: "Markdown" });
      } else {
        throw new Error(result.error || "Swap failed");
      }
    } catch (error: any) {
      console.error("❌ Jupiter swap failed:", error);
      const payload = {
        method: "unsubscribeTokenTrade",
        keys: [mintAddress]
      };
      ws.send(JSON.stringify(payload));
    }

    processing = false;
  };

  const sell = async (position: Position): Promise<void> => {
    try {
      const startTime = Date.now();
      
      const currentUser = await User.findOne({ userId: user_id });
      if (!currentUser || !currentUser.sniper.is_snipping) {
        console.log(`🛑 User ${user_id} disabled sniper during sell, stopping...`);
        stopSniper(user_id);
        return;
      }

      const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
      if (!currentActiveWallet) {
        throw new Error("No active wallet found for user.");
      }

      const mint = new PublicKey(position.mint);
      const actualBalance = await getSPLBalance(connection, mint, new PublicKey(currentActiveWallet.publicKey));

      if (actualBalance === 0) {
        await User.updateOne(
          { userId: user_id, "wallets.publicKey": active_wallet.publicKey },
          { $pull: { "wallets.$.positions": { mint: position.mint } } }
        );
        return;
      }

      // Get token decimal for calculating token amount
      const { getTokenDecimal } = await import("../utils/getTokenInfo");
      const tokenDecimal = await getTokenDecimal(position.mint);
      const tokenAmount = actualBalance / (10 ** tokenDecimal); // Convert from raw amount to token amount

      const slippage = currentUser.sniper.slippage || 50; // Default slippage in basis points
      const fee = typeof currentUser.settings?.mev === 'number' ? currentUser.settings.mev : (currentUser.settings?.mev ? 0 : 0);

      // Use Jupiter swap for selling tokens (100% = sell all tokens)
      const result = await swapToken(
        user_id,
        currentActiveWallet.publicKey,
        position.mint,
        100, // 100% = sell all tokens
        "sell",
        slippage,
        fee,
        tokenAmount // Total token amount
      );

      if (result.success && result.signature) {
        const submitTime = Date.now();
        console.log(`Sell Transaction sent: ${position.mint} : https://solscan.io/tx/${result.signature}`);
        console.log(`Sell Transaction confirmed ${position.mint} : in ${Date.now() - submitTime}ms | Total: ${Date.now() - startTime}ms`);
        
        await User.updateOne(
          { userId: user_id, "wallets.publicKey": active_wallet.publicKey },
          { $pull: { "wallets.$.positions": { mint: position.mint } } }
        );
        
        const tokenUrl = `https://solscan.io/token/${position.mint}`;
        const msg = `✅ Successfully sold token: [${position.mint}](${tokenUrl})\nAmount: ${tokenAmount.toFixed(4)} tokens`;
        await sendMessageToUser(user_id, msg, { parse_mode: "Markdown" });
      } else {
        throw new Error(result.error || "Swap failed");
      }
    } catch (error: any) {
      const currentUser = await User.findOne({ userId: user_id });
      if (currentUser) {
        const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
        if (currentActiveWallet) {
          const balance = await getSPLBalance(connection, new PublicKey(position.mint), new PublicKey(currentActiveWallet.publicKey));
          if (balance == 0) {
            const payload = {
              method: "unsubscribeTokenTrade",
              keys: [position.mint]
            };
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(payload));
            }
            // Remove position if balance is 0
            await User.updateOne(
              { userId: user_id, "wallets.publicKey": active_wallet.publicKey },
              { $pull: { "wallets.$.positions": { mint: position.mint } } }
            );
          }
        }
      }
    }
  };

  // Token detection using AntService (PRIMARY METHOD)
  const antService = await initSharedAntService();
  // Note: We don't track processed tokens anymore - we want to detect ALL tokens that match filters
  // This allows us to detect tokens of any age, not just new ones
  
  // Process tokens from AntService periodically (every 15 seconds)
  const processDetectedTokensInterval = setInterval(async () => {
    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      stopSniper(user_id);
      return;
    }

    try {

      const currentSolPrice = await getSolPrice();
      const solFilters: any = {};
      
      const addFilter = (key: string, min: number | null | undefined, max: number | null | undefined) => {
        if (min != null && min !== undefined && !isNaN(min) && isFinite(min)) {
          if (!solFilters[key]) solFilters[key] = {};
          solFilters[key].min = min;
        }
        if (max != null && max !== undefined && !isNaN(max) && isFinite(max)) {
          if (!solFilters[key]) solFilters[key] = {};
          solFilters[key].max = max;
        }
      };
      
      // Get token status preference (migrated/on_bonding/both)
      const TOKEN_STATUS = currentUser.sniper.token_status || "both";
      
      // Age filter: AntService expects age in seconds, user input is in minutes
      addFilter('age', AGE_MIN ? AGE_MIN * 60 : null, AGE_MAX ? AGE_MAX * 60 : null);
      // Bonding curve: Only apply if user selected "on_bonding" or "both"
      // Migrated tokens don't have bonding curves (they've moved to pump swap only, not on bonding curve)
      if (TOKEN_STATUS === "on_bonding" || TOKEN_STATUS === "both") {
        // Bonding curve: AntService expects decimal (0.1 = 10%), user input is percentage (10 = 10%)
        addFilter('bonding_curve', BONDING_CURVE_MIN ? BONDING_CURVE_MIN / 100 : null, BONDING_CURVE_MAX ? BONDING_CURVE_MAX / 100 : null);
      }
      addFilter('holders', HOLDER_MIN, HOLDER_MAX);
      // Values are already in USD (converted from "K" format), no need to multiply by SOL price
      addFilter('liquidity', LIQ_MIN, LIQ_MAX);
      addFilter('market_cap', MC_MIN, MC_MAX);
      addFilter('volume_usd', VOLUME_MIN, VOLUME_MAX);
      addFilter('tnxs', TXNS_MIN ?? undefined, TXNS_MAX ?? undefined);
      addFilter('btnxs', NUM_BUYS_MIN ?? undefined, NUM_BUYS_MAX ?? undefined);
      addFilter('stnxs', NUM_SELLS_MIN ?? undefined, NUM_SELLS_MAX ?? undefined);
      addFilter('dev_hold_ratio', DEV_HOLDING_MIN ?? undefined, DEV_HOLDING_MAX ?? undefined);
      
      const filterOverrides = Object.keys(solFilters).length > 0 ? { sol: solFilters } : {};
      

      // Fetch tokens from AntService based on token_status selection
      // If user selected "migrated", only fetch migrated tokens
      // If user selected "on_bonding", only fetch new_pairs (bonding curve tokens)
      // If user selected "both", fetch both types
      let pulseList: any[] = [];
      
      if (TOKEN_STATUS === "migrated") {
        // Only fetch migrated tokens (moved to pump swap only)
        const migratedTokens = await antService.callPulse('migrated', filterOverrides).catch(() => []);
        // Mark as migrated
        pulseList = (migratedTokens || []).map((token: any) => ({ ...token, _isMigrated: true }));
      } else if (TOKEN_STATUS === "on_bonding") {
        const newPairs = await antService.callPulse('new_pairs', filterOverrides).catch(() => []);
        pulseList = (newPairs || []).map((token: any) => ({ ...token, _isMigrated: false }));
      } else {
        pulseList = await antService.pulseAllTokens(filterOverrides);
      }

      if (!pulseList || pulseList.length === 0) {
        return;
      }

      const tokenDataList = pulseList
        .map((pulseItem: any) => {
          const isMigrated = pulseItem._isMigrated === true;
          const token = convertAntPulseToToken(pulseItem, isMigrated);
          if (!token) return null;
          return token;
        })
        .filter((token): token is TokenData => token !== null);

      if (tokenDataList.length === 0) {
        return;
      }

      // Additional filtering (client-side filtering for validation)
      // Convert filter values from user settings to match token data units
      const filterObj: FilterCriteria = {};
      
      const isValidFilterValue = (val: number | null | undefined): boolean => {
        return val != null && !isNaN(val) && isFinite(val) && val >= 0;
      };
      
      // Volume filter (values are already in USD, no conversion needed)
      if (VOLUME_MIN != null || VOLUME_MAX != null) {
        filterObj.volume = {};
        if (VOLUME_MIN != null && isValidFilterValue(VOLUME_MIN)) filterObj.volume!.min = VOLUME_MIN;
        if (VOLUME_MAX != null && isValidFilterValue(VOLUME_MAX)) filterObj.volume!.max = VOLUME_MAX;
      }
      
      // Age filter (in seconds, user input is in minutes)
      if (AGE_MIN != null || AGE_MAX != null) {
        filterObj.age = {};
        if (AGE_MIN != null && isValidFilterValue(AGE_MIN)) filterObj.age!.min = AGE_MIN * 60; // Convert minutes to seconds
        if (AGE_MAX != null && isValidFilterValue(AGE_MAX)) filterObj.age!.max = AGE_MAX * 60; // Convert minutes to seconds
      }
      
      // Holders filter
      if (HOLDER_MIN != null || HOLDER_MAX != null) {
        filterObj.holders = {};
        if (HOLDER_MIN != null && isValidFilterValue(HOLDER_MIN)) filterObj.holders!.min = HOLDER_MIN;
        if (HOLDER_MAX != null && isValidFilterValue(HOLDER_MAX)) filterObj.holders!.max = HOLDER_MAX;
      }
      
      // Liquidity filter (values are already in USD, no conversion needed)
      // NOTE: This filter only applies to migrated tokens (pump swap only)
      // Pump.fun tokens don't require liquidity (they're on bonding curve)
      // The filterTokens function will skip liquidity filtering for pump.fun tokens
      if (LIQ_MIN != null || LIQ_MAX != null) {
        filterObj.liquidity = {};
        if (LIQ_MIN != null && isValidFilterValue(LIQ_MIN)) filterObj.liquidity!.min = LIQ_MIN;
        if (LIQ_MAX != null && isValidFilterValue(LIQ_MAX)) filterObj.liquidity!.max = LIQ_MAX;
      }
      
      // Market Cap filter (values are already in USD, no conversion needed)
      // NOTE: Market cap differs between pump.fun and migrated tokens:
      // - Pump.fun: MC from bonding curve (theoretical, e.g., 2k)
      // - Migrated: After migration, tokens move to pump swap only. MC is from pump swap pool (actual, e.g., 20k) - higher due to real liquidity
      // Both types use the same filter, but migrated tokens will have higher MC
      if (MC_MIN != null || MC_MAX != null) {
        filterObj.marketCap = {};
        if (MC_MIN != null && isValidFilterValue(MC_MIN)) filterObj.marketCap!.min = MC_MIN;
        if (MC_MAX != null && isValidFilterValue(MC_MAX)) filterObj.marketCap!.max = MC_MAX;
      }
      
      // Bonding Curve filter (percentage)
      if (BONDING_CURVE_MIN != null || BONDING_CURVE_MAX != null) {
        filterObj.bondingCurve = {};
        if (BONDING_CURVE_MIN != null && isValidFilterValue(BONDING_CURVE_MIN)) filterObj.bondingCurve!.min = BONDING_CURVE_MIN;
        if (BONDING_CURVE_MAX != null && isValidFilterValue(BONDING_CURVE_MAX)) filterObj.bondingCurve!.max = BONDING_CURVE_MAX;
      }
      
      // Number of Buys filter
      if (NUM_BUYS_MIN != null || NUM_BUYS_MAX != null) {
        filterObj.numBuys = {};
        if (NUM_BUYS_MIN != null && isValidFilterValue(NUM_BUYS_MIN)) filterObj.numBuys!.min = NUM_BUYS_MIN;
        if (NUM_BUYS_MAX != null && isValidFilterValue(NUM_BUYS_MAX)) filterObj.numBuys!.max = NUM_BUYS_MAX;
      }
      
      // TXNS filter (total transactions = numBuys + numSells)
      if (TXNS_MIN != null || TXNS_MAX != null) {
        filterObj.totalTxns = {};
        if (TXNS_MIN != null && isValidFilterValue(TXNS_MIN)) filterObj.totalTxns!.min = TXNS_MIN;
        if (TXNS_MAX != null && isValidFilterValue(TXNS_MAX)) filterObj.totalTxns!.max = TXNS_MAX;
      }
      
      // Number of Sells filter
      if (NUM_SELLS_MIN != null || NUM_SELLS_MAX != null) {
        filterObj.numSells = {};
        if (NUM_SELLS_MIN != null && isValidFilterValue(NUM_SELLS_MIN)) filterObj.numSells!.min = NUM_SELLS_MIN;
        if (NUM_SELLS_MAX != null && isValidFilterValue(NUM_SELLS_MAX)) filterObj.numSells!.max = NUM_SELLS_MAX;
      }
      
      const hasFilters = Object.keys(filterObj).length > 0;
      const filteredTokens = hasFilters ? filterTokens(tokenDataList, filterObj) : tokenDataList;

      if (hasFilters) {
        console.log(`[${new Date().toLocaleString()}] ✅ ${filteredTokens.length} tokens match filter criteria (out of ${tokenDataList.length} total)`);
        
        // Show all tokens that passed the filters
        if (filteredTokens.length > 0) {
          console.log(`[${new Date().toLocaleString()}] 📋 All detected tokens that passed filters:`);
          filteredTokens.forEach((token, index) => {
            const ageSeconds = token.createdAt != null && token.createdAt > 0 ? (Date.now() - token.createdAt) / 1000 : null;
            const ageDisplay = ageSeconds !== null ? `${ageSeconds.toFixed(1)}s (${(ageSeconds / 60).toFixed(1)}min)` : 'unknown (age not available)';
            console.log(`[${new Date().toLocaleString()}]   Token ${index + 1}/${filteredTokens.length}:`, {
              address: token.tokenAddress,
              name: token.name || 'N/A',
              symbol: token.symbol || 'N/A',
              status: token.isMigrated ? '🔄 Migrated (Pump Swap Only)' : '🆕 Pump.fun (Bonding Curve)',
              marketCap: `$${token.marketCap.toFixed(2)} ${token.isMigrated ? '(Pump swap pool MC)' : '(Bonding curve MC)'}`,
              liquidity: `$${token.liquidity.toFixed(2)} ${token.isMigrated ? '(Required)' : '(Not required)'}`,
              volume24h: `$${token.volume24h.toFixed(2)}`,
              holders: token.holders,
              bondingCurve: `${token.bondingCurve.toFixed(2)}%`,
              age: ageDisplay,
              numBuys: token.numBuys,
              numSells: token.numSells,
              totalTxns: (token.numBuys || 0) + (token.numSells || 0),
              twitter: token.twitter ? '✅' : '❌',
              telegram: token.telegram ? '✅' : '❌',
              website: token.website ? '✅' : '❌'
            });
          });
        }
        
        if (filteredTokens.length === 0 && tokenDataList.length > 0) {
          console.log(`[${new Date().toLocaleString()}] ⚠️ All ${tokenDataList.length} tokens were filtered out. Check your filter settings.`);
          // Debug: Show why tokens are being filtered out - show ALL tokens, not just sample
          console.log(`[${new Date().toLocaleString()}] 🔍 All tokens that were filtered out:`);
          tokenDataList.forEach((token, index) => {
            const ageSeconds = token.createdAt != null && token.createdAt > 0 ? (Date.now() - token.createdAt) / 1000 : null;
            const ageDisplay = ageSeconds !== null ? `${ageSeconds.toFixed(1)}s (${(ageSeconds / 60).toFixed(1)}min)` : 'unknown (age not available)';
            const reasons: string[] = [];
            
            if (filterObj.marketCap) {
              if (filterObj.marketCap.min != null && token.marketCap < filterObj.marketCap.min) {
                reasons.push(`MarketCap $${token.marketCap.toFixed(2)} < min $${filterObj.marketCap.min}`);
              }
              if (filterObj.marketCap.max != null && token.marketCap > filterObj.marketCap.max) {
                reasons.push(`MarketCap $${token.marketCap.toFixed(2)} > max $${filterObj.marketCap.max}`);
              }
            }
            if (filterObj.liquidity) {
              if (filterObj.liquidity.min != null && token.liquidity < filterObj.liquidity.min) {
                reasons.push(`Liquidity $${token.liquidity.toFixed(2)} < min $${filterObj.liquidity.min}`);
              }
              if (filterObj.liquidity.max != null && token.liquidity > filterObj.liquidity.max) {
                reasons.push(`Liquidity $${token.liquidity.toFixed(2)} > max $${filterObj.liquidity.max}`);
              }
            }
            if (filterObj.volume) {
              const volume = token.volume24h || token.volume || 0;
              if (filterObj.volume.min != null && volume < filterObj.volume.min) {
                reasons.push(`Volume $${volume.toFixed(2)} < min $${filterObj.volume.min}`);
              }
              if (filterObj.volume.max != null && volume > filterObj.volume.max) {
                reasons.push(`Volume $${volume.toFixed(2)} > max $${filterObj.volume.max}`);
              }
            }
            if (filterObj.age) {
              if (token.createdAt != null && token.createdAt > 0) {
                const age = (Date.now() - token.createdAt) / 1000;
                if (age >= 0 && age < 31536000) { // Valid age range (0 to 1 year)
                  if (filterObj.age.min != null && age < filterObj.age.min) {
                    reasons.push(`Age ${age.toFixed(1)}s < min ${filterObj.age.min}s`);
                  }
                  if (filterObj.age.max != null && age > filterObj.age.max) {
                    reasons.push(`Age ${age.toFixed(1)}s > max ${filterObj.age.max}s`);
                  }
                }
              } else if (filterObj.age.min != null) {
                reasons.push(`Age unknown (no timestamp data) - min age ${filterObj.age.min}s required`);
              }
            }
            if (filterObj.bondingCurve) {
              if (filterObj.bondingCurve.min != null && token.bondingCurve < filterObj.bondingCurve.min) {
                reasons.push(`BondingCurve ${token.bondingCurve.toFixed(2)}% < min ${filterObj.bondingCurve.min}%`);
              }
              if (filterObj.bondingCurve.max != null && token.bondingCurve > filterObj.bondingCurve.max) {
                reasons.push(`BondingCurve ${token.bondingCurve.toFixed(2)}% > max ${filterObj.bondingCurve.max}%`);
              }
            }
            if (filterObj.holders) {
              if (filterObj.holders.min != null && token.holders < filterObj.holders.min) {
                reasons.push(`Holders ${token.holders} < min ${filterObj.holders.min}`);
              }
              if (filterObj.holders.max != null && token.holders > filterObj.holders.max) {
                reasons.push(`Holders ${token.holders} > max ${filterObj.holders.max}`);
              }
            }
            if (filterObj.totalTxns) {
              const totalTxns = (token.numBuys || 0) + (token.numSells || 0);
              if (filterObj.totalTxns.min != null && totalTxns < filterObj.totalTxns.min) {
                reasons.push(`TotalTxns ${totalTxns} < min ${filterObj.totalTxns.min}`);
              }
              if (filterObj.totalTxns.max != null && totalTxns > filterObj.totalTxns.max) {
                reasons.push(`TotalTxns ${totalTxns} > max ${filterObj.totalTxns.max}`);
              }
            }
            
            console.log(`[${new Date().toLocaleString()}]   Token ${index + 1}/${tokenDataList.length}:`, {
              address: token.tokenAddress,
              name: token.name || 'N/A',
              symbol: token.symbol || 'N/A',
              marketCap: `$${token.marketCap.toFixed(2)}`,
              liquidity: `$${token.liquidity.toFixed(2)}`,
              volume24h: `$${token.volume24h.toFixed(2)}`,
              holders: token.holders,
              bondingCurve: `${token.bondingCurve.toFixed(2)}%`,
              age: ageDisplay,
              numBuys: token.numBuys,
              numSells: token.numSells,
              totalTxns: (token.numBuys || 0) + (token.numSells || 0),
              rejectionReasons: reasons.length > 0 ? reasons.join(', ') : 'Unknown reason'
            });
          });
        }
      } else {
        console.log(`[${new Date().toLocaleString()}] ℹ️ No filters applied, using all ${tokenDataList.length} tokens`);
        // Show all tokens when no filters are applied
        if (tokenDataList.length > 0) {
          console.log(`[${new Date().toLocaleString()}] 📋 All detected tokens (no filters):`);
          tokenDataList.forEach((token, index) => {
            const ageSeconds = token.createdAt != null && token.createdAt > 0 ? (Date.now() - token.createdAt) / 1000 : null;
            const ageDisplay = ageSeconds !== null ? `${ageSeconds.toFixed(1)}s (${(ageSeconds / 60).toFixed(1)}min)` : 'unknown (age not available)';
            console.log(`[${new Date().toLocaleString()}]   Token ${index + 1}/${tokenDataList.length}:`, {
              address: token.tokenAddress,
              name: token.name || 'N/A',
              symbol: token.symbol || 'N/A',
              marketCap: `$${token.marketCap.toFixed(2)}`,
              liquidity: `$${token.liquidity.toFixed(2)}`,
              volume24h: `$${token.volume24h.toFixed(2)}`,
              holders: token.holders,
              bondingCurve: `${token.bondingCurve.toFixed(2)}%`,
              age: ageDisplay,
              numBuys: token.numBuys,
              numSells: token.numSells,
              totalTxns: (token.numBuys || 0) + (token.numSells || 0),
              twitter: token.twitter ? '✅' : '❌',
              telegram: token.telegram ? '✅' : '❌',
              website: token.website ? '✅' : '❌'
            });
          });
        }
      }

      const data = filteredTokens;

      const freshUser = await User.findOne({ userId: user_id });
      if (!freshUser || !freshUser.sniper.is_snipping) {
        stopSniper(user_id);
        return;
      }

      // If detected tokens that passed filters are less than 5, save only those filtered tokens
      // Otherwise, combine with existing tokenlist and keep last 5
      if (data.length > 0 && data.length < 5) {
        // Save only the filtered tokens that passed all criteria (e.g., 3 tokens)
        const filteredAddresses = data.map(t => t?.tokenAddress).filter(Boolean) as string[];
        freshUser.sniper.tokenlist = filteredAddresses;
      } else if (data.length >= 5) {
        const filteredAddresses = data.map(t => t?.tokenAddress).filter(Boolean) as string[];
        freshUser.sniper.tokenlist = filteredAddresses.slice(-5);
      } else {
        const existingTokenlist = freshUser.sniper.tokenlist || [];
        const allDetectedAddresses = tokenDataList.map(t => t?.tokenAddress).filter(Boolean) as string[];
        const combinedTokenlist = [...new Set([...existingTokenlist, ...allDetectedAddresses])].slice(-5);
        freshUser.sniper.tokenlist = combinedTokenlist;
      }
      
      freshUser.markModified('sniper.tokenlist');
      
      try {
        await freshUser.save();
      } catch (saveError) {
        console.error(`[${new Date().toLocaleString()}] ❌ Error saving tokenlist:`, saveError);
      }
      
      // Note: We no longer track processedTokens - we want to detect ALL tokens that match filters
      // This allows detection of tokens of any age, not just new ones
      
      if (data.length > 0) {
        const token = data[data.length - 1];
        
        const freshActiveWallet = freshUser.wallets.find(w => w.is_active_wallet);
        const currentBuyCnt = freshActiveWallet?.positions?.length || 0;
        
        if (currentBuyCnt >= BUY_LIMIT) {
          console.log(`⚠️ Buy limit reached (${currentBuyCnt}/${BUY_LIMIT})`);
          return;
        }
        
        if (freshUser.sniper.allowAutoBuy == true) {
          if (!freshActiveWallet) return;
          const walletPubKeyStr = typeof freshActiveWallet.publicKey === 'string' 
            ? freshActiveWallet.publicKey 
            : (freshActiveWallet.publicKey as any).toString();
          const freshBalance = await getBalance(walletPubKeyStr);
          if (freshBalance / LAMPORTS_PER_SOL > BUY_AMOUNT) {
            buy(token.tokenAddress);
          } else {
            console.log("Not enough Balance");
            await sendMessageToUser(user_id, `⚠️ Insufficient SOL balance to buy tokens. Current balance: ${(freshBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL`, { parse_mode: "Markdown" });
            return;
          }
        }
      }
    } catch (error: any) {
      console.error(`[${new Date().toLocaleString()}] ❌ Token processing error for user ${user_id}:`, error);
      console.error('Error stack:', error.stack);
    }
  }, 15000);
  
  intervals.push(processDetectedTokensInterval);

  ws.on('open', async function open() {
    
    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      console.log(`🛑 User ${user_id} disabled sniper, closing WebSocket...`);
      stopSniper(user_id);
      return;
    }
    
    const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
    if (currentActiveWallet && currentActiveWallet.positions) {
      for (let index = 0; index < currentActiveWallet.positions.length; index++) {
        const position = currentActiveWallet.positions[index];
        const payload = {
          method: "subscribeTokenTrade",
          keys: [position.mint]
        };
        ws.send(JSON.stringify(payload));
      }
    }
    
    const positionCheckInterval = setInterval(async () => {
      const currentUser = await User.findOne({ userId: user_id });
      if (!currentUser || !currentUser.sniper.is_snipping) {
        stopSniper(user_id);
        return;
      }
      
      const currentActiveWallet = currentUser.wallets.find(w => w.is_active_wallet);
      if (!currentActiveWallet || !currentActiveWallet.positions) return;
      
      for (let index = 0; index < currentActiveWallet.positions.length; index++) {
        const position = currentActiveWallet.positions[index];
        const timestamp = (position as any).timestamp || (position as any).timeStamp || 0;
        if (ALLOW_AUTO_SELL && timestamp + 1000 * currentUser.sniper.time_limit * 60 < Date.now()) {
          if (currentUser.sniper.allowAutoSell) {
            sell({
              mint: position.mint,
              amount: (position as any).amount || 0,
              solAmount: (position as any).solAmount || 0,
              price: position.price,
              timestamp: timestamp,
              timeStamp: timestamp
            });
          }
        }
      }
    }, 5000);
    
    intervals.push(positionCheckInterval);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${user_id}:`, error);
  });

  ws.on('close', () => {
    console.log(`WebSocket closed for user ${user_id}`);
    stopSniper(user_id);
  });

  ws.on('message', async function message(data: WebSocket.Data) {
    try {
      const txData = JSON.parse(data.toString());
      if (txData && txData.mint) {
        if (txData.txType == "buy" || txData.txType == "sell") {
          const currentUser = await User.findOne({ userId: user_id });
          if (!currentUser || !currentUser.sniper.is_snipping) {
            stopSniper(user_id);
            return;
          }
          
          const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
          if (!currentActiveWallet) return;
          
          const position = currentActiveWallet.positions.find((pos: any) => pos.mint == txData.mint);
          if (position) {
            const price = txData.tokenAmount / txData.solAmount;
            const currentTakeProfit = Number(currentUser.sniper.take_profit) / 100;
            const currentStopLoss = Number(currentUser.sniper.stop_loss) / 100;
            if (price >= position.price * (1 + currentTakeProfit) || price <= position.price * (1 + currentStopLoss)) {
              if (currentUser.sniper.allowAutoSell) {
                sell({
                  mint: position.mint,
                  amount: (position as any).amount || 0,
                  solAmount: (position as any).solAmount || 0,
                  price: position.price,
                  timestamp: (position as any).timestamp || (position as any).timeStamp || 0,
                  timeStamp: (position as any).timestamp || (position as any).timeStamp || 0
                });
              }
            }
          }
          
          if (txData.txType == "buy") {
            const currentUser = await User.findOne({ userId: user_id });
            if (currentUser && currentUser.sniper.is_snipping) {
              const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
              if (currentActiveWallet && txData.traderPublicKey == currentActiveWallet.publicKey) {
                currentActiveWallet.positions.push({
                  amount: new BN(txData.tokenAmount),
                  solAmount: new BN(txData.solAmount),
                  mint: txData.mint,
                  price: txData.tokenAmount / txData.solAmount,
                  timeStamp: Date.now(),
                });
                await currentUser.save();
              }
            }
          }
          
          if (txData.txType == "sell") {
            const currentUser = await User.findOne({ userId: user_id });
            if (currentUser) {
              const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
              if (currentActiveWallet && txData.traderPublicKey == currentActiveWallet.publicKey) {
                const payload = {
                  method: "unsubscribeTokenTrade",
                  keys: [txData.mint]
                };
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify(payload));
                }
                currentActiveWallet.positions = (currentActiveWallet.positions as any[]).filter((e: any) => e.mint != txData.mint) as any;
                await currentUser.save();
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error processing WebSocket message:`, error);
    }
  });
}

