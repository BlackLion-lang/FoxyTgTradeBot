// Use require to avoid TypeScript compilation issues
const { Contract } = require("ethers");
import { public_ethereum_provider } from "../../config/ethereum";

// Get raw token balance as bigint (for swaps)
export const getTokenBalanceRaw = async (token_address: string, publicKey: string): Promise<bigint> => {
    try {
        const provider = public_ethereum_provider;
        const erc20Abi = [
            "function balanceOf(address owner) view returns (uint256)",
        ];
        const tokenContract = new Contract(token_address, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(publicKey);
        return balance;
    } catch (error) {
        console.error("Error getting raw token balance:", error);
        return 0n;
    }
};

// Get human-readable token balance as number
export const getTokenBalancWithContract = async (token_address: string, publicKey: string) => {
    try {
        const provider = public_ethereum_provider;
        const erc20Abi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];
        const tokenContract = new Contract(token_address, erc20Abi, provider);
        const balance = await tokenContract.balanceOf(publicKey);
        const decimals = await tokenContract.decimals();
        return Number(balance) / (10 ** Number(decimals));
    } catch (error) {
        console.error("Error getting token balance:", error);
        return 0;
    }
};

export const getEthereumBalanceContract = async (
    publicKey: string
): Promise<number> => {
    try {
        const provider = public_ethereum_provider;
        const balance = await provider.getBalance(publicKey);
        return (Number(balance) / 1e18);
    } catch (error) {
        console.error("Error getting ETH balance:", error);
        return 0;
    }
};
