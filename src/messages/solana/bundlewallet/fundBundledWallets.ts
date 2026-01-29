import { User } from '../../../models/user';
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  AccountLayout,
} from '@solana/spl-token';
import { Model } from 'mongoose';
import { CallbackQuery, Message } from 'node-telegram-bot-api';
import bs58 from 'bs58';
import { decryptSecretKey } from '../../../config/security';
import { RPC_URL, bot } from '../../../config/constant';
import { t } from '../../../locales';

interface FundState {
  step: string;
  chatId: number;
  user: any;
}

export const fundState: Record<number, FundState> = {};

const ongoingFunding = new Set<number>();
const RENT_EXEMPT_MINIMUM = 890880;

const CONFIG = {
  TRANSFER_FEE: 5_000,
  WSOL_CREATE_FEE: 50_000,
  WSOL_AMOUNT: 5_000_000,
  MIN_FOR_WSOL: 7_000_000,
  RENT_EXEMPT: 890_880,
  RENT_BUFFER: 10_000,
  CLEANUP_RESERVE: 15_000,
  VARIANCE: 0.1,
  // MIN_PER_BUNDLE: Minimum distributable amount per bundle wallet
  // When withdrawing, users can withdraw ALL funds above rent-exempt minimum (890,880 lamports)
  // Transaction fee is paid by the sender, but for maximum withdrawal: balance - RENT_EXEMPT - TRANSFER_FEE
  // We use 0.001 SOL (1,000,000 lamports) as minimum - ensures meaningful withdrawable amount
  MIN_PER_BUNDLE: 0.001, // 1,000,000 lamports - users can withdraw all funds above rent-exempt (minus fee)
};

// -------------------- Main handlers --------------------
const fundBundledWallets = async (
  UserModel: Model<any>,
  callbackQuery: CallbackQuery,
) => {
  const telegramId = callbackQuery.from.id;
  const userId = callbackQuery.from.id;
  const chatId = callbackQuery.message?.chat.id || 0;

  if (ongoingFunding.has(telegramId)) {
    return bot.sendMessage(
      chatId,
      `⏳ *${await t('bundleWallets.fundingInProgress', telegramId)}*`,
      { parse_mode: 'Markdown' },
    );
  }

  const user = await UserModel.findOne({ userId });
  if (!user)
    return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.userNotFound', telegramId)}`);
  
  // Get active wallet from wallets array (not bundleWallets)
  const userDoc = user as any;
  const activeWallet = userDoc.wallets?.find((w: any) => w.is_active_wallet);
  if (!activeWallet?.secretKey || !activeWallet?.publicKey)
    return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfigured', telegramId)}`);
  if (!userDoc.bundleWallets?.length)
    return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.noBundleWalletsFound', telegramId)}`);

  const connection = new Connection(userDoc.rpcProvider?.url || RPC_URL);
  const activePubkey = new PublicKey(activeWallet.publicKey);
  const balance = await connection.getBalance(activePubkey);
  const activeSOL = (balance / 1e9).toFixed(4);

  await bot.sendMessage(
    chatId,
    `💰 *${await t('bundleWallets.fundTitle', telegramId)}*\n\n` +
      `${await t('bundleWallets.activeWallet', telegramId)}: \`${activePubkey.toBase58()}\`\n` +
      `${await t('bundleWallets.balance', telegramId)}: *${activeSOL} ${await t('bundleWallets.sol', telegramId)}*\n` +
      `${await t('bundleWallets.bundles', telegramId)}: *${userDoc.bundleWallets.length} ${await t('bundleWallets.wallets', telegramId)}*\n\n` +
      `${await t('bundleWallets.enterAmount', telegramId)}`,
    { parse_mode: 'Markdown' },
  );

  fundState[telegramId] = { step: 'awaiting_amount', chatId, user };
};

const handleUserReply = async (msg: Message) => {
  if (!msg.from?.id) return;
  const telegramId = msg.from.id;
  const state = fundState[telegramId];
  if (!state || state.step !== 'awaiting_amount') return;

  const chatId = state.chatId;
  if (!msg.text) return;
  const total = parseFloat(msg.text.trim());
  if (isNaN(total) || total <= 0)
    return bot.sendMessage(
      chatId,
      `❌ ${await t('bundleWallets.invalidAmount', telegramId)}`,
    );

  if (ongoingFunding.has(telegramId)) {
    return bot.sendMessage(chatId, `⏳ ${await t('bundleWallets.fundingAlreadyInProgress', telegramId)}`);
  }

  ongoingFunding.add(telegramId);

  try {
    await performCleanFunding(state.user, total, chatId);
  } finally {
    ongoingFunding.delete(telegramId);
    delete fundState[telegramId];
  }
};

// -------------------- FINAL POLISHED & SECURE VERSION --------------------
const performCleanFunding = async (user: any, totalSOL: number, chatId: number) => {
  const connection = new Connection(user.rpcProvider?.url || RPC_URL);
  const activeWallet = user.wallets?.find((w: any) => w.is_active_wallet);
  if (!activeWallet?.secretKey) {
    return bot.sendMessage(chatId, `❌ ${await t('bundleWallets.activeWalletNotConfigured', chatId)}`);
  }
  const decrypted = decryptSecretKey(activeWallet.secretKey);
  const activeKeypair = Keypair.fromSecretKey(bs58.decode(decrypted));

  const bundles = user.bundleWallets;
  const count = bundles.length;

  const importantTxs: {
    tempFunding: string[];
    wsol: string[];
    distribution: string[];
    cleanup: string[];
  } = {
    tempFunding: [],
    wsol: [],
    distribution: [],
    cleanup: [],
  };

  const statusMsg = await bot.sendMessage(
    chatId,
    `🚀 *${await t('bundleWallets.startingDistribution', chatId)}*\n\n` +
      `${await t('bundleWallets.amount', chatId)}: *${totalSOL} ${await t('bundleWallets.sol', chatId)}*\n` +
      `${await t('bundleWallets.wallets', chatId)}: *${count}*\n` +
      `${await t('bundleWallets.status', chatId)}: Validating...`,
    { parse_mode: 'Markdown' },
  );

  const totalLamports = Math.floor(totalSOL * LAMPORTS_PER_SOL);
  const minPerBundle = CONFIG.MIN_PER_BUNDLE * LAMPORTS_PER_SOL;
  const minDistributable = minPerBundle * count;
  const tempCount = Math.min(Math.max(Math.ceil(count / 3), 2), 5);

  const estimatedCosts = {
    tempFunding: CONFIG.TRANSFER_FEE * tempCount,
    wsolOperations: (CONFIG.WSOL_CREATE_FEE + CONFIG.WSOL_AMOUNT) * tempCount,
    distribution: CONFIG.TRANSFER_FEE * count,
    cleanup: CONFIG.TRANSFER_FEE * tempCount * 2,
  };

  const totalFeesEstimate = Object.values(estimatedCosts).reduce(
    (a, b) => a + b,
    0,
  );
  const rentReserve = (CONFIG.RENT_EXEMPT + CONFIG.RENT_BUFFER) * tempCount;
  const cleanupReserve = CONFIG.CLEANUP_RESERVE * tempCount;
  const totalOverhead = totalFeesEstimate + rentReserve + cleanupReserve;
  const totalRequired = minDistributable + totalOverhead;

  console.log('\n📊 Funding Plan:');
  console.log(
    `  Input: ${totalLamports.toLocaleString()} lamports (${totalSOL} SOL)`,
  );
  console.log(`  Bundles: ${count}, Temps: ${tempCount}`);
  console.log(
    `  Required: ${totalRequired.toLocaleString()} lamports (${(totalRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL)`,
  );

  if (totalLamports < totalRequired) {
    await bot.editMessageText(
      `❌ *${await t('bundleWallets.insufficientAmount', chatId)}*\n\n` +
        `${await t('bundleWallets.provided', chatId)}: *${totalSOL} ${await t('bundleWallets.sol', chatId)}*\n` +
        `${await t('bundleWallets.required', chatId)}: *${(totalRequired / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', chatId)}*\n\n` +
        `*${await t('bundleWallets.breakdown', chatId)}:*\n` +
        `• ${await t('bundleWallets.distribution', chatId)}: ${(minDistributable / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', chatId)}\n` +
        `• ${await t('bundleWallets.feesReserves', chatId)}: ${(totalOverhead / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', chatId)}\n\n` +
        `${await t('bundleWallets.addMore', chatId)} *${((totalRequired - totalLamports) / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.sol', chatId)}*`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
      },
    );
    return;
  }

  const devBalance = await connection.getBalance(activeKeypair.publicKey);
  const SAFETY_BUFFER = 0.02 * LAMPORTS_PER_SOL;

  console.log(`  Dev balance: ${devBalance.toLocaleString()} lamports`);

  if (devBalance < totalLamports + SAFETY_BUFFER) {
    const needed = (totalLamports + SAFETY_BUFFER) / LAMPORTS_PER_SOL;
    const have = devBalance / LAMPORTS_PER_SOL;
    await bot.editMessageText(
      `❌ *${await t('bundleWallets.insufficientBalance', chatId)}*\n\n` +
        `${await t('bundleWallets.available', chatId)}: ${have.toFixed(4)} ${await t('bundleWallets.sol', chatId)}\n` +
        `${await t('bundleWallets.required', chatId)}: ${needed.toFixed(4)} ${await t('bundleWallets.sol', chatId)}\n\n` +
        `${await t('bundleWallets.pleaseAdd', chatId)} ${(needed - have).toFixed(4)} ${await t('bundleWallets.sol', chatId)} to your active wallet.`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
      },
    );
    return;
  }

  const distributableLamports = totalLamports - totalOverhead;
  console.log(
    `  Distributable: ${distributableLamports.toLocaleString()} lamports (${(distributableLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL)\n`,
  );

  const tempWallets = Array.from({ length: tempCount }, () =>
    Keypair.generate(),
  );

  const timestamp = Date.now();
  const recoveryData = {
    timestamp,
    date: new Date().toISOString(),
    activeWallet: activeKeypair.publicKey.toBase58(),
    totalSOL,
    bundleCount: count,
    tempWallets: tempWallets.map((w, idx) => ({
      index: idx + 1,
      publicKey: w.publicKey.toBase58(),
      privateKey: bs58.encode(w.secretKey),
    })),
  };

  let recoveryText = `🔑 TEMPORARY WALLET RECOVERY KEYS\n`;
  recoveryText += `═══════════════════════════════════════════════\n\n`;
  recoveryText += `Date: ${new Date().toLocaleString()}\n`;
  recoveryText += `Operation: Clean Bundle Funding\n`;
  recoveryText += `Total Amount: ${totalSOL} SOL\n`;
  recoveryText += `Bundle Wallets: ${count}\n`;
  recoveryText += `Temp Wallets: ${tempCount}\n\n`;
  recoveryText += `Dev Wallet:\n${activeKeypair.publicKey.toBase58()}\n\n`;
  recoveryText += `═══════════════════════════════════════════════\n\n`;

  tempWallets.forEach((w, idx) => {
    recoveryText += `TEMP WALLET #${idx + 1}\n`;
    recoveryText += `───────────────────────────────────────────────\n`;
    recoveryText += `Public Key:\n${w.publicKey.toBase58()}\n\n`;
    recoveryText += `Private Key:\n${bs58.encode(w.secretKey)}\n\n`;
    recoveryText += `Solscan:\nhttps://solscan.io/account/${w.publicKey.toBase58()}\n\n`;
  });

  recoveryText += `═══════════════════════════════════════════════\n`;
  recoveryText += `⚠️ IMPORTANT: Keep these keys safe!\n`;
  recoveryText += `These temporary wallets will be CLOSED after distribution.\n`;
  recoveryText += `If distribution fails, you can recover SOL using these keys.\n`;

  // ========== CRITICAL: SEND RECOVERY KEYS TO TELEGRAM IMMEDIATELY ==========
  // Send to Telegram BEFORE any funding operations
  try {
    const buffer = Buffer.from(recoveryText, 'utf-8');
    await bot.sendDocument(
      chatId,
      buffer,
      {
        caption:
          `🔐 *${await t('bundleWallets.recoveryKeysTitle', chatId)}*\n\n` +
          `⚠️ ${await t('bundleWallets.recoveryKeysCaption', chatId)}\n` +
          `💾 ${await t('bundleWallets.recoveryKeysWarning', chatId)}\n` +
          `🔒 ${await t('bundleWallets.recoveryKeysRecover', chatId)}\n\n` +
          `_${await t('bundleWallets.recoveryKeysStart', chatId)}_`,
        parse_mode: 'Markdown',
      },
      {
        filename: `recovery-keys-${timestamp}.txt`,
        contentType: 'text/plain',
      },
    );
    console.log('✅ Recovery keys sent to Telegram\n');

    // Give user time to save the file
    await new Promise((res) => setTimeout(res, 5000));
  } catch (err) {
    console.error('❌ CRITICAL: Failed to send recovery keys:', err);
    await bot.sendMessage(
      chatId,
      `❌ *${await t('bundleWallets.criticalError', chatId)}*\n\n${await t('bundleWallets.failedToSendRecovery', chatId)}\n` +
        `${await t('bundleWallets.operationAborted', chatId)}\n\n` +
        `${await t('bundleWallets.checkInternetConnection', chatId)}`,
      { parse_mode: 'Markdown' },
    );
    return;
  }

  const perTempBase = distributableLamports / tempCount;
  const perTempReserves = rentReserve / tempCount + cleanupReserve / tempCount;
  const perTempWsol = CONFIG.WSOL_AMOUNT + CONFIG.WSOL_CREATE_FEE;

  const baseSplits = randomSplit(distributableLamports, tempCount, 0.05);
  const tempFundingAmounts = baseSplits.map((base) =>
    Math.floor(base + perTempReserves + perTempWsol),
  );

  console.log(`💼 Temp Funding Plan:`);
  tempFundingAmounts.forEach((amount, idx) => {
    console.log(
      `  Temp #${idx + 1}: ${amount.toLocaleString()} lamports (base: ${baseSplits[idx].toLocaleString()}, WSOL: ${perTempWsol.toLocaleString()}, reserves: ${perTempReserves.toLocaleString()})`,
    );
  });
  console.log('');

  let rentExempt = CONFIG.RENT_EXEMPT;
  try {
    rentExempt = await connection.getMinimumBalanceForRentExemption(
      AccountLayout.span,
    );
  } catch (err) {
    rentExempt = 2_039_280;
  }

  // ========== PHASE 1: FUND TEMP WALLETS ==========
  await bot.editMessageText(
    `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
      `✅ ${await t('bundleWallets.validated', chatId)}\n` +
      `💰 ${(distributableLamports / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.distributable', chatId)}\n` +
      `💼 ${await t('bundleWallets.creatingTempWallets', chatId)} ${tempCount} ${await t('bundleWallets.tempWallets', chatId)}...\n\n` +
      `${await t('bundleWallets.phase', chatId)} 1/4: ${await t('bundleWallets.fundingTemps', chatId)}\n` +
      `${'▓'.repeat(5)}${'░'.repeat(95)}`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    },
  );

  const fundedTempWallets = [];

  for (let i = 0; i < tempWallets.length; i++) {
    try {
      const tempWallet = tempWallets[i];
      const amount = tempFundingAmounts[i];

      const currentDevBalance = await connection.getBalance(
        activeKeypair.publicKey,
      );

      if (currentDevBalance < amount + 10_000) {
        console.error(`Active wallet insufficient for temp #${i + 1}`);
        break;
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: activeKeypair.publicKey,
          toPubkey: tempWallet.publicKey,
          lamports: amount,
        }),
      );

      const sig = await sendAndConfirmTransaction(
        connection,
        tx,
        [activeKeypair],
        {
          commitment: 'confirmed',
          preflightCommitment: 'confirmed',
        },
      );

      if (i < 2) {
        importantTxs.tempFunding.push(sig);
      }

      console.log(
        `✅ Temp #${i + 1} funded: ${amount.toLocaleString()} lamports`,
      );
      fundedTempWallets.push(tempWallet);

      await new Promise((res) => setTimeout(res, 1000));

      const progress = Math.floor(((i + 1) / tempCount) * 20);
      await bot.editMessageText(
        `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
          `✅ ${await t('bundleWallets.validated', chatId)}\n` +
          `💰 ${(distributableLamports / LAMPORTS_PER_SOL).toFixed(4)} ${await t('bundleWallets.distributable', chatId)}\n` +
          `💼 ${await t('bundleWallets.tempWallets', chatId)}: ${i + 1}/${tempCount} ${await t('bundleWallets.funded', chatId)}\n\n` +
          `${await t('bundleWallets.phase', chatId)} 1/4: ${await t('bundleWallets.fundingTemps', chatId)}\n` +
          `${'▓'.repeat(progress)}${'░'.repeat(100 - progress)}`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown',
        },
      );
    } catch (err) {
      console.error(`Error funding temp #${i + 1}:`, err);
    }
  }

  if (fundedTempWallets.length === 0) {
    await bot.editMessageText(
      `❌ *${await t('bundleWallets.fundingFailed', chatId)}*\n\n${await t('bundleWallets.couldNotFundTempWallets', chatId)}`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown',
      },
    );
    return;
  }

  console.log(
    `\n✅ Phase 1 complete: ${fundedTempWallets.length}/${tempCount} temps funded\n`,
  );

  // ========== CRITICAL: WAIT FOR BALANCES TO UPDATE ==========
  console.log('⏳ Waiting for blockchain to confirm temp funding...');
  await new Promise((res) => setTimeout(res, 5000));
  console.log('✅ Blockchain confirmed\n');

  // ========== PHASE 2: WSOL OPERATIONS ==========
  await bot.editMessageText(
    `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
      `✅ ${await t('bundleWallets.funded', chatId)} ${fundedTempWallets.length}/${tempCount} ${await t('bundleWallets.tempsFunded', chatId)}\n` +
      `♻️ ${await t('bundleWallets.phase', chatId)} 2/4: ${await t('bundleWallets.breakingHeuristics', chatId)}\n` +
      `${'▓'.repeat(25)}${'░'.repeat(75)}`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    },
  );

  console.log(`♻️ Pre-WSOL Balance Validation:`);
  for (let i = 0; i < fundedTempWallets.length; i++) {
    const balance = await connection.getBalance(fundedTempWallets[i].publicKey);
    const hasEnough = balance >= CONFIG.MIN_FOR_WSOL;
    console.log(
      `  Temp #${i + 1}: ${balance.toLocaleString()} lamports ${hasEnough ? '✅' : '❌'}`,
    );
    if (!hasEnough) {
      console.warn(
        `  ⚠️ WARNING: Temp #${i + 1} may skip WSOL (needs ${CONFIG.MIN_FOR_WSOL.toLocaleString()} lamports)`,
      );
    }
  }
  console.log('');

  let wsolSuccess = 0;
  for (let i = 0; i < fundedTempWallets.length; i++) {
    const temp = fundedTempWallets[i];
    await new Promise((res) => setTimeout(res, 2000));

    const balanceBefore = await connection.getBalance(temp.publicKey);

    if (balanceBefore < CONFIG.MIN_FOR_WSOL) {
      console.log(
        `⏭️ Temp #${i + 1} skipping WSOL: ${balanceBefore.toLocaleString()} < ${CONFIG.MIN_FOR_WSOL.toLocaleString()}`,
      );
      continue;
    }

    try {
      console.log(`♻️ Temp #${i + 1} performing WSOL...`);
      const wsolSig = await wrapAndUnwrapWSOL(connection, temp, rentExempt);

      if (wsolSuccess < 2 && wsolSig) {
        importantTxs.wsol.push(wsolSig);
      }

      wsolSuccess++;
      console.log(`  ✅ WSOL complete\n`);

      const progress =
        25 + Math.floor((wsolSuccess / fundedTempWallets.length) * 25);
      await bot.editMessageText(
        `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
          `✅ ${await t('bundleWallets.tempWallets', chatId)}: ${fundedTempWallets.length}/${tempCount}\n` +
          `♻️ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length}\n` +
          `${await t('bundleWallets.phase', chatId)} 2/4: ${await t('bundleWallets.breakingHeuristics', chatId)}\n` +
          `${'▓'.repeat(progress)}${'░'.repeat(100 - progress)}`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown',
        },
      );
    } catch (err) {
      console.error(`WSOL error for temp #${i + 1}:`, err);
    }
  }

  console.log(
    `\n✅ Phase 2 complete: ${wsolSuccess}/${fundedTempWallets.length} WSOL operations\n`,
  );

  // ========== PHASE 3: DISTRIBUTION ==========
  await bot.editMessageText(
    `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
      `✅ ${await t('bundleWallets.tempWallets', chatId)}: ${fundedTempWallets.length}/${tempCount}\n` +
      `✅ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length}\n` +
      `🎯 ${await t('bundleWallets.phase', chatId)} 3/4: ${await t('bundleWallets.distributingToBundles', chatId)}\n` +
      `${'▓'.repeat(50)}${'░'.repeat(50)}`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    },
  );

  await new Promise((res) => setTimeout(res, 2000));

  // ========== CRITICAL: REFRESH BALANCES BEFORE DISTRIBUTION ==========
  console.log('🔄 Refreshing temp wallet balances...');
  const tempBalances = [];

  for (let i = 0; i < fundedTempWallets.length; i++) {
    const wallet = fundedTempWallets[i];
    let balance = 0;

    // Retry balance check up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        balance = await connection.getBalance(wallet.publicKey, 'confirmed');
        if (balance > 0 || attempt === 2) break;
        await new Promise((res) => setTimeout(res, 1000));
      } catch (err: any) {
        console.error(
          `Error checking balance for temp #${i + 1}:`,
          err?.message || err,
        );
        if (attempt === 2) throw err;
      }
    }

    tempBalances.push({ wallet, balance });
    console.log(`  Temp #${i + 1}: ${balance.toLocaleString()} lamports`);
  }
  console.log('');

  let success = 0;
  const targetPerBundle = distributableLamports / count;
  const MINIMUM_KEEP =
    CONFIG.RENT_EXEMPT + CONFIG.RENT_BUFFER + CONFIG.CLEANUP_RESERVE;

  console.log(
    `🎯 Distributing to ${count} bundles (target: ${targetPerBundle.toLocaleString()} lamports each)...\n`,
  );

  for (let i = 0; i < bundles.length; i++) {
    try {
      const availableTemps = tempBalances
        .map((t, idx) => ({ ...t, idx }))
        .filter((t) => {
          const available = t.balance - MINIMUM_KEEP;
          const canFund = available >= targetPerBundle * 0.3;
          return canFund;
        })
        .sort((a, b) => b.balance - a.balance);

      if (availableTemps.length === 0) {
        console.error(
          `\n❌ All temp wallets exhausted at bundle #${i + 1}/${count}`,
        );
        console.log(`Current temp balances:`);
        tempBalances.forEach((t, idx) => {
          const available = t.balance - MINIMUM_KEEP;
          console.log(
            `  Temp #${idx + 1}: ${t.balance.toLocaleString()} lamports (available: ${available.toLocaleString()})`,
          );
        });

        // Send warning to user about remaining funds
        const hasRemainingFunds = tempBalances.some(
          (t) => t.balance > MINIMUM_KEEP * 2,
        );
        if (hasRemainingFunds) {
          await bot.sendMessage(
            chatId,
            `⚠️ *${await t('bundleWallets.distributionIncomplete', chatId)}*\n\n` +
              `${await t('bundleWallets.someBundlesNotFunded', chatId)}\n\n` +
              `🔐 ${await t('bundleWallets.checkRecoveryKeys', chatId)}`,
            { parse_mode: 'Markdown' },
          );
        }

        break;
      }

      const selectedTemp = availableTemps[0];
      const tempWallet = selectedTemp.wallet;
      const availableForDistribution = selectedTemp.balance - MINIMUM_KEEP;

      const randomizedTarget =
        targetPerBundle * (1 + (Math.random() - 0.5) * 2 * CONFIG.VARIANCE);
      const actualLamports = Math.floor(
        Math.min(
          randomizedTarget,
          availableForDistribution - CONFIG.TRANSFER_FEE,
        ),
      );

      if (actualLamports < minPerBundle) {
        console.warn(
          `⚠️ Bundle #${i + 1}: Insufficient (${actualLamports} < ${minPerBundle})`,
        );
        break;
      }

      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: tempWallet.publicKey,
          toPubkey: new PublicKey(bundles[i].publicKey),
          lamports: actualLamports,
        }),
      );
      tx.feePayer = tempWallet.publicKey;

      const sig = await sendAndConfirmTransaction(
        connection,
        tx,
        [tempWallet],
        {
          commitment: 'confirmed',
        },
      );

      if (importantTxs.distribution.length < 3) {
        importantTxs.distribution.push(sig);
      }

      tempBalances[selectedTemp.idx].balance -=
        actualLamports + CONFIG.TRANSFER_FEE;
      success++;

      console.log(
        `  ✅ Bundle #${i + 1}/${count}: ${actualLamports.toLocaleString()} lamports`,
      );

      if (success % 3 === 0 || success === count) {
        const progress = 50 + Math.floor((success / count) * 25);
        await bot.editMessageText(
          `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
            `✅ ${await t('bundleWallets.tempWallets', chatId)}: ${fundedTempWallets.length}/${tempCount}\n` +
            `✅ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length}\n` +
            `🎯 ${await t('bundleWallets.fundingBundles', chatId)}: ${success}/${count} ${await t('bundleWallets.bundleFunded', chatId)}\n` +
            `${'▓'.repeat(progress)}${'░'.repeat(100 - progress)}`,
          {
            chat_id: chatId,
            message_id: statusMsg.message_id,
            parse_mode: 'Markdown',
          },
        );
      }
    } catch (err) {
      console.error(`Failed bundle #${i + 1}:`, err);
    }
  }

  console.log(`\n✅ Phase 3 complete: ${success}/${count} bundles funded\n`);

  // ========== WAIT FOR BLOCKCHAIN TO SETTLE ==========
  console.log('⏳ Waiting for blockchain to settle...');
  await bot.editMessageText(
    `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
      `✅ ${await t('bundleWallets.tempWallets', chatId)}: ${fundedTempWallets.length}/${tempCount}\n` +
      `✅ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length}\n` +
      `✅ ${await t('bundleWallets.fundingBundles', chatId)}: ${success}/${count}\n` +
      `⏳ ${await t('bundleWallets.confirmingTransactions', chatId)}\n` +
      `${'▓'.repeat(75)}${'░'.repeat(25)}`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    },
  );

  await new Promise((res) => setTimeout(res, 8000));
  console.log('✅ Blockchain settled\n');

  // ========== PHASE 4: SECURE CLEANUP & ACCOUNT CLOSURE ==========
  console.log('🧹 Starting secure cleanup...');

  await bot.editMessageText(
    `🚀 *${await t('bundleWallets.cleanDistribution', chatId)}*\n\n` +
      `✅ ${await t('bundleWallets.tempWallets', chatId)}: ${fundedTempWallets.length}/${tempCount}\n` +
      `✅ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length}\n` +
      `✅ ${await t('bundleWallets.fundingBundles', chatId)}: ${success}/${count}\n` +
      `🔒 ${await t('bundleWallets.phase', chatId)} 4/4: ${await t('bundleWallets.closingAccounts', chatId)}\n` +
      `${'▓'.repeat(75)}${'░'.repeat(25)}`,
    {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown',
    },
  );

  let totalRecovered = 0;
  let accountsClosed = 0;

  console.log('🔓 Checking for WSOL token accounts...');
  for (let i = 0; i < fundedTempWallets.length; i++) {
    const tempWallet = fundedTempWallets[i];

    try {
      const ata = await getAssociatedTokenAddress(
        NATIVE_MINT,
        tempWallet.publicKey,
      );
      const ataInfo = await connection.getAccountInfo(ata);

      if (ataInfo) {
        console.log(`  Temp #${i + 1}: Closing WSOL token account`);

        const closeTx = new Transaction().add(
          createCloseAccountInstruction(
            ata,
            tempWallet.publicKey,
            tempWallet.publicKey,
            [],
            TOKEN_PROGRAM_ID,
          ),
        );
        closeTx.feePayer = tempWallet.publicKey;
        closeTx.recentBlockhash = (
          await connection.getLatestBlockhash()
        ).blockhash;

        await sendAndConfirmTransaction(connection, closeTx, [tempWallet], {
          commitment: 'confirmed',
        });

        console.log(`  ✅ WSOL account closed`);
      }
    } catch (err: any) {
      console.error(
        `  ⚠️ Failed to close WSOL account for temp #${i + 1}:`,
        err?.message || err,
      );
    }
  }

  await new Promise((res) => setTimeout(res, 2000));

  console.log('\n💰 Closing temp wallet accounts...');

  for (let i = 0; i < fundedTempWallets.length; i++) {
    const tempWallet = fundedTempWallets[i];

    try {
      let currentBalance = 0;
      for (let attempt = 0; attempt < 3; attempt++) {
        currentBalance = await connection.getBalance(
          tempWallet.publicKey,
          'confirmed',
        );
        console.log(
          `  Temp #${i + 1} balance check ${attempt + 1}/3: ${currentBalance.toLocaleString()} lamports`,
        );

        if (currentBalance > 0) {
          console.log(
            `    ✅ Balance confirmed: ${(currentBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
          );
          break;
        }

        if (attempt < 2) {
          console.log(`    ⏳ Waiting 3s...`);
          await new Promise((res) => setTimeout(res, 3000));
        } else {
          console.log(`    ✅ Confirmed as 0`);
        }
      }

      if (currentBalance > 10000) {
        const tx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: tempWallet.publicKey,
            toPubkey: activeKeypair.publicKey,
            lamports: currentBalance,
          }),
        );

        tx.feePayer = activeKeypair.publicKey;
        tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

        const cleanupSig = await sendAndConfirmTransaction(
          connection,
          tx,
          [tempWallet, activeKeypair],
          {
            commitment: 'confirmed',
            skipPreflight: false,
          },
        );

        console.log(
          `  ✅ Account closed: ${currentBalance.toLocaleString()} lamports recovered`,
        );

        totalRecovered += currentBalance;

        if (importantTxs.cleanup.length < 2) {
          importantTxs.cleanup.push(cleanupSig);
        }

        await new Promise((res) => setTimeout(res, 3000));
        const finalBalance = await connection.getBalance(
          tempWallet.publicKey,
          'confirmed',
        );

        if (finalBalance === 0) {
          accountsClosed++;
          console.log(`     ✅ Verified closed\n`);
        } else {
          console.warn(
            `     ⚠️ Still has ${finalBalance.toLocaleString()} lamports\n`,
          );
        }
      } else if (currentBalance === 0) {
        accountsClosed++;
        console.log(`  ✅ Already closed\n`);
      } else {
        console.log(
          `  ⏭️ Minimal balance (${currentBalance.toLocaleString()}), skipping\n`,
        );
      }
    } catch (err: any) {
      console.error(`  ❌ Failed to close temp #${i + 1}:`, err?.message || err);
    }
  }

  tempWallets.forEach((wallet, idx) => {
    try {
      if (wallet.secretKey) {
        wallet.secretKey.fill(0);
      }
    } catch (err) {
      console.error(
        `Failed to clear temp wallet #${idx + 1} from memory:`,
        err,
      );
    }
  });
  console.log('🔒 Private keys cleared from memory\n');

  const perWallet = (distributableLamports / count / LAMPORTS_PER_SOL).toFixed(
    6,
  );
  const successRate = ((success / count) * 100).toFixed(0);
  const recoveredSOL = (totalRecovered / LAMPORTS_PER_SOL).toFixed(6);
  const closureRate = (
    (accountsClosed / fundedTempWallets.length) *
    100
  ).toFixed(0);
  const wsolRate = ((wsolSuccess / fundedTempWallets.length) * 100).toFixed(0);

  let finalMessage = `🎉 *${await t('bundleWallets.fundingComplete', chatId)}*\n\n`;
  finalMessage += `✅ ${await t('bundleWallets.success', chatId)}: *${success}/${count}* (${successRate}%)\n`;
  finalMessage += `💰 ${await t('bundleWallets.perWallet', chatId)}: ~${perWallet} ${await t('bundleWallets.sol', chatId)}\n`;
  finalMessage += `♻️ ${await t('bundleWallets.heuristics', chatId)}: ${wsolSuccess}/${fundedTempWallets.length} (${wsolRate}%)\n`;
  finalMessage += `🔒 ${await t('bundleWallets.accountsClosed', chatId)}: ${accountsClosed}/${fundedTempWallets.length} (${closureRate}%)\n`;
  finalMessage += `💸 ${await t('bundleWallets.recovered', chatId)}: ${recoveredSOL} ${await t('bundleWallets.sol', chatId)}\n\n`;

  finalMessage += `📊 *${await t('bundleWallets.transactionExplorer', chatId)}*\n`;
  finalMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

  const viewOnSolscanText = await t('bundleWallets.viewOnSolscan', chatId);

  if (importantTxs.tempFunding.length > 0) {
    finalMessage += `💼 *${await t('bundleWallets.tempFunding', chatId)}*\n`;
    importantTxs.tempFunding.forEach((sig, idx) => {
      finalMessage += `  ${idx + 1}. [${viewOnSolscanText}](https://solscan.io/tx/${sig})\n`;
    });
    finalMessage += `\n`;
  }

  if (importantTxs.wsol.length > 0) {
    finalMessage += `♻️ *${await t('bundleWallets.wsolOperations', chatId)}*\n`;
    importantTxs.wsol.forEach((sig, idx) => {
      finalMessage += `  ${idx + 1}. [${viewOnSolscanText}](https://solscan.io/tx/${sig})\n`;
    });
    finalMessage += `\n`;
  }

  if (importantTxs.distribution.length > 0) {
    finalMessage += `🎯 *${await t('bundleWallets.bundleDistribution', chatId)}*\n`;
    importantTxs.distribution.forEach((sig, idx) => {
      finalMessage += `  ${idx + 1}. [${viewOnSolscanText}](https://solscan.io/tx/${sig})\n`;
    });
    finalMessage += `\n`;
  }

  if (importantTxs.cleanup.length > 0) {
    finalMessage += `🔒 *${await t('bundleWallets.accountClosure', chatId)}*\n`;
    importantTxs.cleanup.forEach((sig, idx) => {
      finalMessage += `  ${idx + 1}. [${viewOnSolscanText}](https://solscan.io/tx/${sig})\n`;
    });
    finalMessage += `\n`;
  }

  if (accountsClosed === fundedTempWallets.length) {
    finalMessage += `_✅ ${await t('bundleWallets.allTempAccountsClosed', chatId)}_`;
  } else {
    finalMessage += `_${await t('bundleWallets.bundleWalletsReady', chatId)}_`;
  }

  await bot.editMessageText(finalMessage, {
    chat_id: chatId,
    message_id: statusMsg.message_id,
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  });

  console.log(`${'='.repeat(60)}`);
  console.log(
    `SUMMARY: ${success}/${count} bundles, ${wsolSuccess}/${fundedTempWallets.length} WSOL, ${accountsClosed}/${fundedTempWallets.length} closed, ${recoveredSOL} SOL recovered`,
  );
  console.log(`${'='.repeat(60)}\n`);
};

// -------------------- Helpers --------------------
const randomSplit = (total: number, parts: number, variance: number = 0.2): number[] => {
  if (parts <= 0) return [];
  const base = total / parts;
  let splits = Array(parts)
    .fill(0)
    .map(() => base * (1 + (Math.random() - 0.5) * 2 * variance));
  const floored = splits.map((s) => Math.floor(s) || 0);
  let sum = floored.reduce((a, b) => a + b, 0);
  let remainder = total - sum;
  let idx = 0;
  while (remainder > 0) {
    floored[idx % parts]++;
    idx++;
    remainder--;
  }
  while (remainder < 0) {
    const maxIdx = floored.indexOf(Math.max(...floored));
    floored[maxIdx] = Math.max(0, floored[maxIdx] - 1);
    remainder++;
  }
  return floored;
};

const wrapAndUnwrapWSOL = async (
  connection: Connection,
  wallet: Keypair,
  rentExempt: number,
): Promise<string | null> => {
  const ata = await getAssociatedTokenAddress(NATIVE_MINT, wallet.publicKey);

  let ataExists = false;
  try {
    const accountInfo = await connection.getAccountInfo(ata);
    if (accountInfo) ataExists = true;
  } catch (err) {}

  const tx = new Transaction();

  if (!ataExists) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        ata,
        wallet.publicKey,
        NATIVE_MINT,
      ),
    );
  }

  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: ata,
      lamports: CONFIG.WSOL_AMOUNT,
    }),
  );

  tx.add(createSyncNativeInstruction(ata));
  tx.feePayer = wallet.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const sig = await sendAndConfirmTransaction(connection, tx, [wallet], {
    commitment: 'confirmed',
  });

  await new Promise((res) => setTimeout(res, 1500));

  const tx2 = new Transaction();
  tx2.add(
    createCloseAccountInstruction(
      ata,
      wallet.publicKey,
      wallet.publicKey,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );
  tx2.feePayer = wallet.publicKey;
  tx2.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  await sendAndConfirmTransaction(connection, tx2, [wallet], {
    commitment: 'confirmed',
  });

  return sig;
};

export default { fundState, fundBundledWallets, handleUserReply };