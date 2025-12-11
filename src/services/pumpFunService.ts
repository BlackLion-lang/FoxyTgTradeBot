import axios from "axios";
import { getSolPrice } from "./solana";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

interface PumpFunToken {
  tokenAddress: string;
  name?: string;
  symbol?: string;
  description?: string;
  imageUri?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  marketCap?: number;
  liquidity?: number;
  volume24h?: number;
  holders?: number;
  bondingCurve?: number;
  createdAt?: number;
  numBuys?: number;
  numSells?: number;
}

export default class PumpFunService {
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 2000; // Minimum 2 seconds between requests
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTTL: number = 30000; // Cache for 30 seconds

  constructor() {
    console.log("🚀 PumpFunService initialized (no cookies required)");
  }

  // Get token data from pump.fun public API
  async getTokenData(tokenAddress: string): Promise<PumpFunToken | null> {
    try {
      // Check cache first
      const cached = this.cache.get(tokenAddress);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        return cached.data;
      }

      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minRequestInterval) {
        await new Promise((resolve) => 
          setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
        );
      }

      const response = await axios.get(
        `https://frontend-api-v3.pump.fun/coins/${tokenAddress}`,
        {
          headers: {
            'accept': 'application/json',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000,
        }
      );

      this.lastRequestTime = Date.now();

      if (!response.data) {
        return null;
      }

      const data = response.data;
      const solPrice = await getSolPrice();

      // Calculate liquidity
      const liquidity = data.virtual_sol_reserves 
        ? (data.virtual_sol_reserves * solPrice) / LAMPORTS_PER_SOL 
        : 0;

      // Calculate bonding curve percentage
      const realTokenReserves = data.virtual_token_reserves 
        ? (data.virtual_token_reserves / 10 ** 6) - 73000000 
        : 0;
      const bondingCurve = realTokenReserves > 0
        ? Math.max(0, Math.min(100, 100 - ((realTokenReserves - 206900000) * 100) / 793100000))
        : 0;

      const tokenData: PumpFunToken = {
        tokenAddress: data.mint || tokenAddress,
        name: data.name,
        symbol: data.symbol,
        description: data.description,
        imageUri: data.image_uri,
        twitter: data.twitter,
        telegram: data.telegram,
        website: data.website,
        marketCap: data.usd_market_cap || 0,
        liquidity: liquidity,
        volume24h: data.volume24h || 0,
        holders: data.holder_count || 0,
        bondingCurve: bondingCurve,
        createdAt: data.created_timestamp ? data.created_timestamp * 1000 : Date.now(),
        numBuys: data.buy_count || 0,
        numSells: data.sell_count || 0,
      };

      // Cache the result
      this.cache.set(tokenAddress, { data: tokenData, timestamp: Date.now() });

      return tokenData;
    } catch (error: any) {
      console.error(
        `[${new Date().toLocaleString()}] ❌ Error fetching token ${tokenAddress}:`,
        error.message
      );
      return null;
    }
  }

  // Get multiple tokens data
  async getTokensData(tokenAddresses: string[]): Promise<PumpFunToken[]> {
    const tokens: PumpFunToken[] = [];
    
    for (const address of tokenAddresses) {
      const tokenData = await this.getTokenData(address);
      if (tokenData) {
        tokens.push(tokenData);
      }
      // Small delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return tokens;
  }

  // Filter tokens based on criteria (similar to Axiom filters)
  filterTokens(
    tokens: PumpFunToken[],
    filters: {
      volume?: { min?: number; max?: number };
      age?: { min?: number; max?: number };
      holders?: { min?: number; max?: number };
      liquidity?: { min?: number; max?: number };
      marketCap?: { min?: number; max?: number };
      bondingCurve?: { min?: number; max?: number };
      numBuys?: { min?: number; max?: number };
      twitter?: { min?: number | null; max?: number | null };
      telegram?: boolean;
      atLeastOneSocial?: boolean;
    }
  ): PumpFunToken[] {
    return tokens.filter((token) => {
      // Volume filter
      if (filters.volume) {
        const volume = token.volume24h || 0;
        if (filters.volume.min !== undefined && volume < filters.volume.min) return false;
        if (filters.volume.max !== undefined && volume > filters.volume.max) return false;
      }

      // Age filter (in seconds)
      if (filters.age && token.createdAt) {
        const age = (Date.now() - token.createdAt) / 1000;
        if (filters.age.min !== undefined && age < filters.age.min) return false;
        if (filters.age.max !== undefined && age > filters.age.max) return false;
      }

      // Holders filter
      if (filters.holders) {
        const holders = token.holders || 0;
        if (filters.holders.min !== undefined && holders < filters.holders.min) return false;
        if (filters.holders.max !== undefined && holders > filters.holders.max) return false;
      }

      // Liquidity filter
      if (filters.liquidity) {
        const liquidity = token.liquidity || 0;
        if (filters.liquidity.min !== undefined && liquidity < filters.liquidity.min) return false;
        if (filters.liquidity.max !== undefined && liquidity > filters.liquidity.max) return false;
      }

      // Market cap filter
      if (filters.marketCap) {
        const marketCap = token.marketCap || 0;
        if (filters.marketCap.min !== undefined && marketCap < filters.marketCap.min) return false;
        if (filters.marketCap.max !== undefined && marketCap > filters.marketCap.max) return false;
      }

      // Bonding curve filter
      if (filters.bondingCurve) {
        const bondingCurve = token.bondingCurve || 0;
        if (filters.bondingCurve.min !== undefined && bondingCurve < filters.bondingCurve.min) return false;
        if (filters.bondingCurve.max !== undefined && bondingCurve > filters.bondingCurve.max) return false;
      }

      // Num buys filter
      if (filters.numBuys) {
        const numBuys = token.numBuys || 0;
        if (filters.numBuys.min !== undefined && numBuys < filters.numBuys.min) return false;
        if (filters.numBuys.max !== undefined && numBuys > filters.numBuys.max) return false;
      }

      // Twitter filter
      if (filters.twitter) {
        const hasTwitter = !!token.twitter;
        if (filters.twitter.max === 1 && !hasTwitter) return false;
        if (filters.twitter.min === 1 && !hasTwitter) return false;
      }

      // Telegram filter
      if (filters.telegram !== undefined) {
        const hasTelegram = !!token.telegram;
        if (filters.telegram && !hasTelegram) return false;
      }

      // At least one social filter
      if (filters.atLeastOneSocial) {
        if (!token.twitter && !token.telegram && !token.website) return false;
      }

      return true;
    });
  }

  // Convert PumpFunToken to Axiom-like format for compatibility
  toAxiomFormat(tokens: PumpFunToken[]): any[] {
    return tokens.map((token) => ({
      tokenAddress: token.tokenAddress,
      address: token.tokenAddress,
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      imageUri: token.imageUri,
      twitter: token.twitter,
      telegram: token.telegram,
      website: token.website,
      marketCap: token.marketCap,
      liquidity: token.liquidity,
      volume24h: token.volume24h,
      volume: token.volume24h,
      holders: token.holders,
      bondingCurve: token.bondingCurve,
      createdAt: token.createdAt,
      numBuys: token.numBuys,
      numSells: token.numSells,
    }));
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

