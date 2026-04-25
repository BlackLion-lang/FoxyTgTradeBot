import * as crypto from "crypto";
import { ethers } from "ethers";
import { User } from "../models/user";
import { SecurityLog } from "../models/securityLog";

export type WithdrawChain = "solana" | "ethereum";

export interface PendingWithdrawShape {
    chain: WithdrawChain;
    walletIndex: number;
    toAddress: string;
    amount: number;
    isFullBalance: boolean;
    nonce: string;
    expiresAt: Date;
    pinVerified: boolean;
}

export function parseWithdrawMessageSource(text: string, caption: string): string {
    return `${text}\n${caption}`.replace(/\u00a0/g, " ");
}

/** EIP-55 checksum; throws if invalid. */
export function normalizeEthereumAddress(raw: string): string {
    return ethers.getAddress(raw.trim());
}

export function newWithdrawNonce(): string {
    return crypto.randomBytes(6).toString("hex");
}

export function utcDayString(d = new Date()): string {
    return d.toISOString().slice(0, 10);
}

export function getWalletCreatedAt(user: { createdAt?: unknown }, wallet: { walletCreatedAt?: unknown }): Date {
    const w = wallet?.walletCreatedAt;
    if (w) return new Date(w as Date);
    if (user?.createdAt) return new Date(user.createdAt as Date);
    return new Date(0);
}

/** Wallet is "fresh" if younger than `freshWalletDays` (admin setting). */
export function isFreshWallet(walletCreatedAt: Date, freshWalletDays: number): boolean {
    if (freshWalletDays <= 0) return false;
    const ageMs = Date.now() - walletCreatedAt.getTime();
    return ageMs < freshWalletDays * 86400000;
}

export function isWithdrawPinLocked(user: { withdrawPinLockedUntil?: unknown }): boolean {
    const u = user.withdrawPinLockedUntil;
    if (!u) return false;
    return new Date(u as Date).getTime() > Date.now();
}

type TipLike = {
    withdrawFreshWalletDays?: number;
    withdrawFreshDailyLimitSol?: number;
    withdrawFreshDailyLimitEth?: number;
    withdrawFreshCooldownMinutes?: number;
};

export function checkWithdrawCooldown(
    walletCreatedAt: Date,
    settings: TipLike,
): { ok: true } | { ok: false } {
    const mins = settings.withdrawFreshCooldownMinutes ?? 0;
    if (mins <= 0) return { ok: true };
    const freshDays = settings.withdrawFreshWalletDays ?? 7;
    if (!isFreshWallet(walletCreatedAt, freshDays)) return { ok: true };
    const waitMs = mins * 60_000;
    if (Date.now() - walletCreatedAt.getTime() < waitMs) return { ok: false };
    return { ok: true };
}

export function getDailyWithdrawTotals(user: {
    withdrawDailyUtcDay?: string | null;
    withdrawDailySol?: number | null;
    withdrawDailyEth?: number | null;
}): { day: string; sol: number; eth: number } {
    const day = utcDayString();
    if (user.withdrawDailyUtcDay !== day) {
        return { day, sol: 0, eth: 0 };
    }
    return {
        day,
        sol: Number(user.withdrawDailySol) || 0,
        eth: Number(user.withdrawDailyEth) || 0,
    };
}

export function checkFreshDailyLimit(
    walletCreatedAt: Date,
    settings: TipLike,
    chain: WithdrawChain,
    amount: number,
    user: {
        withdrawDailyUtcDay?: string | null;
        withdrawDailySol?: number | null;
        withdrawDailyEth?: number | null;
    },
): { ok: true } | { ok: false } {
    const freshDays = settings.withdrawFreshWalletDays ?? 7;
    if (!isFreshWallet(walletCreatedAt, freshDays)) return { ok: true };
    const limSol = settings.withdrawFreshDailyLimitSol ?? 0;
    const limEth = settings.withdrawFreshDailyLimitEth ?? 0;
    const { day, sol, eth } = getDailyWithdrawTotals(user);
    if (chain === "solana") {
        if (limSol <= 0) return { ok: true };
        if (sol + amount > limSol + 1e-12) return { ok: false };
    } else {
        if (limEth <= 0) return { ok: true };
        if (eth + amount > limEth + 1e-12) return { ok: false };
    }
    return { ok: true };
}

export async function applyWithdrawDailyAfterSuccess(
    userId: number,
    chain: WithdrawChain,
    amount: number,
): Promise<void> {
    const day = utcDayString();
    const u = await User.findOne({ userId });
    if (!u) return;
    let sol = Number((u as any).withdrawDailySol) || 0;
    let eth = Number((u as any).withdrawDailyEth) || 0;
    const storedDay = (u as any).withdrawDailyUtcDay || "";
    if (storedDay !== day) {
        sol = 0;
        eth = 0;
    }
    if (chain === "solana") sol += amount;
    else eth += amount;
    await User.updateOne(
        { userId },
        {
            $set: {
                withdrawDailyUtcDay: day,
                withdrawDailySol: sol,
                withdrawDailyEth: eth,
            },
        },
    );
}

export type RegisterWithdrawPinFailureResult = {
    lockedNow: boolean;
    /** Failed-attempt count after this increment (equals threshold when lockout applies). */
    attemptsThatTriggeredLockout: number;
    /** Lockout duration from admin settings (minutes). */
    lockoutMinutes: number;
};

export async function registerWithdrawPinFailure(
    userId: number,
    settings: { withdrawPinLockoutAttempts?: number; withdrawPinLockoutMinutes?: number },
): Promise<RegisterWithdrawPinFailureResult | null> {
    const maxAttempts = settings.withdrawPinLockoutAttempts ?? 3;
    const lockMins = settings.withdrawPinLockoutMinutes ?? 15;
    const u = await User.findOne({ userId });
    if (!u) return null;
    const n = (Number((u as any).withdrawPinFailures) || 0) + 1;
    const update: Record<string, unknown> = { withdrawPinFailures: n };
    let lockedNow = false;
    if (maxAttempts > 0 && n >= maxAttempts && lockMins > 0) {
        update.withdrawPinLockedUntil = new Date(Date.now() + lockMins * 60_000);
        update.withdrawPinFailures = 0;
        lockedNow = true;
        await SecurityLog.create({
            userId,
            type: "withdraw_lockout",
            detail: `${maxAttempts} failed PIN attempts`,
        });
    }
    await User.updateOne({ userId }, { $set: update });
    return { lockedNow, attemptsThatTriggeredLockout: n, lockoutMinutes: lockMins };
}

export async function resetWithdrawPinFailures(userId: number): Promise<void> {
    await User.updateOne({ userId }, { $set: { withdrawPinFailures: 0 } });
}

export async function clearPendingWithdraw(userId: number): Promise<void> {
    await User.updateOne({ userId }, { $unset: { pendingWithdraw: 1 }, $set: { pendingPinAction: "" } });
}
