import { Wallet } from "ethers";
import { ethereum_provider, public_ethereum_provider } from "../config/ethereum";

export function isEvmAddress(text: string): boolean {
    const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return evmAddressRegex.test(text);
}

export function capitalizeFirstLetter(word: string) {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function formatNumber(number: number): string {
    const formatter = new Intl.NumberFormat('en-US');
    return formatter.format(number);
}

export function formatNumberWithSuffix(number: number) {
    if (number >= 1e9) {
        return (number / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    } else if (number >= 1e6) {
        return (number / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (number >= 1e3) {
        return (number / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
        return number.toString();
    }
}

export async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function walletScanUrl(address: string) {
    return `https://etherscan.io/address/${address}`
}

export function walletScanTxUrl(hash: string) {
    return `https://etherscan.io/tx/${hash}`
}

export function walletDexscreenerUrl(address: string) {
    return `https://dexscreener.com/ethereum/${address}`
}

export function walletDextoolsUrl(address: string) {
    return `https://www.dextools.io/app/en/ether/pair-explorer/${address}`
}

export function walletDefinedUrl(address: string) {
    return `https://www.defined.fi/eth/${address}`
}
export const checkWallet_eth = new Wallet(process.env.CHECK_PRIVATE_KEY || '', public_ethereum_provider)

