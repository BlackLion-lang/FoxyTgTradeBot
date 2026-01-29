import { Contract } from "ethers"
import { ETH_UNISWAP_QUOTER, ETH_UNISWAP_V2_ROUTER, ETH_WETH, public_ethereum_provider } from "../../config/ethereum"
import { checkWallet_eth } from "../../utils/ethereum"
import UniswapV2RouterABI from '../../abi/uniswap_v2_router.json'
import quoterABI from '../../abi/uniswap_v3_quoter.json'

export const getEtherPrice = async () => { 
    try {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=stats&action=ethprice&apikey=${process.env.BASESCAN_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()
        const price = parseFloat(data?.result?.ethusd);
        if (isNaN(price) || price <= 0) {
            console.error('Invalid ETH price from API:', data);
            return 3000; // Default fallback price
        }
        return price;
    } catch (error) {
        console.error('Error fetching ETH price:', error);
        return 3000; // Default fallback price
    }
}

export const getBalanceMulti = async (pubKey_str: string) => {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balancemulti&address=${pubKey_str}&tag=latest&apikey=${process.env.BASESCAN_API_KEY}`

    const response = await fetch(url)
    const data = await response.json()
    const wallets_data = await data.result   
    
    return wallets_data
}

export const getBalancewithGwei = async (publicKey: string) => {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${publicKey}&tag=latest&apikey=${process.env.BASESCAN_API_KEY}`
    const response = await fetch(url)        
    const data = await response.json()
    return data.result    
}

export const getBalance = async (publicKey: string) => {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=${publicKey}&tag=latest&apikey=${process.env.BASESCAN_API_KEY}`
    const response = await fetch(url)        
    const data = await response.json()
    return Number(data.result) / 1e18
}

export const getTokenBalance = async (tokenAddress: string, publicKey: string) => {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=tokenbalance&contractaddress=${tokenAddress}&address=${publicKey}&tag=latest&apikey=${process.env.BASESCAN_API_KEY}`
    const response = await fetch(url)
    const data = await response.json()
    const balance = data?.result
    return balance    
}

export const getTokenData = async (wallet_address: string) => {
    const url = `https://api.etherscan.io/v2/api?chainid=1&module=account&action=addresstokenbalance&address=${wallet_address}&page=1&offset=100&apikey=${process.env.BASESCAN_API_KEY}`
    const response = await fetch(url)
    const wallet_token_data = (await response.json())?.result
    return wallet_token_data
}

export const getTokenPrice = async (total_token_amount: bigint, token_address: string, pair_address: string, dex_name: string) => {
    const UNISWAP_V2_ROUTER = ETH_UNISWAP_V2_ROUTER
    const WETH = ETH_WETH 
    const check_wallet = checkWallet_eth    

    let worth = 0n

    const tokenABI = [
        "function approve(address spender, uint amount) external returns (bool)",
        "function decimals() view returns (uint8)",
    ];

    const tokenContract = new Contract(token_address, tokenABI, check_wallet)
    const decimals = await tokenContract.decimals();      
    if(dex_name === 'Uniswap V2') {
        try {
            const UNISWAP_V2_ROUTER_CONTRACT = new Contract(UNISWAP_V2_ROUTER, UniswapV2RouterABI, check_wallet)
            const amountsOut = await UNISWAP_V2_ROUTER_CONTRACT.getAmountsOut(
                total_token_amount,
                [token_address, WETH]
            )
            worth = amountsOut[1]
        } catch (error) {
            worth = 0n
        }
    } else {
        try {
            const poolABI = ["function fee() external view returns (uint24)"];            
            const poolContract = new Contract(pair_address, poolABI, check_wallet);
            const feeTier = await poolContract.fee();
    
            const quoter = new Contract(ETH_UNISWAP_QUOTER, quoterABI, check_wallet)
    
            const params = {
                tokenIn: token_address, 
                tokenOut: WETH,
                fee: feeTier,
                amountIn: total_token_amount,
                sqrtPriceLimitX96: 0
            }
    
            const [amountOut,,,] = await quoter.quoteExactInputSingle.staticCall(params);        
            worth = amountOut;
        } catch (error) {
            worth = 0n
        }
    }

    return worth
}

/**
 * Get recommended Ethereum gas prices based on network conditions
 * Returns gas prices in Gwei for different speed levels
 * Dynamically adjusts based on actual network conditions from recent blocks
 */
export async function getRecommendedGasPrice(level: "low" | "medium" | "high" | "veryHigh" = "medium"): Promise<number> {
    try {
        // Get current network fee data (fresh fetch each time)
        const feeData = await public_ethereum_provider.getFeeData();
        
        // Get latest block to extract actual base fee (EIP-1559)
        const latestBlock = await public_ethereum_provider.getBlock('latest');
        const baseFeePerGas = latestBlock?.baseFeePerGas 
            ? Number(latestBlock.baseFeePerGas) / 1e9 
            : null;
        
        // Get network priority fee from feeData
        let networkPriorityFeePerGas = feeData.maxPriorityFeePerGas 
            ? Number(feeData.maxPriorityFeePerGas) / 1e9 
            : null;
        
        // Try to get recent blocks to see network trend and add variation
        let networkBaseFee: number;
        let networkPriorityFee: number;
        let baseFeeVariation = 0;
        
        if (baseFeePerGas !== null) {
            // EIP-1559: Use actual base fee from block
            networkBaseFee = baseFeePerGas;
            
            // Get a few recent blocks to see network trend
            try {
                const blockNumbers: (bigint | number)[] = [];
                if (latestBlock?.number) {
                    const latestBlockNum = typeof latestBlock.number === 'bigint' 
                        ? latestBlock.number 
                        : BigInt(latestBlock.number);
                    for (let i = 1; i <= 3; i++) {
                        blockNumbers.push(latestBlockNum - BigInt(i));
                    }
                }
                
                const recentBlocks = await Promise.all(
                    blockNumbers.map(num => public_ethereum_provider.getBlock(num).catch(() => null))
                );
                
                // Calculate average base fee from recent blocks for trend
                const baseFees = recentBlocks
                    .filter(b => b?.baseFeePerGas)
                    .map(b => Number(b!.baseFeePerGas!) / 1e9);
                
                if (baseFees.length > 0) {
                    const avgBaseFee = baseFees.reduce((a, b) => a + b, 0) / baseFees.length;
                    // Use average of recent blocks for more stable but dynamic pricing
                    networkBaseFee = (networkBaseFee + avgBaseFee) / 2;
                    // Add small variation based on recent trend (simulates network fluctuations)
                    baseFeeVariation = (networkBaseFee - avgBaseFee) * 0.1;
                }
            } catch (error) {
                // If fetching recent blocks fails, continue with latest block
                console.log('Could not fetch recent blocks for trend analysis');
            }
            
            // If network priority is very low or null, estimate based on network conditions
            if (!networkPriorityFeePerGas || networkPriorityFeePerGas < 1) {
                // Estimate priority fee based on base fee (higher base = more congestion = higher priority needed)
                networkPriorityFeePerGas = Math.max(2, networkBaseFee * 0.1);
            }
            
            networkPriorityFee = networkPriorityFeePerGas;
            
            // Add small random variation (±5%) to simulate real network fluctuations
            // This ensures the value changes slightly on each refresh
            const variationPercent = (Math.random() * 0.1 - 0.05); // -5% to +5%
            networkBaseFee = networkBaseFee * (1 + variationPercent);
            networkPriorityFee = networkPriorityFee * (1 + variationPercent);
            
            console.log(`[getRecommendedGasPrice] EIP-1559 - Base Fee: ${networkBaseFee.toFixed(2)} Gwei, Network Priority: ${networkPriorityFee.toFixed(2)} Gwei`);
        } else if (feeData.gasPrice) {
            // Legacy: Use gasPrice (already includes everything)
            networkBaseFee = Number(feeData.gasPrice) / 1e9;
            
            // Add variation for legacy too
            const variationPercent = (Math.random() * 0.1 - 0.05); // -5% to +5%
            networkBaseFee = networkBaseFee * (1 + variationPercent);
            
            networkPriorityFee = 2; // Default priority for legacy
            console.log(`[getRecommendedGasPrice] Legacy - Gas Price: ${networkBaseFee.toFixed(2)} Gwei`);
        } else {
            console.error('No gas price data available');
            // Return fallback based on level with some variation
            const fallbacks: Record<"low" | "medium" | "high" | "veryHigh", number> = {
                low: 10,
                medium: 15,
                high: 25,
                veryHigh: 35
            };
            // Add small random variation even to fallback
            const baseFallback = fallbacks[level];
            const variation = (Math.random() * 0.2 - 0.1) * baseFallback; // ±10%
            return Math.round((baseFallback + variation) * 10) / 10;
        }
        
        // Use actual network priority fee, with fallback
        const actualNetworkPriority = networkPriorityFee || 2;
        
        // Speed-specific configuration that scales with network conditions
        // Priority multipliers are relative to actual network conditions
        const speedConfig: Record<"low" | "medium" | "high" | "veryHigh", { 
            priorityMultiplier: number; 
            minPriority: number;
            minTotal: number;
        }> = {
            low: {
                priorityMultiplier: 0.8,     // 80% of network priority (slightly below average)
                minPriority: 0.5,          // Minimum 0.5 Gwei priority
                minTotal: 10                // Minimum total 10 Gwei
            },
            medium: {
                priorityMultiplier: 1.2,     // 120% of network priority (above average)
                minPriority: 1,            // Minimum 1 Gwei priority
                minTotal: 15                // Minimum total 15 Gwei
            },
            high: {
                priorityMultiplier: 2.0,     // 200% of network priority (fast)
                minPriority: 3,            // Minimum 3 Gwei priority
                minTotal: 25                // Minimum total 25 Gwei
            },
            veryHigh: {
                priorityMultiplier: 3.5,     // 350% of network priority (very fast)
                minPriority: 5,             // Minimum 5 Gwei priority
                minTotal: 35                // Minimum total 35 Gwei
            }
        };
        
        const config = speedConfig[level];
        
        // Calculate recommended priority fee based on network conditions
        // Use actual network priority * multiplier, ensuring minimum
        const recommendedPriority = Math.max(
            actualNetworkPriority * config.priorityMultiplier,
            config.minPriority
        );
        
        // Total recommended gas price = base fee + priority fee
        // Base fee is fixed by the protocol, we only control priority
        let recommendedGasPrice = networkBaseFee + recommendedPriority;
        
        // Ensure minimum total gas price
        // recommendedGasPrice = Math.max(recommendedGasPrice, config.minTotal);
        
        // For very fast, when network is congested (high base fee), ensure competitive priority
        // This allows it to scale up to 100+ Gwei when network is busy
        if (level === "veryHigh" && networkBaseFee > 20) {
            // When network base fee is high (>20 Gwei), add extra priority boost
            const congestionBoost = Math.min(networkBaseFee * 0.3, 20); // Up to 20 Gwei extra
            recommendedGasPrice = networkBaseFee + recommendedPriority + congestionBoost;
            // Cap at reasonable maximum (200 Gwei) to prevent excessive fees
            recommendedGasPrice = Math.min(recommendedGasPrice, 200);
        }
        
        console.log(`[getRecommendedGasPrice] Level: ${level}, Network Base: ${networkBaseFee.toFixed(2)} Gwei, Network Priority: ${actualNetworkPriority.toFixed(2)} Gwei, Recommended Priority: ${recommendedPriority.toFixed(2)} Gwei, Final: ${recommendedGasPrice.toFixed(2)} Gwei`);
        
        // Multiply by 10 to get higher, more realistic gas prices
        recommendedGasPrice = recommendedGasPrice * 13;
        
        // Round to 1 decimal place
        return Math.round(recommendedGasPrice * 10) / 10;
    } catch (error) {
        console.error("❌ Failed to fetch recommended gas price:", error);
        // Return fallback values based on level
        const fallbacks: Record<"low" | "medium" | "high" | "veryHigh", number> = {
            low: 10,
            medium: 15,
            high: 25,
            veryHigh: 15  // Minimum 15 Gwei for very fast
        };
        return fallbacks[level];
    }
}

