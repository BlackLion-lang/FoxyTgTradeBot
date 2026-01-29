import { User } from "../models/user";

/**
 * Get user's selected chain
 * @param userId - Telegram user ID
 * @returns "solana" or "ethereum"
 */
export async function getUserChain(userId: number): Promise<"solana" | "ethereum"> {
    const user = await User.findOne({ userId });
    if (!user) {
        // Default to solana for new users
        return "solana";
    }
    return (user.chain || "solana") as "solana" | "ethereum";
}

/**
 * Check if user is on Ethereum chain
 * @param userId - Telegram user ID
 * @returns true if user is on Ethereum, false if Solana
 */
export async function isEthereumChain(userId: number): Promise<boolean> {
    const chain = await getUserChain(userId);
    return chain === "ethereum";
}

/**
 * Check if user is on Solana chain
 * @param userId - Telegram user ID
 * @returns true if user is on Solana, false if Ethereum
 */
export async function isSolanaChain(userId: number): Promise<boolean> {
    const chain = await getUserChain(userId);
    return chain === "solana";
}

