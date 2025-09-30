import axios from "axios";
import { ApiData } from "../models/apiData";
import cron from "node-cron"

// searchType Options: rank, volume, liquidity
async function fetchTrendingCoins() {
  try {
    const BIRDEYE_API_URL = `https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20&ui_amount_mode=scaled`;
    let response = null;
    response = await axios.get(BIRDEYE_API_URL, {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': '859266a52862459a9df3aaf362ce6383'
      }
    });
    // console.log("Token Fetch Data", response.data);

    if (response === null) {
      console.error('No response from Birdeye API with Api-key 859266a52862459a9df3aaf362ce6383');
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          method: 'GET',
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': '347d0beecb7c452c82e2328d59fc3b19'
        }
      });
    }

    if (response === null) {
      console.error('No response from Birdeye API with Api-key 347d0beecb7c452c82e2328d59fc3b19');
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          method: 'GET',
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': 'c5bd737bf5474f599973fae109d4fb4a'
        }
      });
    }

    if (response === null) {
      console.error('No response from Birdeye API with Api-key 347d0beecb7c452c82e2328d59fc3b19');
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          method: 'GET',
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': '60512e2ff0be4b1dba977797f337c6a2'
        }
      });
    }

    if (response === null) {
      console.error('No response from Birdeye API with Api-key 347d0beecb7c452c82e2328d59fc3b19');
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          method: 'GET',
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': 'c8cb32cd25044da4a8842d1cc79d16d4'
        }
      });
    }
    if (response === null) {
      console.error('No response from Birdeye API with Api-key 347d0beecb7c452c82e2328d59fc3b19');
      response = await axios.get(BIRDEYE_API_URL, {
        headers: {
          method: 'GET',
          accept: 'application/json',
          'x-chain': 'solana',
          'X-API-KEY': 'b35f61f7b3eb449cace5c25712b6c14e'
        }
      });
    }
    
    console.log("Final Token Fetch Data", response.data);
    if (response === null) {
      console.error('No response from Birdeye API with all Api-keys');
    }

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
    await ApiData.deleteMany({});
    await ApiData.insertMany(fetchTrendingTokenData);
    console.log("Trending tokens saved to database.");
  } catch (error) {
    console.error('Error fetching trending coins:', error);
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