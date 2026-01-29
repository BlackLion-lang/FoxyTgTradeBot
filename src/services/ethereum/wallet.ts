import { Wallet } from "ethers";
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
 * @param privateKey - The private key string (0x...)
 * @returns Object with publicKey (address) and secretKey (private key)
 */
export const walletFromPrvKey = (privateKey: string) => {
    try {
        const wallet = new Wallet(privateKey);
        return { publicKey: wallet.address, secretKey: privateKey };
    } catch (error) {
        throw new Error("Invalid private key");
    }
};

/**
 * Validates if a string is a valid Ethereum private key
 * @param privateKey - The private key string to validate
 * @returns true if valid, false otherwise
 */
export function isValidPrivateKey(privateKey: string): boolean {
    try {
        // Ethereum private keys should be 66 characters (0x + 64 hex chars)
        if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
            return false;
        }
        // Try to create a wallet from the private key
        const wallet = new Wallet(privateKey);
        return !!wallet.address;
    } catch (error) {
        return false;
    }
}

