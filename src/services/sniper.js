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

import { get } from 'http';
import {
  getSolPrice,
} from "./solana";
import { map } from '@coral-xyz/borsh';
import { error } from 'console';
dotenv.config();

const RPC_ENDPOINT = "https://mainnet.helius-rpc.com/?api-key=8cdb777a-195a-4cfe-a1ec-d5a4f70ccfe1";
const connection = new Connection(
  RPC_ENDPOINT,
  'confirmed',
);

const onlineSdk = new OnlinePumpSdk(connection);

const offlineSdk = new PumpSdk();
// console.log("offlineSdk",offlineSdk)

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

export async function runSniper(user_id, onTokensDetected) {

  const ws = new WebSocket('wss://pumpportal.fun/api/data');

  const user = await User.findOne({ userId: user_id });
  if (!user) throw "No User";
  console.log('User found:', user.userId);

  const active_wallet = user.wallets.find(
    (wallet) => wallet.is_active_wallet,
  );

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
  let buyCnt = active_wallet?.positions?.length;
  const buy = async (mintAddress) => {
    console.log('------------------------------ Start buy ------------------------------');
    console.log('mintAddress', mintAddress);

    // get encrypted secret from user wallets (make sure your decrypt function takes a key not hardcoded "password")
    const encrypted = user.wallets.find((w) => w.is_active_wallet)?.secretKey;
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

    if (processing || buyCnt >= BUY_LIMIT) return;
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
      const solAmount = new BN(BUY_AMOUNT * LAMPORTS_PER_SOL); // Amount of SOL to spend
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


      const instructions = await offlineSdk.buyInstructions({
        global,
        bondingCurveAccountInfo,
        bondingCurve,
        associatedUserAccountInfo,
        mint,
        user: accountUser,
        solAmount,
        amount: tokenAmount,
        slippage
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
      active_wallet.positions.push({
        amount: tokenAmount,
        solAmount: solAmount,
        mint: mintAddress,
        price: tokenAmount / solAmount,
        timeStamp: Date.now(),
      });
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
      // const bondingCurvePda = offlineSdk.bondingCurvePda(position.mint);
      // const [bondingCurve, bondingCurveAccountInfo, blockhash] = await Promise.all([
      //     offlineSdk.fetchBondingCurve(position.mint),
      //     connection.getAccountInfo(bondingCurvePda),
      //     connection.getLatestBlockhash("finalized")
      // ]);

      // get encrypted secret from user wallets (make sure your decrypt function takes a key not hardcoded "password")
      const encrypted = user.wallets.find((w) => w.is_active_wallet)?.secretKey;
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
      console.log('------------------------------ End sell ------------------------------');
    } catch (error) {
      console.log('sell failed ', position.mint, error);
      const balance = await getSPLBalance(connection, new PublicKey(position.mint), active_wallet.publicKey);
      if (balance == 0) {
        const payload = {
          method: "unsubscribeTokenTrade",
          keys: [position.mint] // array of token CAs to watch
        }
        ws.send(JSON.stringify(payload));
        // buyCnt--;
        // positions = active_wallet?.positions.filter(e => e.mint != position.mint);
        // fs.writeFileSync('positions.json', JSON.stringify(positions, null, 2));
      }
    }
  }

  const initAxiomService = async () => {
    const axiom = new AxiomService();
    await axiom.refreshAccessToken();

    const TOKEN_WINDOW = 5 * 60 * 1000; // 5 minutes
    const MIN_BUYS_THRESHOLD = 5;       // threshold for active token
    const activity = new Map(); // JS automatically infers the type
    let previousTokens = [];


    setInterval(async () => {

      await axiom.pulse(
        {
          volume: { min: VOLUME_MIN, max: VOLUME_MAX },
          age: { min: AGE_MIN, max: AGE_MAX },
          holders: { min: HOLDER_MIN, max: HOLDER_MAX },
          liquidity: { min: LIQ_MIN, max: LIQ_MAX },
          marketCap: { min: MC_MIN, max: MC_MAX },
          txns: { min: TXNS_MIN, max: TXNS_MAX },
          // dexPaid: false,
          bondingCurve: { min: BONDING_CURVE_MIN, max: BONDING_CURVE_MAX },

          numBuys: { min: 0, max: NUM_BUYS_MAX },
          twitter: { min: null, max: 1 },
          // devHolding: { min: DEV_HOLDING_MIN, max: DEV_HOLDING_MAX },
        }).then(async (data) => {
          // console.log('axiom', data);


          if (data.length > 0) {

            const now = Date.now();

            const token = data.pop();
            console.log("data length", data.length);
            if (buyCnt >= BUY_LIMIT) return;
            if (user.sniper.allowAutoBuy) {
              buy(token.tokenAddress);
            }
            // console.log('axiom', token); // Uncommented for debugging

            const tokenlist = data.map(t => t.tokenAddress).slice(-5);
            user.sniper.tokenlist = tokenlist;
            await user.save();
            const msg = `Detected ${data.length} tokens matching criteria: https://pump.fun/\n\n` + tokenlist.join('\n');
            console.log("token list", msg);

          }
        }).catch(() => {
          // axiom.refreshAccessToken();
        });
    }, 10000);

  }
  initAxiomService();

  ws.on('open', function open() {

    console.log('WebSocket connection established');

    // Subscribing to trades made by accounts
    let payload = {
      method: "subscribeNewToken",
    }
    ws.send(JSON.stringify(payload));
    for (let index = 0; index < active_wallet.positions.length; index++) {
      const position = active_wallet.positions[index];

      payload = {
        method: "subscribeTokenTrade",
        keys: [position.mint] // array of token CAs to watch
      }
      ws.send(JSON.stringify(payload));
    }
    setInterval(() => {
      for (let index = 0; index < active_wallet.positions.length; index++) {
        const position = active_wallet.positions[index];
        console.log('Re-subscribing to position:', position.mint);
        console.log("datenow", Date.now(), Number(position.timestamp) + 1000 * user.sniper.time_limit * 60);
        if (ALLOW_AUTO_SELL && position.timestamp + 1000 * user.sniper.time_limit * 60 < Date.now()) {
          console.log(`Position ${position.mint} is older than ${user.sniper.time_limit} minutes, selling...`, position);
          if (user.sniper.allowAutoSell) {
            sell(position);
          }
        }
      }
    }, 10000);

  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('message', async function message(data) {
    const txData = JSON.parse(data);
    if (txData && txData.mint) {
      if (txData.txType == "create") {
        // if (!CHECK_NAME || txData.mint.endsWith("pump"))
        // buy(txData.mint);
      } else if (txData.txType == "buy" || txData.txType == "sell") {
        const position = active_wallet.positions.find((position) => position.mint == txData.mint);
        console.log('position', position);
        console.log(txData.txType, position?.price, txData.tokenAmount / txData.solAmount)
        if (position) {
          const price = txData.tokenAmount / txData.solAmount;
          if (price >= position.price * (1 + takeProfit) || price <= position.price * (1 + stopLoss)) {
            console.log(`Selling position: ${txData.mint} at price ${price} | Original price: ${position.price}`);
            if (user.sniper.allowAutoSell) {
              sell(position);
            }
          }
        }
        if (txData.txType == "buy") {
          if (txData.traderPublicKey == user.wallets.find((w) => w.is_active_wallet)?.publicKey) {
            // buyCnt++;
            console.log(`Bought position: ${txData.mint} | https://pump.fun/coin/${txData.mint} | Price: ${txData.tokenAmount / txData.solAmount}`);
            // active_wallet.positions.push({
            //   amount: txData.tokenAmount,
            //   solAmount: txData.solAmount,
            //   mint: txData.mint,
            //   price: txData.tokenAmount / txData.solAmount,
            //   timeStamp: Date.now(),
            // });
            // await user.save();
          }
        }
        if (txData.txType == "sell" && txData.traderPublicKey == active_wallet.publicKey) {
          const payload = {
            method: "unsubscribeTokenTrade",
            keys: [txData.mint] // array of token CAs to watch
          }
          ws.send(JSON.stringify(payload));
          // buyCnt--;
          active_wallet.positions = active_wallet.positions.filter(e => e.mint != txData.mint);
        }
      }
    }
  });
}