// Use require to avoid TypeScript compilation issues
const { Contract } = require("ethers");
import { capitalizeFirstLetter, checkWallet_eth } from "../../utils/ethereum";
import { Token } from "../../models/token";

export const getPairInfo = async (pairAddress: string) => {
    const url = `https://api.dexscreener.com/latest/dex/pairs/ethereum/${pairAddress}`;

    const response = await fetch(url);
    const data = await response.json();
    return data?.pairs[0];
};

export const getPairInfoWithTokenAddress = async (tokenAddress: string) => {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
    const data = await response.json();
    let pairInfo;
    if(data.pairs) {
        const pairFilters = data.pairs.find((pair:any) => pair.chainId === 'ethereum');
        if(pairFilters) pairInfo = pairFilters;
    }    
    return pairInfo;
};

export const newTokenRegistered = async (tokenAddress: string) => {
    try {
        const newToken = new Token();
        const pairInfo = await getPairInfoWithTokenAddress(tokenAddress);
        if(pairInfo) {
            const label = pairInfo?.labels ? pairInfo?.labels[0] : '';
            const dex = `${capitalizeFirstLetter(pairInfo?.dexId)} ${capitalizeFirstLetter(label)}`;
            newToken.address = tokenAddress;
            newToken.dex_name = dex;
            const ERC20_ABI = [
                "function transfer(address to, uint256 amount) public returns (bool)",
                "function decimals() view returns (uint8)",
            ];            
            const tokenContract = new Contract(tokenAddress, ERC20_ABI, checkWallet_eth);
            const decimals = Number(await tokenContract.decimals()) || 18;

            if(pairInfo?.liquidity?.usd > 5) {
                newToken.decimal = decimals;
                newToken.pairAddress = pairInfo?.pairAddress;
                newToken.name = pairInfo?.baseToken?.name;
                newToken.symbol = pairInfo?.baseToken?.symbol;
                newToken.priceChange = pairInfo?.priceChange?.h24;
                newToken.liquidity = pairInfo?.liquidity?.usd;
                newToken.market_cap = pairInfo?.marketCap;
                newToken.initial_priceUsd = pairInfo?.priceUsd;
                newToken.initial_price = pairInfo?.priceNative;        
                newToken.priceUsd = pairInfo?.priceUsd;
                newToken.price = pairInfo?.priceNative;
                newToken.createdTime = pairInfo?.pairCreatedAt;
                newToken.chain = 1; // Ethereum only
            }
            await newToken.save();   
            return newToken; 
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error registering new token:", error);
        return null;
    }
};

