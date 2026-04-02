import TelegramBot from 'node-telegram-bot-api';
import { BigNumber } from "@ethersproject/bignumber";
import { Contract, ethers } from "ethers";
import { Wallet } from '@ethersproject/wallet';
import type { TransactionReceipt } from "@ethersproject/abstract-provider";
import { ethereum_provider, ethereum_provider_v5 } from "../../config/ethereum";
import { User } from '../../models/user';
import { walletScanTxUrl } from '../../utils/ethereum';
import { decryptSecretKey } from '../../config/security';
import { t } from '../../locales';

const dismissMarkup = {
    inline_keyboard: [
        [{ text: '✖ Dismiss', callback_data: 'dismiss' }],
    ],
};

/** Same layout as Solana withdrawal messages in bot.ts (withdrawal.p1–p6). Returns message_id so the pending bubble can be removed after final status. */
const sendNativeWithdrawalPendingEth = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    wallet: { publicKey: string },
    toWallet: string,
    amountEth: string,
    txHash: string,
): Promise<number> => {
    const explorerUrl = walletScanTxUrl(txHash);
    const sent = await bot.sendMessage(
        chatId,
        `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟡 ${await t('withdrawal.p2', userId)}</em></strong>
${amountEth} ETH ⇄ <code>${toWallet}</code>

<strong><em>🟡 ${await t('withdrawal.p3', userId)}</em> — ${await t('withdrawal.view', userId)}</strong>`,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('withdrawal.view', userId)}`, url: explorerUrl }],
                ],
            },
        },
    );
    return sent.message_id;
};

const sendNativeWithdrawalSuccessEth = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    wallet: { publicKey: string },
    toWallet: string,
    amountEth: string,
    txHash: string,
) => {
    const explorerUrl = walletScanTxUrl(txHash);
    await bot.sendMessage(
        chatId,
        `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟢 ${await t('withdrawal.p2', userId)}</em></strong>
${amountEth} ETH ⇄ <code>${toWallet}</code>

<strong><em>🟢 ${await t('withdrawal.p6', userId)}</em> — <a href="${explorerUrl}">${await t('withdrawal.view', userId)}</a></strong>`,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('withdrawal.view', userId)}`, url: explorerUrl }],
                ],
            },
        },
    );
};

const sendNativeWithdrawalFailedEth = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    wallet: { publicKey: string },
    toWallet: string,
    amountEth: string,
    txHash: string,
) => {
    const explorerUrl = walletScanTxUrl(txHash);
    await bot.sendMessage(
        chatId,
        `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🔴 ${await t('withdrawal.p2', userId)}</em></strong>
${amountEth} ETH ⇄ <code>${toWallet}</code>

<strong><em>🔴 ${await t('withdrawal.p5', userId)}</em> — <a href="${explorerUrl}">${await t('withdrawal.view', userId)}</a></strong>`,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('withdrawal.view', userId)}`, url: explorerUrl }],
                ],
            },
        },
    );
};

const sendNativeWithdrawalUnconfirmedEth = async (
    bot: TelegramBot,
    chatId: number,
    userId: number,
    wallet: { publicKey: string },
    toWallet: string,
    amountEth: string,
    txHash: string,
) => {
    const explorerUrl = walletScanTxUrl(txHash);
    await bot.sendMessage(
        chatId,
        `<strong>${await t('withdrawal.p1', userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟡 ${await t('withdrawal.p3', userId)}</em></strong>
${amountEth} ETH ⇄ <code>${toWallet}</code>

<em>${await t('bundleWallets.confirmingTransactions', userId)}</em>
<a href="${explorerUrl}">${await t('withdrawal.view', userId)}</a>`,
        {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [{ text: `${await t('withdrawal.view', userId)}`, url: explorerUrl }],
                ],
            },
        },
    );
};

const sleepMs = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function waitForTransferReceipt(
    provider: {
        waitForTransaction: (h: string, c?: number, timeout?: number) => Promise<TransactionReceipt>;
        getTransactionReceipt: (h: string) => Promise<TransactionReceipt | null>;
    },
    hash: string,
): Promise<TransactionReceipt | null> {
    const firstWaitMs = 120_000;
    const pollMs = 3000;
    const maxPolls = 80;
    try {
        return await provider.waitForTransaction(hash, 1, firstWaitMs);
    } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        const isTimeout =
            err?.code === "TIMEOUT" ||
            (typeof err?.message === "string" && err.message.toLowerCase().includes("timeout"));
        if (!isTimeout) {
            throw e;
        }
        for (let i = 0; i < maxPolls; i++) {
            await sleepMs(pollMs);
            const rec = await provider.getTransactionReceipt(hash);
            if (rec != null) {
                return rec;
            }
        }
        return await provider.getTransactionReceipt(hash);
    }
}

async function deletePendingWithdrawalMessage(bot: TelegramBot, chatId: number, messageId: number | undefined) {
    if (messageId == null) return;
    try {
        await bot.deleteMessage(chatId, messageId);
    } catch {
        // already deleted or not allowed
    }
}

const sendTokenPendingMessage = async (
    bot: TelegramBot,
    chatId: number,
    wallet: any,
    to_wallet: string,
    amount: string,
    txHash: string,
    currentBlock: { number?: number; gasLimit?: bigint; gasUsed?: bigint } | null,
) => {
    await bot.sendMessage(chatId, `<strong>🟡 Transfer pending(🔗ETH)</strong>
From: <code>${wallet.publicKey}</code>
To: <code>${to_wallet}</code>
Values: ${amount} | ${(Number(currentBlock?.gasLimit) / 10 ** 9).toFixed(2)} ⛽
Block: ${currentBlock?.number} | ${(Number(currentBlock?.gasUsed) / 10 ** 9).toFixed(2)}
<a href="${walletScanTxUrl(txHash)}">EtherScan</a>`, {
        parse_mode: 'HTML',
        reply_markup: dismissMarkup,
    });
};

const sendTokenConfirmedMessage = async (
    bot: TelegramBot,
    chatId: number,
    amount: string,
    txHash: string,
    receipt: { blockNumber?: number } | null,
    currentBlock: { gasLimit?: bigint; gasUsed?: bigint } | null,
) => {
    await bot.sendMessage(chatId, `<strong>✅ Transfer confirmed(🔗ETH)</strong>
Block: ${receipt?.blockNumber} | ${(Number(currentBlock?.gasLimit) / 10 ** 9).toFixed(2)}
[1] 🟩 <a href="${walletScanTxUrl(txHash)}">Hash</a> | ${amount}`, {
        parse_mode: 'HTML',
        reply_markup: dismissMarkup,
    });
};

export const transferETH = async (bot: TelegramBot, chatId: number, userId: number, eth_amount: number, from_wallet_index: number, to_address: string) => {
    const user = await User.findOne({ userId });
    if (!user) throw new Error("No User Found");
    const wallet = user.ethereumWallets[from_wallet_index];
    if (!wallet) throw new Error("Ethereum wallet not found");
    const decryptedPrivateKey = decryptSecretKey(wallet.secretKey);
    const senderWallet = new Wallet(decryptedPrivateKey).connect(ethereum_provider_v5);
    const to_wallet = ethers.getAddress(to_address.trim());

    const amountStr = eth_amount.toString().includes("e") || eth_amount.toString().includes("E")
        ? eth_amount.toFixed(18).replace(/\.?0+$/, "")
        : String(eth_amount);
    const requestedValueBn = BigNumber.from(ethers.parseEther(amountStr).toString());

    /**
     * Max sendable MUST use the same provider + fee fields as the signed tx.
     * Previously we used ethers v6 getMaxWithdrawableEth (Alchemy v6) then sent with v5 + possibly
     * different maxFeePerGas — value + 21000*maxFee could exceed balance → invalid / stuck txs.
     */
    const balance = await senderWallet.getBalance();
    const feeData = await senderWallet.provider.getFeeData();
    const gasLimit = BigNumber.from(21_000);
    let maxFeePerGas: BigNumber;
    let maxPriorityFeePerGas: BigNumber | undefined;
    let legacyGasPrice: BigNumber | undefined;

    if (feeData.maxFeePerGas != null && !feeData.maxFeePerGas.isZero()) {
        maxFeePerGas = feeData.maxFeePerGas;
        maxPriorityFeePerGas =
            feeData.maxPriorityFeePerGas != null && !feeData.maxPriorityFeePerGas.isZero()
                ? feeData.maxPriorityFeePerGas
                : feeData.maxFeePerGas;
    } else if (feeData.gasPrice != null && !feeData.gasPrice.isZero()) {
        legacyGasPrice = feeData.gasPrice;
        maxFeePerGas = feeData.gasPrice;
    } else {
        throw new Error("Could not resolve gas price for withdrawal.");
    }

    const maxGasCost = gasLimit.mul(maxFeePerGas);
    if (balance.lte(maxGasCost)) {
        throw new Error("Insufficient ETH for transaction fee.");
    }
    let maxValueBn = balance.sub(maxGasCost);
    if (maxValueBn.lt(0)) {
        maxValueBn = BigNumber.from(0);
    }

    let valueBn = requestedValueBn.gt(maxValueBn) ? maxValueBn : requestedValueBn;
    if (valueBn.lte(0)) {
        throw new Error("Invalid withdrawal amount.");
    }
    if (valueBn.add(maxGasCost).gt(balance)) {
        valueBn = balance.sub(maxGasCost);
    }
    if (valueBn.lte(0)) {
        throw new Error("Insufficient ETH for transaction fee.");
    }

    const txRequest: Record<string, unknown> = {
        to: to_wallet,
        value: valueBn,
        gasLimit,
    };
    if (legacyGasPrice == null) {
        txRequest.type = 2;
        txRequest.maxFeePerGas = maxFeePerGas;
        txRequest.maxPriorityFeePerGas = maxPriorityFeePerGas!;
    } else {
        txRequest.gasPrice = legacyGasPrice;
    }
    const tx = await senderWallet.sendTransaction(txRequest);

    const sentEth = parseFloat(ethers.formatEther(BigInt(valueBn.toString())));
    const displayEthAmount = Number.isInteger(sentEth)
        ? String(sentEth)
        : sentEth.toFixed(6).replace(/\.?0+$/, "");
    const pendingMessageId = await sendNativeWithdrawalPendingEth(
        bot,
        chatId,
        userId,
        wallet,
        to_wallet,
        displayEthAmount,
        tx.hash,
    );

    try {
        const receipt = await waitForTransferReceipt(senderWallet.provider, tx.hash);
        if (receipt == null) {
            await sendNativeWithdrawalUnconfirmedEth(bot, chatId, userId, wallet, to_wallet, displayEthAmount, tx.hash);
            await deletePendingWithdrawalMessage(bot, chatId, pendingMessageId);
            return;
        }
        if (receipt.status === 0) {
            await sendNativeWithdrawalFailedEth(bot, chatId, userId, wallet, to_wallet, displayEthAmount, tx.hash);
            await deletePendingWithdrawalMessage(bot, chatId, pendingMessageId);
            return;
        }
        await sendNativeWithdrawalSuccessEth(bot, chatId, userId, wallet, to_wallet, displayEthAmount, tx.hash);
        await deletePendingWithdrawalMessage(bot, chatId, pendingMessageId);
    } catch (e: unknown) {
        console.error("transferETH wait/receipt:", e);
        await sendNativeWithdrawalFailedEth(bot, chatId, userId, wallet, to_wallet, displayEthAmount, tx.hash);
        await deletePendingWithdrawalMessage(bot, chatId, pendingMessageId);
    }
};

export const transferToken = async (bot: TelegramBot, chatId: number, userId: number, token_amount: number, from_wallet_index: number, token_address: string, to_address: string) => {
    try {
        const user = await User.findOne({ userId })
        if(!user) throw "No User Found"
        // Use ethereumWallets for token transfers too
        const wallet = user.ethereumWallets[from_wallet_index];
        if (!wallet) throw "Ethereum wallet not found"
        // Decrypt the private key before using it
        const decryptedPrivateKey = decryptSecretKey(wallet.secretKey);
        const senderWallet = new Wallet(decryptedPrivateKey).connect(ethereum_provider_v5);

        const ERC20_ABI = [
            "function transfer(address to, uint256 amount) public returns (bool)",
            "function decimals() view returns (uint8)",
        ];

        const tokenContract = new Contract(token_address, ERC20_ABI, senderWallet as any);
        const decimals = await tokenContract.decimals();
        const tokenAmount = ethers.parseUnits(`${token_amount}`, decimals);
        const to_wallet = to_address;

        const tx = await tokenContract.transfer(to_wallet, tokenAmount);

        const currentBlock = await ethereum_provider.getBlock('latest');
        await sendTokenPendingMessage(bot, chatId, wallet, to_wallet, `${token_amount}`, tx.hash, currentBlock);

        const receipt = await tx.wait();
        await sendTokenConfirmedMessage(bot, chatId, `${token_amount}`, tx.hash, receipt, currentBlock);
                
    } catch (error) {
        console.error('Transfer token error:', error);
    }
};

