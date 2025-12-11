import WebSocket from 'ws';
import { VersionedTransaction, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionMessage, ComputeBudgetProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { PumpSdk, OnlinePumpSdk, getBuyTokenAmountFromSolAmount, getSellSolAmountFromTokenAmount } from "@pump-fun/pump-sdk"
import { User } from "../models/user";
import BN from "bn.js";
import fs from 'fs';
import dotenv from 'dotenv';
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array } from "../config/security";
console.log('Pump Sniper service starting...');
import AxiomService from './axiomService';
import PumpFunService from './pumpFunService';
import { sendMessageToUser } from "../bot"; // Import the sendMessageToUser function
import {
  getBalance,
  getSolanaPrice,
  getSolPrice,
  getTokenBalance,
  getTokenPriceInSOL,
  isValidPrivateKey,
  isValidSolanaAddress,
  setSolPrice,
  walletCreate,
  walletFromPrvKey,
} from "../services/solana";
import { map } from '@coral-xyz/borsh';
dotenv.config();

const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=8cdb777a-195a-4cfe-a1ec-d5a4f70ccfe1";
const connection = new Connection(
  RPC_ENDPOINT,
  'confirmed',
);

const onlineSdk = new OnlinePumpSdk(connection);

const offlineSdk = new PumpSdk();

// Sniper manager to track running instances
const activeSnipers = new Map(); // user_id -> { ws, intervals, axiom, cleanup }

// Shared AxiomService instance (optional fallback)
let sharedAxiomService = null;
let axiomRefreshInterval = null;

// Shared PumpFunService instance (no cookies required)
let sharedPumpFunService = null;

// Initialize shared PumpFunService (preferred - no cookies)
const initSharedPumpFunService = () => {
  if (!sharedPumpFunService) {
    sharedPumpFunService = new PumpFunService();
  }
  return sharedPumpFunService;
};

// Initialize shared AxiomService (fallback only)
const initSharedAxiomService = async () => {
  if (!sharedAxiomService) {
    sharedAxiomService = new AxiomService();
    await sharedAxiomService.refreshAccessToken();
    
    // Refresh token every 30 minutes (instead of on every pulse)
    if (!axiomRefreshInterval) {
      axiomRefreshInterval = setInterval(async () => {
        if (sharedAxiomService) {
          await sharedAxiomService.refreshAccessToken();
        }
      }, 30 * 60 * 1000); // 30 minutes
    }
  }
  return sharedAxiomService;
};

// Helper function to get SPL token balance
const getSPLBalance = async (connection, mint, owner) => {
  try {
    const tokenAccount = getAssociatedTokenAddressSync(mint, owner);
    const accountInfo = await getAccount(connection, tokenAccount);
    return Number(accountInfo.amount);
  } catch (error) {
    return 0;
  }
};

// Cleanup function for a sniper instance
export function stopSniper(user_id) {
  const sniper = activeSnipers.get(user_id);
  if (sniper) {
    console.log(`🛑 Stopping sniper for user: ${user_id}`);
    
    // Close WebSocket
    if (sniper.ws && sniper.ws.readyState === WebSocket.OPEN) {
      sniper.ws.close();
    }
    
    // Clear intervals
    if (sniper.intervals) {
      sniper.intervals.forEach(interval => clearInterval(interval));
    }
    
    // Remove from active snipers
    activeSnipers.delete(user_id);
    console.log(`✅ Sniper stopped for user: ${user_id}`);
  }
}

export async function runSniper(user_id) {
  // Check if sniper is already running
  if (activeSnipers.has(user_id)) {
    console.log(`⏭️  Sniper already running for user: ${user_id}, skipping...`);
    return;
  }

  // Check if user wants sniper to run
  const user = await User.findOne({ userId: user_id });
  if (!user || !user.sniper.is_snipping) {
    console.log(`⏭️  User ${user_id} has sniper disabled, skipping...`);
    return;
  }

  console.log(`🚀 Starting sniper for user: ${user_id}`);

  const ws = new WebSocket('wss://pumpportal.fun/api/data');
  
  // Initialize cleanup tracking
  const intervals = [];
  const cleanup = () => {
    stopSniper(user_id);
  };

  // Store sniper instance
  activeSnipers.set(user_id, { ws, intervals, cleanup });

  if (!user) {
    stopSniper(user_id);
    throw "No User";
  }
  console.log('User found:', user.userId);

  const active_wallet = user.wallets.find(
    (wallet) => wallet.is_active_wallet,
  );

  const balance = await getBalance(new PublicKey(active_wallet.publicKey));

  const sol_price = await getSolPrice();

  const PRIORITY_FEE_IX = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 });
  const PRIORITY_FEE_IX2 = ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 });
  const BUY_LIMIT = 1 * Number(user.sniper.buy_limit);
  const BUY_AMOUNT = Number(user.sniper.buy_amount);
  const CHECK_SOCIAL = user.sniper.check_social;
  const CHECK_TWITTER_CHANNEL = user.sniper.check_twitter_channel;
  const slippage = user.sniper.slippage;
  const BONDING_CURVE_MIN = Number(user.sniper.bonding_curve_min);
  const BONDING_CURVE_MAX = Number(user.sniper.bonding_curve_max);
  const MC_MIN = Number(user.sniper.min_mc * 1000) / sol_price;
  const MC_MAX = Number(user.sniper.max_mc * 1000) / sol_price;
  const AGE_MIN = Number(user.sniper.min_token_age);
  console.log('AGE_MIN', AGE_MIN);
  const AGE_MAX = Number(user.sniper.max_token_age);
  const HOLDER_MIN = Number(user.sniper.min_holders);
  const HOLDER_MAX = Number(user.sniper.max_holders);
  const ALLOW_AUTO_SELL = user.sniper.allowAutoSell;
  const VOLUME_MIN = Number(user.sniper.volume_min * 1000) / sol_price;
  const VOLUME_MAX = Number(user.sniper.volume_max * 1000) / sol_price;
  const LIQ_MIN = Number(user.sniper.min_liq * 1000) / sol_price;
  const LIQ_MAX = Number(user.sniper.max_liq * 1000) / sol_price;
  const TXNS_MIN = user.sniper.TXNS_MIN ? Number(user.sniper.TXNS_MIN) : null;
  const TXNS_MAX = user.sniper.TXNS_MAX ? Number(user.sniper.TXNS_MAX) : null;
  const takeProfit = Number(user.sniper.take_profit) / 100;
  const stopLoss = Number(user.sniper.stop_loss) / 100;


  const CHECK_NAME = user.sniper.check_name === "true";
  const NUM_BUYS_MIN = user.sniper.NUM_BUYS_MIN ? Number(user.sniper.NUM_BUYS_MIN) : null;
  const NUM_BUYS_MAX = user.sniper.NUM_BUYS_MAX ? Number(user.sniper.NUM_BUYS_MAX) : null;
  const NUM_SELLS_MIN = user.sniper.NUM_SELLS_MIN ? Number(user.sniper.NUM_SELLS_MIN) : null;
  const NUM_SELLS_MAX = user.sniper.NUM_SELLS_MAX ? Number(user.sniper.NUM_SELLS_MAX) : null;
  const DEV_HOLDING_MIN = user.sniper.DEV_HOLDING_MIN ? Number(user.sniper.DEV_HOLDING_MIN) : null;
  const DEV_HOLDING_MAX = user.sniper.DEV_HOLDING_MAX ? Number(user.sniper.DEV_HOLDING_MAX) : null;


  const global = await onlineSdk.fetchGlobal();
  let processing = false;

  // let positions = user.sniper.positions;
  // try {
  //   positions = user.sniper.positions || [];
  // } catch (error) {

  //   console.error("Failed to read positions from file:", error);
  // }
  let buyCnt = active_wallet?.positions?.length || 0;
  const buy = async (mintAddress) => {
    console.log('------------------------------ Start buy ------------------------------');
    console.log('mintAddress', mintAddress);

    // Check if sniper should still run
    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      console.log(`🛑 User ${user_id} disabled sniper during buy, stopping...`);
      stopSniper(user_id);
      return;
    }

    // get encrypted secret from user wallets (make sure your decrypt function takes a key not hardcoded "password")
    const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
    if (!currentActiveWallet) {
      throw new Error("No active wallet found for user.");
    }
    
    const encrypted = currentActiveWallet.secretKey;
    if (!encrypted) throw new Error("No active wallet secret found for user.");

    const privateKeyBase64 = decryptSecretKey(encrypted, "password");
    if (!privateKeyBase64) {
      throw new Error("Failed to decrypt private key. Check password/secret.");
    }

    const secretKeyBytes = bs58.decode(privateKeyBase64);
    if (!(secretKeyBytes instanceof Uint8Array) || secretKeyBytes.length < 32) {
      throw new Error("Invalid private key bytes after decrypting.");
    }

    const signerKeyPair = Keypair.fromSecretKey(secretKeyBytes);

    const accountUser = signerKeyPair.publicKey;
    const currentBalance = await getBalance(new PublicKey(accountUser));
    console.log('Current SOL balance:', currentBalance / LAMPORTS_PER_SOL);

    const currentBuyCnt = currentActiveWallet?.positions?.length || 0;
    const currentBuyLimit = Number(currentUser.sniper.buy_limit);
    if (processing || currentBuyCnt >= currentBuyLimit) return;
    const startTime = Date.now();
    processing = true;
    try {
      const payload = {
        method: "subscribeTokenTrade",
        keys: [mintAddress] // array of token CAs to watch
      }
      ws.send(JSON.stringify(payload));
      const mint = new PublicKey(mintAddress);

      const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } = await onlineSdk.fetchBuyState(mint, accountUser);
      const currentBuyAmount = Number(currentUser.sniper.buy_amount);
      const solAmount = new BN(currentBuyAmount * LAMPORTS_PER_SOL); // Amount of SOL to spend
      console.log('bondingCurve', bondingCurve);
      // console,log('associatedUserAccountInfo', associatedUserAccountInfo);
      // console.log('bondingCurveAccountInfo', bondingCurveAccountInfo);
      // console.log('global', global);
      console.log('solAmount', solAmount);

      // Get the latest blockhash
      const blockhash = await connection.getLatestBlockhash("finalized");
      // console.log("blockhash", blockhash);

      // Calculate token amount from SOL amount
      const tokenAmount = getBuyTokenAmountFromSolAmount({
        global,
        feeConfig: global.feeConfig,
        mintSupply: bondingCurve.mintSupply,
        bondingCurve,
        amount: solAmount
      });
      console.log('Token amount calculated:', tokenAmount.toString());

      console.log("mint", mint.toBase58());
      console.log("accountUser", accountUser.toBase58());
      if (!associatedUserAccountInfo) {
        console.log("Associated user account missing, creating a new ATA...");
        // optionally, create associated token account here
      }


      const currentSlippage = currentUser.sniper.slippage;
      const instructions = await offlineSdk.buyInstructions({
        global,
        bondingCurveAccountInfo,
        bondingCurve,
        associatedUserAccountInfo,
        mint,
        user: accountUser,
        solAmount,
        amount: tokenAmount,
        slippage: currentSlippage
      });
      console.log('buying token', mintAddress);
      const message = new TransactionMessage({
        payerKey: signerKeyPair.publicKey,
        instructions: [PRIORITY_FEE_IX, PRIORITY_FEE_IX2, ...instructions],
        recentBlockhash: blockhash.blockhash,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(message);
      transaction.sign([signerKeyPair]);
      const prepareTime = Date.now();
      const signature = await connection.sendTransaction(transaction);
      const submitTime = Date.now();
      console.log(`Buy Transaction sent: ${mintAddress} : https://solscan.io/tx/${signature}`);
      await connection.confirmTransaction({ signature, ...blockhash }, 'confirmed');
      console.log(`Buy Transaction confirmed: ${mintAddress} : in ${Date.now() - submitTime}ms | Total: ${Date.now() - startTime}ms | Preparation: ${prepareTime - startTime}ms`);
      // active_wallet.positions.push({
      //   amount: tokenAmount,
      //   solAmount: solAmount,
      //   mint: mintAddress,
      //   price: tokenAmount / solAmount,
      //   timeStamp: Date.now(),
      // });
      const tokenUrl = `https://solscan.io/token/${mintAddress}`;
      const msg = `✅ Successfully bought token: [${mintAddress}](${tokenUrl})\nAmount: ${currentBuyAmount} SOL`;
      await sendMessageToUser(user_id, msg, { parse_mode: "Markdown" });
      console.log('------------------------------ End buy ------------------------------');
    } catch (error) {
      console.log('buy failed ', mintAddress);
      console.error("❌ buyInstructions failed:", error);
      const payload = {
        method: "unsubscribeTokenTrade",
        keys: [mintAddress] // array of token CAs to watch
      }
      ws.send(JSON.stringify(payload));
    }

    processing = false;
  }

  const sell = async (position) => {
    try {
      console.log('------------------------------ Start sell ------------------------------');
      const startTime = Date.now();
      
      // Check if sniper should still run
      const currentUser = await User.findOne({ userId: user_id });
      if (!currentUser || !currentUser.sniper.is_snipping) {
        console.log(`🛑 User ${user_id} disabled sniper during sell, stopping...`);
        stopSniper(user_id);
        return;
      }

      // get encrypted secret from user wallets (make sure your decrypt function takes a key not hardcoded "password")
      const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
      if (!currentActiveWallet) {
        throw new Error("No active wallet found for user.");
      }
      
      const encrypted = currentActiveWallet.secretKey;
      if (!encrypted) throw new Error("No active wallet secret found for user.");

      const privateKeyBase64 = decryptSecretKey(encrypted, "password");
      if (!privateKeyBase64) {
        throw new Error("Failed to decrypt private key. Check password/secret.");
      }

      const secretKeyBytes = bs58.decode(privateKeyBase64);
      if (!(secretKeyBytes instanceof Uint8Array) || secretKeyBytes.length < 32) {
        throw new Error("Invalid private key bytes after decrypting.");
      }

      const signerKeyPair = Keypair.fromSecretKey(secretKeyBytes);

      const accountUser = signerKeyPair.publicKey;

      const mint = new PublicKey(position.mint);

      // Get the actual token balance to sell ALL tokens
      const actualBalance = await getSPLBalance(connection, mint, signerKeyPair.publicKey);
      console.log('Actual token balance:', actualBalance);

      const amount = new BN(actualBalance); // Sell ALL tokens
      const { bondingCurveAccountInfo, bondingCurve } = await onlineSdk.fetchSellState(mint, accountUser);

      const blockhash = await connection.getLatestBlockhash("finalized");

      const solAmount = getSellSolAmountFromTokenAmount({
        global,
        feeConfig: global.feeConfig,
        mintSupply: bondingCurve.mintSupply,
        bondingCurve,
        amount
      });
      const slippage = 10;

      const instructions = await offlineSdk.sellInstructions({
        global,
        bondingCurveAccountInfo,
        bondingCurve,
        mint,
        user: accountUser,
        amount,
        solAmount,
        slippage
      })
      const message = new TransactionMessage({
        payerKey: signerKeyPair.publicKey,
        instructions: [PRIORITY_FEE_IX, PRIORITY_FEE_IX2, ...instructions],
        recentBlockhash: blockhash.blockhash,
      }).compileToV0Message();
      const transaction = new VersionedTransaction(message);
      transaction.sign([signerKeyPair]);
      const prepareTime = Date.now();
      const signature = await connection.sendTransaction(transaction);
      const submitTime = Date.now();
      console.log(`Sell Transaction sent: ${position.mint} : https://solscan.io/tx/${signature}`);
      await connection.confirmTransaction({ signature, ...blockhash }, 'confirmed');
      console.log(`Sell Transaction confirmed ${position.mint} : in ${Date.now() - submitTime}ms | Total: ${Date.now() - startTime}ms | Preparation: ${prepareTime - startTime}ms`);
      await User.updateOne(
        { userId: user_id, "wallets.publicKey": active_wallet.publicKey },
        { $pull: { "wallets.$.positions": { mint: mint } } }
      );
      const tokenUrl = `https://solscan.io/token/${position.mint}`;
      const msg = `✅ Successfully sold token: [${position.mint}](${tokenUrl})\nAmount: ${position.amount}`;
      await sendMessageToUser(user_id, msg, { parse_mode: "Markdown" });
      console.log('------------------------------ End sell ------------------------------');
    } catch (error) {
      console.log('sell failed ', position.mint, error);
      const currentUser = await User.findOne({ userId: user_id });
      if (currentUser) {
        const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
        if (currentActiveWallet) {
          const balance = await getSPLBalance(connection, new PublicKey(position.mint), new PublicKey(currentActiveWallet.publicKey));
          if (balance == 0) {
            const payload = {
              method: "unsubscribeTokenTrade",
              keys: [position.mint] // array of token CAs to watch
            }
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(payload));
            }
            // positions = currentActiveWallet?.positions.filter(e => e.mint != position.mint);
            // fs.writeFileSync('positions.json', JSON.stringify(positions, null, 2));
          }
        }
      }
    }
  }

  // Token detection using WebSocket events (no cookies required)
  const pumpFunService = initSharedPumpFunService();
  const detectedTokens = new Map(); // tokenAddress -> { data, timestamp }
  const TOKEN_BUFFER_TIME = 10000; // Wait 10 seconds after token creation to fetch details
  
  // Process detected tokens periodically
  const processDetectedTokensInterval = setInterval(async () => {
    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      stopSniper(user_id);
      return;
    }

    try {
      const now = Date.now();
      const tokensToProcess = [];

      // Collect tokens that are ready to process (older than buffer time)
      for (const [tokenAddress, tokenInfo] of detectedTokens.entries()) {
        if (now - tokenInfo.timestamp >= TOKEN_BUFFER_TIME) {
          tokensToProcess.push(tokenAddress);
        }
      }

      if (tokensToProcess.length === 0) {
        return;
      }

      console.log(`[${new Date().toLocaleString()}] 🔍 Processing ${tokensToProcess.length} detected tokens:`, tokensToProcess);

      // Fetch token details from pump.fun API
      const tokenDataList = await pumpFunService.getTokensData(tokensToProcess);
      console.log(`[${new Date().toLocaleString()}] 📊 Fetched ${tokenDataList.length} token details from API`);
      
      // Log token data for debugging
      if (tokenDataList.length > 0) {
        tokenDataList.forEach((token, idx) => {
          console.log(`[${new Date().toLocaleString()}] 📋 Token ${idx + 1}: ${token.tokenAddress}`);
          console.log(`  - Name: ${token.name || 'N/A'}, Symbol: ${token.symbol || 'N/A'}`);
          console.log(`  - MarketCap: ${token.marketCap || 0}, Liquidity: ${token.liquidity || 0}`);
          console.log(`  - Holders: ${token.holders || 0}, Volume24h: ${token.volume24h || 0}`);
          console.log(`  - BondingCurve: ${token.bondingCurve || 0}%, Age: ${token.createdAt ? Math.floor((Date.now() - token.createdAt) / 1000) : 'N/A'}s`);
          console.log(`  - Social: Twitter=${!!token.twitter}, Telegram=${!!token.telegram}, Website=${!!token.website}`);
        });
      }

      if (tokenDataList.length === 0) {
        console.log(`[${new Date().toLocaleString()}] ⚠️ No token data retrieved from API for tokens:`, tokensToProcess);
        console.log(`[${new Date().toLocaleString()}] 💡 This might mean the tokens are too new or the API is unavailable`);
        // Still save the token addresses even if API failed
        const freshUser = await User.findOne({ userId: user_id });
        if (freshUser && freshUser.sniper.is_snipping) {
          const existingTokenlist = freshUser.sniper.tokenlist || [];
          const combinedTokenlist = [...new Set([...existingTokenlist, ...tokensToProcess])].slice(-5);
          freshUser.sniper.tokenlist = combinedTokenlist;
          await freshUser.save();
          console.log(`[${new Date().toLocaleString()}] 💾 Saved ${combinedTokenlist.length} token addresses to database (without API data)`);
        }
        // Remove processed tokens
        for (const tokenAddress of tokensToProcess) {
          detectedTokens.delete(tokenAddress);
        }
        return;
      }

      // Filter tokens based on user criteria (make social filters optional for new tokens)
      const filteredTokens = pumpFunService.filterTokens(tokenDataList, {
        volume: { min: VOLUME_MIN, max: VOLUME_MAX },
        age: { min: AGE_MIN, max: AGE_MAX },
        holders: { min: HOLDER_MIN, max: HOLDER_MAX },
        liquidity: { min: LIQ_MIN, max: LIQ_MAX },
        marketCap: { min: MC_MIN, max: MC_MAX },
        bondingCurve: { min: BONDING_CURVE_MIN, max: BONDING_CURVE_MAX },
        numBuys: { min: 0, max: NUM_BUYS_MAX },
        twitter: { min: null, max: 1 },
        // Make social filters optional - new tokens might not have social links yet
        telegram: false, // Changed to false - don't require telegram
        atLeastOneSocial: false, // Changed to false - don't require social links
      });

      console.log(`[${new Date().toLocaleString()}] ✅ Filtered ${filteredTokens.length} tokens matching criteria (out of ${tokenDataList.length} total)`);
      
      // Log why tokens were filtered out (for debugging)
      if (filteredTokens.length < tokenDataList.length) {
        const filteredOut = tokenDataList.filter(t => !filteredTokens.includes(t));
        console.log(`[${new Date().toLocaleString()}] ⚠️ ${filteredOut.length} tokens filtered out. Reasons:`);
        filteredOut.forEach(token => {
          const reasons = [];
          if (VOLUME_MIN && (token.volume24h || 0) < VOLUME_MIN) reasons.push(`volume < ${VOLUME_MIN}`);
          if (VOLUME_MAX && (token.volume24h || 0) > VOLUME_MAX) reasons.push(`volume > ${VOLUME_MAX}`);
          if (LIQ_MIN && (token.liquidity || 0) < LIQ_MIN) reasons.push(`liquidity < ${LIQ_MIN}`);
          if (LIQ_MAX && (token.liquidity || 0) > LIQ_MAX) reasons.push(`liquidity > ${LIQ_MAX}`);
          if (MC_MIN && (token.marketCap || 0) < MC_MIN) reasons.push(`marketCap < ${MC_MIN}`);
          if (MC_MAX && (token.marketCap || 0) > MC_MAX) reasons.push(`marketCap > ${MC_MAX}`);
          if (AGE_MIN && token.createdAt && (Date.now() - token.createdAt) / 1000 < AGE_MIN) reasons.push(`age < ${AGE_MIN}s`);
          if (AGE_MAX && token.createdAt && (Date.now() - token.createdAt) / 1000 > AGE_MAX) reasons.push(`age > ${AGE_MAX}s`);
          if (HOLDER_MIN && (token.holders || 0) < HOLDER_MIN) reasons.push(`holders < ${HOLDER_MIN}`);
          if (HOLDER_MAX && (token.holders || 0) > HOLDER_MAX) reasons.push(`holders > ${HOLDER_MAX}`);
          if (BONDING_CURVE_MIN && (token.bondingCurve || 0) < BONDING_CURVE_MIN) reasons.push(`bondingCurve < ${BONDING_CURVE_MIN}%`);
          if (BONDING_CURVE_MAX && (token.bondingCurve || 0) > BONDING_CURVE_MAX) reasons.push(`bondingCurve > ${BONDING_CURVE_MAX}%`);
          console.log(`  - ${token.tokenAddress}: ${reasons.join(', ') || 'unknown reason'}`);
        });
      }

      // Convert to Axiom-like format for compatibility
      const data = pumpFunService.toAxiomFormat(filteredTokens);

      // Refresh user data
      const freshUser = await User.findOne({ userId: user_id });
      if (!freshUser || !freshUser.sniper.is_snipping) {
        stopSniper(user_id);
        return;
      }

      // Update tokenlist with ALL detected tokens (even if they don't match filters)
      // This allows users to see what tokens were detected
      const existingTokenlist = freshUser.sniper.tokenlist || [];
      const allDetectedAddresses = tokenDataList.map(t => t.tokenAddress || t.address || t.id).filter(Boolean);
      const filteredAddresses = data.map(t => t.tokenAddress || t.address || t.id).filter(Boolean);
      
      // Combine existing and all detected tokens, remove duplicates, keep last 5
      const combinedTokenlist = [...new Set([...existingTokenlist, ...allDetectedAddresses])].slice(-5);
      
      freshUser.sniper.tokenlist = combinedTokenlist;
      await freshUser.save();
      
      console.log(`[${new Date().toLocaleString()}] 💾 Saved ${combinedTokenlist.length} tokens to database (${allDetectedAddresses.length} detected, ${filteredAddresses.length} match filters)`);
      
      // Only auto-buy tokens that match all filters
      if (data.length > 0) {
        const token = data[data.length - 1]; // Get last token
        console.log(`[${new Date().toLocaleString()}] ✅ Detected ${data.length} tokens matching criteria`);
        
        const freshActiveWallet = freshUser.wallets.find(w => w.is_active_wallet);
        const currentBuyCnt = freshActiveWallet?.positions?.length || 0;
        
        if (currentBuyCnt >= BUY_LIMIT) {
          console.log(`⚠️ Buy limit reached (${currentBuyCnt}/${BUY_LIMIT})`);
          return;
        }
        
        console.log('User.sniper function', freshUser.sniper.allowAutoBuy);
        if (freshUser.sniper.allowAutoBuy == true) {
          const freshBalance = await getBalance(new PublicKey(freshActiveWallet.publicKey));
          if (freshBalance / LAMPORTS_PER_SOL > BUY_AMOUNT) {
            buy(token.tokenAddress);
          } else {
            console.log("Not enough Balance");
            await sendMessageToUser(user_id, `⚠️ Insufficient SOL balance to buy tokens. Current balance: ${(freshBalance / LAMPORTS_PER_SOL).toFixed(2)} SOL`, { parse_mode: "Markdown" });
            return;
          }
        }

        const msg = `Detected ${data.length} tokens matching criteria: https://pump.fun/\n\n` + filteredAddresses.join('\n');
        console.log("token list", msg);
      } else {
        console.log(`[${new Date().toLocaleString()}] ℹ️ No tokens matched all filters, but ${allDetectedAddresses.length} tokens were detected and saved to list`);
      }

      // Remove processed tokens from buffer
      for (const tokenAddress of tokensToProcess) {
        detectedTokens.delete(tokenAddress);
      }
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] ❌ Token processing error for user ${user_id}:`, error);
      console.error('Error stack:', error.stack);
    }
  }, 15000); // Check every 15 seconds
  
  intervals.push(processDetectedTokensInterval);

  ws.on('open', async function open() {
    console.log(`WebSocket connection established for user: ${user_id}`);
    
    // Check if sniper should still run
    const currentUser = await User.findOne({ userId: user_id });
    if (!currentUser || !currentUser.sniper.is_snipping) {
      console.log(`🛑 User ${user_id} disabled sniper, closing WebSocket...`);
      stopSniper(user_id);
      return;
    }

    // Subscribing to trades made by accounts
    let payload = {
      method: "subscribeNewToken",
    }
    ws.send(JSON.stringify(payload));
    
    const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
    if (currentActiveWallet && currentActiveWallet.positions) {
      for (let index = 0; index < currentActiveWallet.positions.length; index++) {
        const position = currentActiveWallet.positions[index];

        payload = {
          method: "subscribeTokenTrade",
          keys: [position.mint] // array of token CAs to watch
        }
        ws.send(JSON.stringify(payload));
      }
    }
    const positionCheckInterval = setInterval(async () => {
      // Check if sniper should still run
      const currentUser = await User.findOne({ userId: user_id });
      if (!currentUser || !currentUser.sniper.is_snipping) {
        stopSniper(user_id);
        return;
      }
      
      const currentActiveWallet = currentUser.wallets.find(w => w.is_active_wallet);
      if (!currentActiveWallet || !currentActiveWallet.positions) return;
      
      for (let index = 0; index < currentActiveWallet.positions.length; index++) {
        const position = currentActiveWallet.positions[index];
        console.log('Re-subscribing to position:', position.mint);
        console.log(`Token Sell pending : ${currentUser.sniper.time_limit} min`, Date.now(), Number(position.timestamp) + 1000 * currentUser.sniper.time_limit * 60);
        if (ALLOW_AUTO_SELL && position.timestamp + 1000 * currentUser.sniper.time_limit * 60 < Date.now()) {
          console.log(`Position ${position.mint} is older than ${currentUser.sniper.time_limit} minutes, selling...`, position);
          if (currentUser.sniper.allowAutoSell) {
            sell(position);
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
    // Clean up when WebSocket closes
    stopSniper(user_id);
  });

  ws.on('message', async function message(data) {
    const txData = JSON.parse(data);
    if (txData && txData.mint) {
      if (txData.txType == "create") {
        // Store new token for processing (no cookies required!)
        detectedTokens.set(txData.mint, {
          data: txData,
          timestamp: Date.now(),
        });
        console.log(`[${new Date().toLocaleString()}] 🆕 New token detected: ${txData.mint}`);
        // if (!CHECK_NAME || txData.mint.endsWith("pump"))
        // buy(txData.mint);
      } else if (txData.txType == "buy" || txData.txType == "sell") {
        const currentUser = await User.findOne({ userId: user_id });
        if (!currentUser || !currentUser.sniper.is_snipping) {
          stopSniper(user_id);
          return;
        }
        
        const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
        if (!currentActiveWallet) return;
        
        const position = currentActiveWallet.positions.find((position) => position.mint == txData.mint);
        console.log('position', position);
        console.log(txData.txType, position?.price, txData.tokenAmount / txData.solAmount)
        if (position) {
          const price = txData.tokenAmount / txData.solAmount;
          const currentTakeProfit = Number(currentUser.sniper.take_profit) / 100;
          const currentStopLoss = Number(currentUser.sniper.stop_loss) / 100;
          if (price >= position.price * (1 + currentTakeProfit) || price <= position.price * (1 + currentStopLoss)) {
            console.log(`Selling position: ${txData.mint} at price ${price} | Original price: ${position.price}`);
            if (currentUser.sniper.allowAutoSell) {
              sell(position);
            }
          }
        }
        if (txData.txType == "buy") {
          const currentUser = await User.findOne({ userId: user_id });
          if (currentUser && currentUser.sniper.is_snipping) {
            const currentActiveWallet = currentUser.wallets.find((w) => w.is_active_wallet);
            if (currentActiveWallet && txData.traderPublicKey == currentActiveWallet.publicKey) {
              console.log(`Bought position: ${txData.mint} | https://pump.fun/coin/${txData.mint} | Price: ${txData.tokenAmount / txData.solAmount}`);
              currentActiveWallet.positions.push({
                amount: txData.tokenAmount,
                solAmount: txData.solAmount,
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
                keys: [txData.mint] // array of token CAs to watch
              }
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(payload));
              }
              currentActiveWallet.positions = currentActiveWallet.positions.filter(e => e.mint != txData.mint);
              await currentUser.save();
            }
          }
        }
      }
    }
  });
}