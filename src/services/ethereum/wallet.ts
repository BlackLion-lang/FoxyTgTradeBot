import { Wallet } from '@ethersproject/wallet';
import { encryptSecretKey } from "../../config/security";

/**
 * Creates a new Ethereum wallet
 * @returns Object with publicKey (address) and encrypted secretKey (private key)
 */
export const walletCreate = () => {
    const newWallet = Wallet.createRandom();
    const secretKey = encryptSecretKey(newWallet.privateKey);
    return { publicKey: newWallet.address, secretKey };
};

/**
 * Creates a wallet from a private key
 * @param privateKey - The private key string (0x... or without 0x)
 * @returns Object with publicKey (address) and secretKey (normalized private key)
 */
export const walletFromPrvKey = (privateKey: string) => {
    try {
        if (!privateKey || typeof privateKey !== 'string') {
            throw new Error("Invalid private key: empty or not a string");
        }
        
        // Trim whitespace
        const trimmed = privateKey.trim();
        
        // Normalize: add 0x prefix if missing
        let normalized: string;
        if (trimmed.startsWith('0x')) {
            normalized = trimmed;
        } else {
            // If no 0x prefix, add it (should be 64 hex chars)
            if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
                normalized = '0x' + trimmed;
            } else {
                throw new Error("Invalid private key format");
            }
        }
        
        // Validate length
        if (normalized.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
            throw new Error("Invalid private key: wrong length or format");
        }
        
        const wallet = new Wallet(normalized);
        return { publicKey: wallet.address, secretKey: normalized };
    } catch (error: any) {
        throw new Error(`Invalid private key: ${error.message || 'Failed to create wallet'}`);
    }
};

/**
 * Validates if a string is a valid Ethereum private key
 * @param privateKey - The private key string to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
    try {
        if (!privateKey || typeof privateKey !== 'string') {
            return false;
        }
        
        // Trim whitespace
        const trimmed = privateKey.trim();
        
        // Normalize: add 0x prefix if missing, ensure it's 66 chars total
        let normalized: string;
        if (trimmed.startsWith('0x')) {
            normalized = trimmed;
        } else {
            // If no 0x prefix, add it (should be 64 hex chars)
            if (trimmed.length === 64 && /^[0-9a-fA-F]{64}$/.test(trimmed)) {
                normalized = '0x' + trimmed;
            } else {
                return false;
            }
        }
        
        // Ethereum private keys should be 66 characters (0x + 64 hex chars)
        if (normalized.length !== 66 || !/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
            return false;
        }
        
        // Try to create a wallet from the private key to validate it
        const wallet = new Wallet(normalized);
        return !!wallet.address;
    } catch (error) {
        return false;
    }
}

