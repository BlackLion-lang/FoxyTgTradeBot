import axios from "axios";
import { ApiData } from "../models/apiData";
import cron from "node-cron"

// searchType Options: rank, volume, liquidity
async function fetchTrendingCoins() {
  const BIRDEYE_API_URL = `https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20&ui_amount_mode=scaled`;
  const apiKeys = [
    '859266a52862459a9df3aaf362ce6383',
    '347d0beecb7c452c82e2328d59fc3b19',
    'c5bd737bf5474f599973fae109d4fb4a',
    '60512e2ff0be4b1dba977797f337c6a2',
    'c8cb32cd25044da4a8842d1cc79d16d4',
    'b35f61f7b3eb449cace5c25712b6c14e',
    'e74edbb3f9ea488396727b7d0ff02a3d',
    '01fee4016e9d4f3fa38e4b90a26e6345'
  ];

  let response = null;
  let lastError = null;

  // Try each API key until one works
  for (const apiKey of apiKeys) {
    try {
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': apiKey
        },
        timeout: 10000 // 10 second timeout
      });

      // Check if response is successful and has valid data
      if (response && response.status === 200 && response.data) {
        // Check if API returned an error in the response body
        if (response.data.success === false) {
          console.warn(`Birdeye API error with key ${apiKey.substring(0, 8)}...: ${response.data.message || 'Unknown error'}`);
          lastError = new Error(response.data.message || 'API returned success: false');
          response = null;
          continue; // Try next API key
        }

        // Check if data structure is valid
        if (response.data.data && response.data.data.tokens && Array.isArray(response.data.data.tokens)) {
          console.log(`Successfully fetched trending coins using API key ${apiKey.substring(0, 8)}...`);
          break; // Success, exit loop
        } else {
          console.warn(`Invalid data structure from Birdeye API with key ${apiKey.substring(0, 8)}...`);
          response = null;
          continue;
        }
      }
    } catch (error: any) {
      lastError = error;
      // Handle specific error cases
      if (error.response) {
        const status = error.response.status;
        const errorMessage = error.response.data?.message || error.message;
        
        if (status === 400) {
          console.warn(`Birdeye API 400 error with key ${apiKey.substring(0, 8)}...: ${errorMessage}`);
        } else if (status === 429) {
          console.warn(`Birdeye API rate limit exceeded with key ${apiKey.substring(0, 8)}...`);
        } else {
          console.warn(`Birdeye API error (${status}) with key ${apiKey.substring(0, 8)}...: ${errorMessage}`);
        }
      } else if (error.code === 'ECONNABORTED') {
        console.warn(`Birdeye API timeout with key ${apiKey.substring(0, 8)}...`);
      } else {
        console.warn(`Birdeye API request failed with key ${apiKey.substring(0, 8)}...: ${error.message}`);
      }
      response = null;
      // Continue to next API key
    }
  }

  // If all API keys failed, log error and return early
  if (!response || !response.data || !response.data.data || !response.data.data.tokens) {
    console.error('Failed to fetch trending coins from Birdeye API with all API keys. Last error:', lastError?.message || 'Unknown error');
    return; // Exit gracefully without crashing
  }

  try {
    const fetchTrendingTokenData = response.data.data.tokens.map((token: any) => ({
      address: token.address,
      decimals: token.decimals,
      liquidity: token.liquidity,
      logoURI: token.logoURI,
      name: token.name,
      symbol: token.symbol,
      volume24hUSD: token.volume24hUSD,
      volume24hChangePercent: token.volume24hChangePercent,
      rank: token.rank,
      price: token.price,
      updatedAt: new Date(),
    }));

    if (fetchTrendingTokenData.length > 0) {
      await ApiData.deleteMany({});
      await ApiData.insertMany(fetchTrendingTokenData);
      console.log(`Successfully saved ${fetchTrendingTokenData.length} trending tokens to database.`);
    } else {
      console.warn('No trending tokens to save (empty array)');
    }
  } catch (dbError: any) {
    console.error('Error saving trending tokens to database:', dbError);
    // Don't throw - just log the error
  }
}

cron.schedule('*/20 * * * *', () => {
  console.log('Fetching trending coins every 20 minutes');
  fetchTrendingCoins();
});

export async function getTrendingTokens() {
  try {
    const tokens = await ApiData.find().sort({ rank: 1 }).limit(10);
    return tokens;
  } catch (error) {
    console.error('Error retrieving trending tokens from database:', error);
    return [];
  }
}