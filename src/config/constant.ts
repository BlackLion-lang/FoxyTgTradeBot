import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';
import { Connection, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { TippingSettings } from "../models/tipSettings";
import { User } from "../models/user";
import { PublicKey } from "@solana/web3.js";

dotenv.config();

export const BINDING_PORT = 5061;
export const TELEGRAM_BOT_PORT = 5062;
export const RPC_URL = process.env.RPC_ENDPOINT || '';
export const TELEGRAM_BOT_TOKEN = process.env.TOKEN;

let adminWalletCache: PublicKey | null = null;

export const getAdminWallet = async (): Promise<PublicKey> => {
    if (adminWalletCache) {
        return adminWalletCache;
    }
    const settings = await TippingSettings.findOne() || new TippingSettings();
    if (!settings || !settings.adminSolAddress?.publicKey) {
        throw new Error("Admin wallet not configured in Tipping settings!");
    }
    adminWalletCache = new PublicKey(settings.adminSolAddress.publicKey);
    return adminWalletCache;
};

export const JITO_RELAYS = [
  'https://london.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://singapore.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://slc.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://dublin.mainnet.block-engine.jito.wtf/api/v1/bundles',
  'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
];

export const JITO_IDENTITY = process.env.JITO_IDENTITY;
export const JITO_AUTH = process.env.JITO_AUTH;

export const JITO_TIP_ACCOUNTS = [
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
];

export const JITO_TIP = 3_000_000; // 0.003 SOL
export const BUNDLE_FEE_BUFFER = 0.016;

export const getBundlingFeeWallet = getAdminWallet;
export const getBuySellFeeWallet = getAdminWallet;
export const getTokenCreationFeeWallet = getAdminWallet;
export const getSubscriptionFeeAddress = getAdminWallet;

export const DELAYED_BUNDLE_CONFIG = {
  delayConfig: {
    minSeconds: 2,
    maxSeconds: 5,
    randomize: true,
  },
  amountConfig: {
    variancePercent: 10,
    randomize: true,
  },
  slippage: 50,
  feeBuffer: 0.015,
};

let botInstance: TelegramBot | null = null;

export const getBot = (): TelegramBot => {
  if (!botInstance) {
    botInstance = new TelegramBot(TELEGRAM_BOT_TOKEN || '', {
      polling: {
        interval: 300,
        autoStart: true,
        params: {
          timeout: 10,
        },
      },
    });
    console.log('✅ Bot instance created (SINGLETON)');
  }
  return botInstance;
};

export const bot = getBot();

const processedUpdates = new Set<string>();
const UPDATE_CACHE_DURATION = 60000;

export const isDuplicateUpdate = (updateId: string): boolean => {
  if (processedUpdates.has(updateId)) {
    console.log(`⚠️ Duplicate blocked: ${updateId}`);
    return true;
  }

  processedUpdates.add(updateId);

  setTimeout(() => {
    processedUpdates.delete(updateId);
  }, UPDATE_CACHE_DURATION);

  return false;
};