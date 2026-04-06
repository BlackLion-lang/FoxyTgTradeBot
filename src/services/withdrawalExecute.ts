import TelegramBot from "node-telegram-bot-api";
import {
    ComputeBudgetProgram,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    TransactionMessage,
    VersionedTransaction,
    SystemProgram,
} from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { decryptSecretKey } from "../config/security";
import { t } from "../locales";
import { transferETH } from "./ethereum/transfer";

export async function executeSolanaNativeWithdraw(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    wallet: { publicKey: string; secretKey: string },
    solToAddress: string,
    amountSol: number,
    isFullBalance: boolean,
): Promise<{ signature: string; amount: number }> {
    let decrypted: string;
    try {
        decrypted = decryptSecretKey(wallet.secretKey);
    } catch (error: any) {
        console.error(`[Withdraw] decrypt failed for ${wallet.publicKey}:`, error.message);
        throw new Error("DECRYPT");
    }

    let senderKeypair: Keypair;
    try {
        senderKeypair = Keypair.fromSecretKey(bs58.decode(decrypted));
    } catch (error: any) {
        console.error(`[Withdraw] keypair failed for ${wallet.publicKey}:`, error.message);
        throw new Error("KEYPAIR");
    }

    const receiverPublicKey = new PublicKey(solToAddress);

    const balance = await connection.getBalance(senderKeypair.publicKey);
    const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
    const maxSendable = Math.max(balance - rentExempt - 10000, 0);

    let amountInLamports: number;
    if (isFullBalance) {
        amountInLamports = maxSendable;
    } else {
        amountInLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
        if (amountInLamports > maxSendable) {
            amountInLamports = maxSendable;
        }
    }

    if (amountInLamports <= 0) {
        throw new Error("INSUFFICIENT");
    }

    const latestBlockhash = await connection.getLatestBlockhash("finalized");

    const instructions = [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 2000 }),
        ComputeBudgetProgram.setComputeUnitLimit({ units: 50_000 }),
        SystemProgram.transfer({
            fromPubkey: senderKeypair.publicKey,
            toPubkey: receiverPublicKey,
            lamports: amountInLamports,
        }),
    ];

    const message = new TransactionMessage({
        payerKey: senderKeypair.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([senderKeypair]);

    const sim = await connection.simulateTransaction(tx, {
        sigVerify: false,
        replaceRecentBlockhash: true,
    });
    if (sim.value.err) {
        console.error("Simulation failed:", sim.value.err);
        throw new Error("SIMULATION");
    }

    const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "processed",
    });

    const confirmation = await connection.confirmTransaction(
        {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed",
    );

    const sentAmountSol = amountInLamports / LAMPORTS_PER_SOL;

    if (confirmation.value.err) {
        await bot.sendMessage(
            chatId,
            `<strong>${await t("withdrawal.p1", userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🔴 ${await t("withdrawal.p2", userId)}</em></strong>
${sentAmountSol} SOL ⇄ <code>${solToAddress}</code>

<strong><em>🔴 ${await t("withdrawal.p5", userId)}</em> — <a href="https://solscan.io/tx/${signature}">${await t("withdrawal.p4", userId)}</a></strong>`,
            {
                parse_mode: "HTML",
                disable_web_page_preview: true,
                reply_markup: {
                    inline_keyboard: [[{ text: `${await t("withdrawal.view", userId)}`, url: `https://solscan.io/tx/${signature}` }]],
                },
            },
        );
        throw new Error("CHAIN_ERR");
    }

    await bot.sendMessage(
        chatId,
        `<strong>${await t("withdrawal.p1", userId)}</strong>
<code>${wallet.publicKey}</code>

<strong><em>🟢 ${await t("withdrawal.p2", userId)}</em></strong>
${sentAmountSol} SOL ⇄ <code>${solToAddress}</code>

<strong><em>🟢 ${await t("withdrawal.p6", userId)}</em> — <a href="https://solscan.io/tx/${signature}">${await t("withdrawal.p4", userId)}</a></strong>`,
        {
            parse_mode: "HTML",
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [[{ text: `${await t("withdrawal.view", userId)}`, url: `https://solscan.io/tx/${signature}` }]],
            },
        },
    );

    return { signature, amount: sentAmountSol };
}

/** `amountEth` must be the final native amount to send (caller resolves full-balance vs fixed). */
export async function executeEthereumNativeWithdraw(
    bot: TelegramBot,
    chatId: number,
    userId: number,
    walletIndex: number,
    toAddress: string,
    amountEth: number,
): Promise<void> {
    await transferETH(bot, chatId, userId, amountEth, walletIndex, toAddress);
}
