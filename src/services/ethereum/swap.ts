import TelegramBot from "node-telegram-bot-api"
import { Contract, ethers, MaxUint256, Wallet } from "ethers"
import { 
    ETH_UNISWAP_QUOTER, 
    ETH_UNISWAP_V2_ROUTER, 
    ETH_UNISWAP_V3_ROUTER, 
    ETH_SWAP_ROUTER,
    ETH_WETH, 
    // ethereum_provider,
    public_ethereum_provider
} from "../../config/ethereum"
import UniswapV2RouterABI from '../../abi/uniswap_v2_router.json'
import quoterABI from '../../abi/uniswap_v3_quoter.json'
import BaseswapRouterABI from '../../abi/base_swap.json'
import { User } from '../../models/user'
import { Token } from '../../models/token'
import { walletScanTxUrl, walletScanUrl, walletDexscreenerUrl } from '../../utils/ethereum'
import { getBalance, getEtherPrice, getRecommendedGasPrice } from './etherscan'
import { getTokenBalancWithContract } from './contract'
import { decryptSecretKey } from '../../config/security'
import { t } from '../../locales'
import { formatNumberStyle } from '../other'
import { getPairInfoWithTokenAddress } from './dexscreener'
import { TippingSettings } from '../../models/tipSettings'

interface swapInterface {
    index: number,
    amount: bigint,
    token_address: string,
    pair_address: string,
    slippage: bigint,
    gas_amount: number,
    secretKey: string,
    deadline: number,
    dexId: string,
    userId?: number // Optional userId for error message translation
}

export const swapExactETHForTokensUsingUniswapV2_ = async (params: swapInterface) => {
    try {
        const { index, amount, token_address, pair_address, slippage, gas_amount, dexId, secretKey, deadline, userId } = params
        console.log('Buying params', index, amount, token_address, pair_address, slippage, gas_amount, dexId, secretKey, deadline)
        const provider = public_ethereum_provider
        const currentBlock = await provider.getBlock('latest')
        const UNISWAP_V2_ROUTER = ETH_UNISWAP_V2_ROUTER
        const UNISWAP_V3_ROUTER = ETH_UNISWAP_V3_ROUTER
        const WETH = ETH_WETH
        
        const wallet = new Wallet(secretKey, provider)
        
        // Get current network gas price dynamically with EIP-1559 support
        let networkGasPrice: bigint;
        let maxFeePerGas: bigint | null = null;
        let maxPriorityFeePerGas: bigint | null = null;
        let baseFeePerGas: bigint | null = null;
        
        try {
            const feeData = await provider.getFeeData();
            const latestBlock = await provider.getBlock('latest');
            baseFeePerGas = latestBlock?.baseFeePerGas || null;
            
            // For EIP-1559, use maxFeePerGas; for legacy, use gasPrice
            if (feeData.maxFeePerGas) {
                maxFeePerGas = feeData.maxFeePerGas;
                maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 2n * 10n ** 9n; // 2 Gwei default
                networkGasPrice = maxFeePerGas; // Use maxFeePerGas as network price
                console.log(`EIP-1559 - Base Fee: ${baseFeePerGas ? ethers.formatUnits(baseFeePerGas, 'gwei') : 'N/A'} Gwei, Max Fee: ${ethers.formatUnits(maxFeePerGas, 'gwei')} Gwei, Priority: ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} Gwei`);
            } else {
                networkGasPrice = feeData.gasPrice || ethers.parseUnits(`${gas_amount}`, 'gwei');
                console.log(`Legacy - Gas Price: ${ethers.formatUnits(networkGasPrice, 'gwei')} Gwei`);
            }
        } catch (error) {
            console.warn('Failed to fetch network gas price, using user setting:', error);
            networkGasPrice = ethers.parseUnits(`${gas_amount}`, 'gwei');
        }
        
        // Calculate final gas price ensuring it's above base fee for EIP-1559
        const userGasPrice = ethers.parseUnits(`${gas_amount}`, 'gwei');
        let finalGasPrice = networkGasPrice < userGasPrice ? networkGasPrice : userGasPrice;
        
        // For EIP-1559, ensure maxFeePerGas is at least baseFee + priorityFee
        if (baseFeePerGas && maxFeePerGas) {
            const minRequiredFee = baseFeePerGas + (maxPriorityFeePerGas || 2n * 10n ** 9n);
            if (finalGasPrice < minRequiredFee) {
                finalGasPrice = minRequiredFee;
                console.log(`Gas price adjusted to meet EIP-1559 requirements: ${ethers.formatUnits(finalGasPrice, 'gwei')} Gwei (base: ${ethers.formatUnits(baseFeePerGas, 'gwei')} + priority: ${ethers.formatUnits(maxPriorityFeePerGas || 2n * 10n ** 9n, 'gwei')})`);
            }
            // Update maxFeePerGas to ensure it's sufficient
            maxFeePerGas = finalGasPrice;
        }
        
        const gasPrice = finalGasPrice;
        
        console.log(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (network: ${ethers.formatUnits(networkGasPrice, 'gwei')}, user: ${gas_amount})`);
        
        const walletBalance = await provider.getBalance(wallet.address)
        
        // Use conservative gas limit for balance check
        // Based on typical Uniswap V2 swaps using ~153k gas, use 158k for safety
        // This ensures balance check accounts for actual transaction costs
        const gasLimitForCheck = 158000n // 158k to cover typical 153k + small buffer
        const estimatedGasCost = gasPrice * gasLimitForCheck
        const totalRequired = amount + estimatedGasCost
        
        if (walletBalance < totalRequired) {
            const balanceEth = Number(walletBalance) / 1e18
            const requiredEth = Number(totalRequired) / 1e18
            const shortfallEth = Number(totalRequired - walletBalance) / 1e18
            const swapAmountEth = (Number(amount) / 1e18).toFixed(6)
            const gasAmountEth = (Number(estimatedGasCost) / 1e18).toFixed(6)
            
            // Format error message with translation
            const translated = await t('errors.insufficientFundsForSwap', userId);
            const errorMessage = translated
                .replace('{required}', requiredEth.toFixed(6))
                .replace('{swapAmount}', swapAmountEth)
                .replace('{gasAmount}', gasAmountEth)
                .replace('{available}', balanceEth.toFixed(6))
                .replace('{shortfall}', shortfallEth.toFixed(6));
            throw new Error(errorMessage);
        }
        
        const tokenABI = [
            "function approve(address spender, uint amount) external returns (bool)",
            "function decimals() view returns (uint8)",
        ];

        const tokenContract = new Contract(token_address, tokenABI, wallet)
        const decimals = await tokenContract.decimals();  

        let expectedAmountOut = 0n
        let amountOutMin = 0n
        let feeTier = 0n

        // Calculate realBuyAmount: 90% of amount, but ensure it's never negative
        // For small amounts, use a smaller deduction or skip it
        const ninetyPercent = amount * 90n / 100n
        const deduction = 4n * (10n ** 14n) // 0.0004 ETH
        const realBuyAmount = ninetyPercent > deduction ? ninetyPercent - deduction : ninetyPercent

        if(dexId === 'Uniswap V2') {
            const UNISWAP_V2_ROUTER_CONTRACT = new Contract(UNISWAP_V2_ROUTER, UniswapV2RouterABI, wallet)
            const amountsOut = await UNISWAP_V2_ROUTER_CONTRACT.getAmountsOut(
                BigInt(realBuyAmount),
                [WETH, token_address]
            )
            expectedAmountOut = amountsOut[1]; // The expected token output
            amountOutMin = expectedAmountOut - expectedAmountOut * slippage / BigInt(1e7);  
        }
        else {
            const poolABI = ["function fee() external view returns (uint24)"]; 
            const poolContract = new ethers.Contract(pair_address, poolABI, wallet);
            feeTier = await poolContract.fee();
            
            const quoter = new ethers.Contract(ETH_UNISWAP_QUOTER, quoterABI, wallet)

            const params = {
                tokenIn: WETH, 
                tokenOut: token_address,
                fee: feeTier,
                amountIn: realBuyAmount, 
                sqrtPriceLimitX96: 0
            }            

            const [amountOut,,,] = await quoter.quoteExactInputSingle.staticCall(params);
            expectedAmountOut = amountOut; // The expected token output
            amountOutMin = expectedAmountOut - expectedAmountOut * slippage / BigInt(1e7);  
        }   
        
        // Use ETH_SWAP_ROUTER instead of direct Uniswap router
        const routerContract = new Contract(ETH_SWAP_ROUTER, BaseswapRouterABI, wallet)
        
        // Referral address (zero address if not provided)
        const ref_address = '0x0000000000000000000000000000000000000000'
        
        console.log('Buy Params', gas_amount, ethers.parseUnits(`${gas_amount}`, 'gwei'), amountOutMin,
            feeTier,
            [WETH, token_address], // Path: ETH -> Token
            dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
            wallet.address, // Recipient address
            ref_address)  
        try {
            // Prepare simulation options with EIP-1559 support
            const simTxOptions: any = {
                value: amount,
                gasLimit: 500000
            };
            
            // Use EIP-1559 if available, otherwise use legacy gasPrice
            if (maxFeePerGas && maxPriorityFeePerGas) {
                simTxOptions.maxFeePerGas = maxFeePerGas;
                simTxOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
                simTxOptions.gasPrice = gasPrice;
            }
            
            // Use BaseBuy method from swap router
            const simulationTx = await routerContract.BaseBuy.staticCall(
                amountOutMin,
                feeTier,
                [WETH, token_address], // Path: ETH -> Token
                dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
                wallet.address, // Recipient address
                ref_address,
                simTxOptions
            )
            
            // Use fixed gas limit for swap router (500k as per reference)
            const gasLimit = 500000;
            
            // Prepare transaction options with EIP-1559 support
            const txOptions: any = {
                value: amount,
                gasLimit: gasLimit
            };
            
            // Use EIP-1559 if available, otherwise use legacy gasPrice
            if (maxFeePerGas && maxPriorityFeePerGas) {
                txOptions.maxFeePerGas = maxFeePerGas;
                txOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
                txOptions.gasPrice = gasPrice;
            }
            
            const tx = await routerContract.BaseBuy(
                0n, // Use 0n for amountOutMin in actual call (as per reference)
                feeTier,
                [WETH, token_address], // Path: ETH -> Token
                dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
                wallet.address, // Recipient address
                ref_address,
                txOptions
            )            
            const receipt = await tx.wait();
            const hash = (await receipt)?.hash    
            
            // Log gas efficiency
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = receipt.gasPrice || gasPrice;
            const feeWei = gasUsed * actualGasPrice;
            const feeEth = Number(feeWei) / 1e18;
            console.log(`✅ Transaction confirmed: ${walletScanTxUrl(hash)}`);
            console.log(`Gas used: ${gasUsed.toString()} / ${gasLimit} (${((Number(gasUsed) / gasLimit) * 100).toFixed(1)}% of limit)`);
            console.log(`Transaction fee: ${feeEth.toFixed(6)} ETH (${ethers.formatUnits(actualGasPrice, 'gwei')} Gwei × ${gasUsed.toString()} gas)`);
    
            // Return only necessary data, not a formatted message
            return {
                success: true,
                hash: hash,
                blockNumber: receipt.blockNumber,
                gasPrice: actualGasPrice,
                amount: amount
            }            
        } catch (error: any) {
            console.error('Simulation Buy Transaction Error', error)
            // Preserve the original error message if it's an Error object
            if (error instanceof Error) {
                throw error
            }
            throw new Error(error?.message || error?.toString() || "Transaction Error")
        }
    } catch (error) {
        console.error('error', error)       
        throw error
    }
}

export const swapExactTokenForETHUsingUniswapV2_ = async (params: swapInterface) => {
    try {
        const { index, amount, token_address, pair_address, slippage, gas_amount, dexId, secretKey, deadline } = params
        console.log('Selling params', index, amount, token_address, pair_address, slippage, gas_amount, dexId, secretKey, deadline)
        const provider = public_ethereum_provider
        const currentBlock = await provider.getBlock('latest')
        const UNISWAP_V2_ROUTER = ETH_UNISWAP_V2_ROUTER
        const UNISWAP_V3_ROUTER = ETH_UNISWAP_V3_ROUTER
        const WETH = ETH_WETH

        const wallet = new Wallet(secretKey, provider)
        
        // Get current network gas price dynamically with EIP-1559 support
        let networkGasPrice: bigint;
        let maxFeePerGas: bigint | null = null;
        let maxPriorityFeePerGas: bigint | null = null;
        let baseFeePerGas: bigint | null = null;
        
        try {
            const feeData = await provider.getFeeData();
            const latestBlock = await provider.getBlock('latest');
            baseFeePerGas = latestBlock?.baseFeePerGas || null;
            
            // For EIP-1559, use maxFeePerGas; for legacy, use gasPrice
            if (feeData.maxFeePerGas) {
                maxFeePerGas = feeData.maxFeePerGas;
                maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || 2n * 10n ** 9n; // 2 Gwei default
                networkGasPrice = maxFeePerGas; // Use maxFeePerGas as network price
                console.log(`EIP-1559 - Base Fee: ${baseFeePerGas ? ethers.formatUnits(baseFeePerGas, 'gwei') : 'N/A'} Gwei, Max Fee: ${ethers.formatUnits(maxFeePerGas, 'gwei')} Gwei, Priority: ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} Gwei`);
            } else {
                networkGasPrice = feeData.gasPrice || ethers.parseUnits(`${gas_amount}`, 'gwei');
                console.log(`Legacy - Gas Price: ${ethers.formatUnits(networkGasPrice, 'gwei')} Gwei`);
            }
        } catch (error) {
            console.warn('Failed to fetch network gas price, using user setting:', error);
            networkGasPrice = ethers.parseUnits(`${gas_amount}`, 'gwei');
        }
        
        // Calculate final gas price ensuring it's above base fee for EIP-1559
        const userGasPrice = ethers.parseUnits(`${gas_amount}`, 'gwei');
        let finalGasPrice = networkGasPrice < userGasPrice ? networkGasPrice : userGasPrice;
        
        // For EIP-1559, ensure maxFeePerGas is at least baseFee + priorityFee
        if (baseFeePerGas && maxFeePerGas) {
            const minRequiredFee = baseFeePerGas + (maxPriorityFeePerGas || 2n * 10n ** 9n);
            if (finalGasPrice < minRequiredFee) {
                finalGasPrice = minRequiredFee;
                console.log(`Gas price adjusted to meet EIP-1559 requirements: ${ethers.formatUnits(finalGasPrice, 'gwei')} Gwei (base: ${ethers.formatUnits(baseFeePerGas, 'gwei')} + priority: ${ethers.formatUnits(maxPriorityFeePerGas || 2n * 10n ** 9n, 'gwei')})`);
            }
            // Update maxFeePerGas to ensure it's sufficient
            maxFeePerGas = finalGasPrice;
        }
        
        const gasPrice = finalGasPrice;
        
        console.log(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei (network: ${ethers.formatUnits(networkGasPrice, 'gwei')}, user: ${gas_amount})`);
        
        // Check wallet balance for gas fees (sell doesn't require ETH for swap, only gas)
        const walletBalance = await provider.getBalance(wallet.address)
        // Use conservative gas limit for balance check (~153k is typical for Uniswap V2 swaps)
        const gasLimitForCheck = 158000n // 158k to cover typical 153k + small buffer
        const estimatedGasCost = gasPrice * gasLimitForCheck
        
        if (walletBalance < estimatedGasCost) {
            const balanceEth = Number(walletBalance) / 1e18
            const requiredEth = Number(estimatedGasCost) / 1e18
            const shortfallEth = Number(estimatedGasCost - walletBalance) / 1e18
            
            // Format error message with translation
                const translated = await t('errors.insufficientFundsForGas', params.userId);
            const errorMessage = translated
                    .replace('{required}', requiredEth.toFixed(6))
                    .replace('{available}', balanceEth.toFixed(6))
                    .replace('{shortfall}', shortfallEth.toFixed(6));
            throw new Error(errorMessage);
        }

        const tokenABI = [
            "function approve(address spender, uint amount) external returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function transfer(address to, uint256 amount) public returns (bool)"
        ];
        const tokenContract = new Contract(token_address, tokenABI, wallet)
        const decimals = await tokenContract.decimals()
        
        // Validate amount
        if (!amount || amount === 0n) {
            throw new Error('Invalid token amount: amount must be greater than 0')
        }
        
        // Check token balance first and adjust amount if needed (handles precision issues)
        const currentTokenBalance = await tokenContract.balanceOf(wallet.address);
        let actualAmount = amount;
        
        if (currentTokenBalance < amount) {
            // Check if the difference is small (likely a precision issue)
            const difference = amount - currentTokenBalance;
            const differencePercent = Number(difference) / Number(amount);
            
            // If difference is less than 0.1% (precision issue), use actual balance
            if (differencePercent < 0.001) {
                console.log(`⚠️ Requested amount (${amount.toString()}) slightly exceeds balance (${currentTokenBalance.toString()}). Using actual balance due to precision difference.`);
                actualAmount = currentTokenBalance;
            } else {
                throw new Error(`Insufficient token balance. Required: ${amount.toString()}, Available: ${currentTokenBalance.toString()}`)
            }
        }
        
        // Validate actual amount
        if (!actualAmount || actualAmount === 0n) {
            throw new Error('Invalid amount: cannot be 0')
        }
        
        let amountOutMin = 0n;
        let expectedAmountOut = 0n;
        let feeTier = 0n;

        // Recalculate amounts using actualAmount (in case it was adjusted)
        if(dexId === 'Uniswap V2') {
            const UNISWAP_V2_ROUTER_CONTRACT = new Contract(UNISWAP_V2_ROUTER, UniswapV2RouterABI, wallet)            
            const amountsOut = await UNISWAP_V2_ROUTER_CONTRACT.getAmountsOut(actualAmount, [token_address, WETH]);
            expectedAmountOut = amountsOut[1];
            
            if (!expectedAmountOut || expectedAmountOut === 0n) {
                throw new Error('Invalid swap: expected output amount is 0. Token may have no liquidity.')
            }
            
            amountOutMin = expectedAmountOut - expectedAmountOut * slippage / BigInt(1e7);
            
            if (amountOutMin <= 0n) {
                throw new Error('Invalid slippage: minimum output amount would be 0 or negative. Try reducing slippage tolerance.')
            }
        }
        else {
            const poolABI = ["function fee() external view returns (uint24)"];            
            const poolContract = new ethers.Contract(pair_address, poolABI, wallet);
            feeTier = await poolContract.fee();
        
            const quoter = new ethers.Contract(ETH_UNISWAP_QUOTER, quoterABI, wallet)

            const params = {
                tokenIn: token_address, 
                tokenOut: WETH,
                fee: feeTier,
                amountIn: actualAmount, 
                sqrtPriceLimitX96: 0
            }

            const [amountOut,,,] = await quoter.quoteExactInputSingle.staticCall(params);        
            expectedAmountOut = amountOut; // The expected token output
            amountOutMin = expectedAmountOut - expectedAmountOut * slippage / BigInt(1e7);    
        }        

        // Use ETH_SWAP_ROUTER instead of direct Uniswap router
        const routerContract = new Contract(ETH_SWAP_ROUTER, BaseswapRouterABI, wallet)
        
        // Referral address (zero address if not provided)
        const ref_address = '0x0000000000000000000000000000000000000000'
        
        // Approve token spending for swap router (use actualAmount)
        const allowance = await tokenContract.allowance(wallet.address, ETH_SWAP_ROUTER);
        if(allowance < actualAmount) {
            console.log('approve started...')
            const approve_tx = await tokenContract.approve(ETH_SWAP_ROUTER, MaxUint256);
            await approve_tx.wait()
            console.log('approve confirmed...')
        }
        
        // Double-check allowance after approval
        const finalAllowance = await tokenContract.allowance(wallet.address, ETH_SWAP_ROUTER);
        if (finalAllowance < actualAmount) {
            throw new Error(`Insufficient token allowance. Required: ${actualAmount.toString()}, Available: ${finalAllowance.toString()}`)
        }
        
        console.log(actualAmount,
            amountOutMin, // Accept any amount of ETH
            feeTier,
            [token_address, WETH], // Path: Token -> WETH
            dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
            wallet.address, // Recipient address
            ref_address, gas_amount)
        try {
            // Prepare transaction options with EIP-1559 support for simulation
            const simTxOptions: any = {
                gasLimit: 500000
            };
            
            // Use EIP-1559 if available, otherwise use legacy gasPrice
            if (maxFeePerGas && maxPriorityFeePerGas) {
                simTxOptions.maxFeePerGas = maxFeePerGas;
                simTxOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
                simTxOptions.gasPrice = gasPrice;
            }
            
            // Use BaseSell_1 method from swap router
            const simulationTx = await routerContract.BaseSell_1.staticCall(
                actualAmount,
                amountOutMin, // Accept any amount of ETH
                feeTier,
                [token_address, WETH], // Path: Token -> WETH
                dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
                wallet.address, // Recipient address
                ref_address,
                simTxOptions
            )
            console.log('Simulation successful, proceeding with transaction...')
            
            // Use fixed gas limit for swap router (500k as per reference)
            const gasLimit = 500000;
            
            console.log('Sending transaction with params:', {
                amount: actualAmount.toString(),
                amountOutMin: amountOutMin.toString(),
                path: [token_address, WETH],
                to: wallet.address,
                gasLimit: gasLimit,
                gasPrice: `${ethers.formatUnits(gasPrice, 'gwei')} gwei`
            })
            
            // Prepare transaction options with EIP-1559 support
            const txOptions: any = {
                gasLimit: gasLimit
            };
            
            // Use EIP-1559 if available, otherwise use legacy gasPrice
            if (maxFeePerGas && maxPriorityFeePerGas) {
                txOptions.maxFeePerGas = maxFeePerGas;
                txOptions.maxPriorityFeePerGas = maxPriorityFeePerGas;
            } else {
                txOptions.gasPrice = gasPrice;
            }
            
            const tx = await routerContract.BaseSell_1(
                actualAmount,
                0n, // Use 0n for amountOutMin in actual call (as per reference)
                feeTier,
                [token_address, WETH], // Path: Token -> WETH
                dexId === 'Uniswap V3' ? UNISWAP_V3_ROUTER : UNISWAP_V2_ROUTER,
                wallet.address, // Recipient address
                ref_address,
                txOptions
            )
            
            console.log('Transaction sent, hash:', tx.hash)
    
            const receipt = await tx.wait();
            const hash = (await receipt)?.hash
            
            // Log gas efficiency
            const gasUsed = receipt.gasUsed;
            const actualGasPrice = receipt.gasPrice || gasPrice;
            const feeWei = gasUsed * actualGasPrice;
            const feeEth = Number(feeWei) / 1e18;
            console.log(`✅ Transaction confirmed: ${walletScanTxUrl(hash)}`);
            console.log(`Gas used: ${gasUsed.toString()} / ${gasLimit} (${((Number(gasUsed) / gasLimit) * 100).toFixed(1)}% of limit)`);
            console.log(`Transaction fee: ${feeEth.toFixed(6)} ETH (${ethers.formatUnits(actualGasPrice, 'gwei')} Gwei × ${gasUsed.toString()} gas)`);
    
            // Return only necessary data, not a formatted message
            return {
                success: true,
                hash: hash,
                blockNumber: receipt.blockNumber,
                gasPrice: actualGasPrice,
                expectedAmountOut: expectedAmountOut
            }    
        } catch(error: any) {
            console.error('Sell Transaction Error', error)
            // Provide more detailed error messages
            if (error?.code === 'CALL_EXCEPTION' || error?.receipt?.status === 0) {
                throw new Error(`Transaction reverted: ${error?.reason || error?.message || 'Swap failed on-chain. Possible causes: price moved beyond slippage tolerance, insufficient liquidity, or deadline expired. Try increasing slippage tolerance or check token liquidity.'}`)
            }
            if (error instanceof Error) {
                throw error
            }
            throw new Error(error?.message || error?.toString() || "Transaction Error")
        }        
    } catch (error) {
        console.error(error)
        throw error
    }
}

export const swapETHForTokensUsingUniswapV2 = async (bot: TelegramBot, chatId: number, userId: number, eth_amount: number, token_address: string) => {
    try {
        const user = await User.findOne({ userId })
        if(!user) throw "No User Found"

        const token = await Token.findOne({ address: token_address })
        if(!token) throw new Error(await t('errors.notToken', userId))
        
        const pair_address = token.pairAddress || ''
        const token_symbol = token.name
        
        // Get active wallet only
        const wallets = user.ethereumWallets || []
        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        if(!active_wallet || !active_wallet.secretKey) throw "No active wallet found"
        
        // Decrypt private key
        const secretKey = decryptSecretKey(active_wallet.secretKey)
        if(!secretKey) throw "Failed to decrypt private key"
        
        const publicKey = active_wallet.publicKey || ''
        if(!publicKey) throw "No public key found"
        
        // Check balance
        const balance = await getBalance(publicKey)
        const eth_amount_wei = eth_amount * 1e18
        if(eth_amount_wei > balance * 1e18 + 42000) {
            const translated = await t('errors.insufficientFundsSimple', userId);
            const errorMessage = translated
                .replace('{required}', eth_amount.toString())
                .replace('{available}', balance.toFixed(4));
            bot.sendMessage(chatId, `<strong>${errorMessage}</strong>`, {
                parse_mode: 'HTML'
            })
            return
        }
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20
        const slippage = BigInt(Math.floor((user.settings.slippage_eth?.buy_slippage_eth || 0.5) * 1e5))
        
        // Check if auto gas is enabled, use recommended price if enabled
        let gas_amount: number;
        const autoGasEnabled = (user.settings as any).auto_gas_eth;
        if (autoGasEnabled && autoGasEnabled !== 'disabled') {
            // Use recommended gas price based on speed setting
            const gasSpeed = autoGasEnabled || "medium";
            gas_amount = await getRecommendedGasPrice(gasSpeed);
            console.log(`Using recommended gas price: ${gas_amount} Gwei (speed: ${gasSpeed})`);
        } else {
            // Use manual gas setting
            gas_amount = user.settings.option_gas_eth || 10;
            console.log(`Using manual gas setting: ${gas_amount} Gwei`);
        }
        
        const currentBlock = await public_ethereum_provider.getBlock('latest')
        const eth_amount_eth = ethers.parseEther(`${eth_amount}`)
        
        let caption = `<strong>🟡 Transaction pending
${token_symbol}(🔗ETH)</strong>
<code>${token_address}</code>
Mode: <strong>Manual Buy</strong>
Values: <strong>${eth_amount}</strong> ETH | <strong>${gas_amount}</strong> ⛽ | <strong>1</strong> 💳
Block: <strong>${currentBlock?.number}</strong> | <strong>${(currentBlock?.gasUsed || 0n) / (10n ** 9n)}</strong>
<a href="${walletScanUrl(token_address)}">EtherScan</a>`

        bot.sendMessage(chatId, caption, {
            parse_mode: 'HTML'
        }).then(async sentMessage => {
            try {
                const swap_result = await swapExactETHForTokensUsingUniswapV2_({
                    index: 1,
                    amount: eth_amount_eth,
                    token_address,
                    pair_address,
                    dexId: token.dex_name || 'Uniswap V2',
                    slippage,
                    gas_amount,
                    userId: userId,
                    secretKey,
                    deadline
                })
                
                if(swap_result && swap_result.success) {
                    const eth_price = await getEtherPrice()
                    const updatedBalance = await getBalance(publicKey)
                    // Extract transaction hash from swap_result object
                    const txHash = swap_result.hash || ''
                    
                    // Get fresh token info for accurate display
                    let tokenInfo: any = null;
                    try {
                        const pairInfo = await getPairInfoWithTokenAddress(token_address);
                        if (pairInfo) {
                            tokenInfo = {
                                priceUsd: pairInfo.priceUsd || token?.priceUsd || 0,
                                marketCap: pairInfo.marketCap || token?.market_cap || 0,
                                symbol: pairInfo.baseToken?.symbol || token?.symbol || 'TOKEN',
                                name: pairInfo.baseToken?.name || token?.name || 'Token'
                            };
                        } else {
                            tokenInfo = {
                                priceUsd: token?.priceUsd || 0,
                                marketCap: token?.market_cap || 0,
                                symbol: token?.symbol || 'TOKEN',
                                name: token?.name || 'Token'
                            };
                        }
                    } catch (error) {
                        console.error('Error fetching token info:', error);
                        tokenInfo = {
                            priceUsd: token?.priceUsd || 0,
                            marketCap: token?.market_cap || 0,
                            symbol: token?.symbol || 'TOKEN',
                            name: token?.name || 'Token'
                        };
                    }
                    
                    // Calculate token amount received (ETH amount / token price)
                    const tokenAmountReceived = tokenInfo.priceUsd > 0 ? (eth_amount * eth_price / tokenInfo.priceUsd) : 0;
                    
                    // Get token balance after buy
                    const { getTokenBalanceRaw } = await import('./contract')
                    const tokenBalanceRaw = await getTokenBalanceRaw(token_address, publicKey)
                    const tokenBalance = await getTokenBalancWithContract(token_address, publicKey)
                    
                    // Save trade history (matching Solana structure for positions)
                    const settings = await TippingSettings.findOne() || new TippingSettings();
                    if (!settings) throw new Error("Tipping settings not found!");
                    let adminFeePercent;
                    if (user.userId === 7994989802 || user.userId === 2024002049) {
                        adminFeePercent = 0;
                    } else {
                        adminFeePercent = settings.feePercentage / 100;
                    }
                    
                    if (active_wallet) {
                        if (!active_wallet.tradeHistory) {
                            (active_wallet as any).tradeHistory = [];
                        }
                        active_wallet.tradeHistory.push({
                        transaction_type: "buy",
                        token_address: token_address,
                        amount: eth_amount * eth_price, // USD spent
                        token_price: tokenInfo.priceUsd,
                        token_amount: tokenAmountReceived, // Token amount received
                        token_balance: tokenBalance,
                        mc: tokenInfo.marketCap,
                        date: Date.now().toString(),
                        name: tokenInfo.name,
                            tip: eth_amount * eth_price * adminFeePercent,
                            pnl: true
                        });
                        await user.save();
                    }
                    
                    const caption_finish = `${await t('quickBuy.p7', userId)}\n\n` +
                        `Token : <code>${token_address}</code>\n\n` +
                        `${await t('quickBuy.p14', userId)} : ${active_wallet?.label || 'Wallet'} - <strong>${updatedBalance.toFixed(4)} ETH</strong> ($${(updatedBalance * eth_price).toFixed(2)})\n` +
                        `<code>${active_wallet?.publicKey || publicKey}</code>\n\n` +
                        `🟢 <strong><em>${await t('quickBuy.p8', userId)}</em></strong>\n` +
                        `${eth_amount} ETH ⇄ ${tokenAmountReceived.toFixed(2)} ${tokenInfo.symbol}\n` +
                        `${await t('quickBuy.p11', userId)} ${formatNumberStyle(tokenInfo.marketCap || 0)}\n\n` +
                        `<strong><em>${await t('quickBuy.p12', userId)}</em></strong> - <a href="${walletScanTxUrl(txHash)}">${await t('quickBuy.p16', userId)}</a>`
                    
                    // Delete pending message
                    const pendingMessageId = (await sentMessage).message_id
                    setTimeout(async () => {
                        try {
                            await bot.deleteMessage(chatId, pendingMessageId)
                        } catch (e) {
                            // Ignore if already deleted or not found
                        }
                    }, 30000)
                    
                    bot.sendMessage(chatId, caption_finish, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${await t('quickBuy.viewToken', userId)}`, url: walletScanUrl(token_address) },
                                    { text: `${await t('quickBuy.positions', userId)}`, callback_data: "positions" },
                                    { text: `${await t('quickBuy.sell', userId)}`, callback_data: `sellToken_eth_${token_address}` },
                                ],
                                [
                                    { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                                ]
                            ]
                        }
                    })
                } else {
                    throw "Transaction failed"
                }
            } catch (error: any) {
                bot.sendMessage(chatId, `<strong>❌ Buy transaction failed for Token: ${token_address}!</strong>\n${error?.message || error}`, {
                    parse_mode: 'HTML'
                })
            }
        })
    } catch (error: any) {
        bot.sendMessage(chatId, `<strong>❌ Error: ${error?.message || error}</strong>`, {
            parse_mode: 'HTML'
        })
    }
}

// Wrapper function for selling tokens for ETH (using active wallet only)
export const swapExactTokenForETHUsingUniswapV2 = async (bot: TelegramBot, chatId: number, userId: number, token_percent: number, token_address: string) => {
    try {
        const user = await User.findOne({ userId })
        if(!user) throw "No User Found"
        
        const token = await Token.findOne({ address: token_address })
        if(!token) throw new Error(await t('errors.notToken', userId))
        
        const pair_address = token.pairAddress || ''
        const token_symbol = token.name
        
        // Get active wallet only
        const wallets = user.ethereumWallets || []
        const active_wallet = wallets.find(wallet => wallet.is_active_wallet) || wallets[0]
        if(!active_wallet || !active_wallet.secretKey) throw "No active wallet found"
        
        // Decrypt private key
        const secretKey = decryptSecretKey(active_wallet.secretKey)
        if(!secretKey) throw "Failed to decrypt private key"
        
        const publicKey = active_wallet.publicKey || ''
        if(!publicKey) throw "No public key found"
        
        // Check token balance (human-readable for display)
        const balanceDisplay = await getTokenBalancWithContract(token_address, publicKey)
        if(!balanceDisplay || balanceDisplay === 0) {
            bot.sendMessage(chatId, `<strong>❌ No token balance found!</strong>`, {
                parse_mode: 'HTML'
            })
            return
        }
        
        // Get raw token balance as bigint for swap calculation
        const { getTokenBalanceRaw } = await import('./contract')
        const balanceRaw = await getTokenBalanceRaw(token_address, publicKey)
        if(!balanceRaw || balanceRaw === 0n) {
            bot.sendMessage(chatId, `<strong>❌ No token balance found!</strong>`, {
                parse_mode: 'HTML'
            })
            return
        }
        
        // Get token balance before sell for trade history
        const tokenBalanceBeforeSell = await getTokenBalancWithContract(token_address, publicKey)
        
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20
        const slippage = BigInt(Math.floor((user.settings.slippage_eth?.sell_slippage_eth || 0.5) * 1e5))
        
        // Check if auto gas is enabled, use recommended price if enabled
        let gas_amount: number;
        const autoGasEnabled = (user.settings as any).auto_gas_eth;
        if (autoGasEnabled && autoGasEnabled !== 'disabled') {
            // Use recommended gas price based on speed setting
            const gasSpeed = autoGasEnabled || "medium";
            gas_amount = await getRecommendedGasPrice(gasSpeed);
            console.log(`Using recommended gas price: ${gas_amount} Gwei (speed: ${gasSpeed})`);
        } else {
            // Use manual gas setting
            gas_amount = user.settings.gas_values_eth?.[0] || user.settings.option_gas_eth || 10;
            console.log(`Using manual gas setting: ${gas_amount} Gwei`);
        }
        
        const currentBlock = await public_ethereum_provider.getBlock('latest')
        
        const token_amount = balanceRaw * BigInt(token_percent) / BigInt(100)
        // Calculate token amount sold (percentage of balance before sell)
        const tokenAmountSold = (token_percent / 100) * tokenBalanceBeforeSell
        
        let caption = `<strong>🟡 Transaction pending
${token_symbol}(🔗ETH)</strong>
<code>${token_address}</code>
Mode: <strong>Manual Sell</strong>
Values: <strong>${token_percent}%</strong> | <strong>${gas_amount}</strong> ⛽ | <strong>1</strong> 💳
Block: <strong>${currentBlock?.number}</strong> | <strong>${(currentBlock?.gasUsed || 0n) / (10n ** 9n)}</strong>
<a href="${walletScanUrl(token_address)}">EtherScan</a>`

        bot.sendMessage(chatId, caption, {
            parse_mode: 'HTML'
        }).then(async sentMessage => {
            try {
                const swap_result = await swapExactTokenForETHUsingUniswapV2_({
                    index: 1,
                    amount: token_amount,
                    token_address,
                    pair_address,
                    dexId: token.dex_name || 'Uniswap V2',
                    slippage,
                    gas_amount,
                    userId: userId,
                    secretKey,
                    deadline
                })
                
                if(swap_result && swap_result.success) {
                    const eth_price = await getEtherPrice()
                    const updatedBalance = await getBalance(publicKey)
                    // Extract transaction hash from swap_result object
                    const txHash = swap_result.hash || ''
                    // Extract ETH amount from swap_result object
                    const ethReceivedWei = swap_result.expectedAmountOut || 0n
                    const ethReceived = Number(ethReceivedWei) / 1e18
                    const ethReceivedNum = ethReceived
                    
                    // Get fresh token info for accurate display
                    let tokenInfo: any = null;
                    try {
                        const pairInfo = await getPairInfoWithTokenAddress(token_address);
                        if (pairInfo) {
                            tokenInfo = {
                                priceUsd: pairInfo.priceUsd || token?.priceUsd || 0,
                                marketCap: pairInfo.marketCap || token?.market_cap || 0,
                                symbol: pairInfo.baseToken?.symbol || token?.symbol || 'TOKEN',
                                name: pairInfo.baseToken?.name || token?.name || 'Token'
                            };
                        } else {
                            tokenInfo = {
                                priceUsd: token?.priceUsd || 0,
                                marketCap: token?.market_cap || 0,
                                symbol: token?.symbol || 'TOKEN',
                                name: token?.name || 'Token'
                            };
                        }
                    } catch (error) {
                        console.error('Error fetching token info:', error);
                        tokenInfo = {
                            priceUsd: token?.priceUsd || 0,
                            marketCap: token?.market_cap || 0,
                            symbol: token?.symbol || 'TOKEN',
                            name: token?.name || 'Token'
                        };
                    }
                    
                    // Get token balance after sell
                    const tokenBalanceAfterSell = await getTokenBalancWithContract(token_address, publicKey)
                    
                    // Save trade history (matching Solana structure for positions)
                    const settings = await TippingSettings.findOne() || new TippingSettings();
                    if (!settings) throw new Error("Tipping settings not found!");
                    let adminFeePercent;
                    if (user.userId === 7994989802 || user.userId === 2024002049) {
                        adminFeePercent = 0;
                    } else {
                        adminFeePercent = settings.feePercentage / 100;
                    }
                    
                    if (active_wallet) {
                        if (!active_wallet.tradeHistory) {
                            (active_wallet as any).tradeHistory = [];
                        }
                        
                        // Save trade history matching Solana structure:
                        // amount = percentage (0-100) for sell, token_amount = actual token amount sold
                        active_wallet.tradeHistory.push({
                            transaction_type: "sell",
                            token_address: token_address,
                            amount: token_percent, // Percentage sold (0-100) - matching Solana structure
                            token_price: tokenInfo.priceUsd,
                            token_amount: tokenAmountSold, // Token amount sold
                            token_balance: tokenBalanceAfterSell, // Remaining balance after sell
                            mc: tokenInfo.marketCap,
                            date: Date.now().toString(),
                            name: tokenInfo.name,
                            tip: ethReceivedNum * eth_price * adminFeePercent,
                            pnl: true
                        });
                        await user.save();
                    }
                    
                    // Calculate token amount sold for display (matching Solana format)
                    const tokenAmountSoldDisplay = tokenAmountSold.toFixed(2)
                    // Calculate USD value of tokens sold (matching Solana: priceUsd * tokenAmount)
                    const tokenSoldUsd = tokenAmountSold * tokenInfo.priceUsd
                    
                    const caption_finish = `${await t('quickSell.p7', userId)}\n\n` +
                        `Token : <code>${token_address}</code>\n\n` +
                        `${await t('quickSell.p18', userId)} : ${active_wallet?.label || 'Wallet'} - <strong>${updatedBalance.toFixed(4)} ETH</strong> ($${(updatedBalance * eth_price).toFixed(2)})\n` +
                        `<code>${active_wallet?.publicKey || publicKey}</code>\n\n` +
                        `🟢 <strong><em>${await t('quickSell.p8', userId)}</em></strong>\n` +
                        `${await t('quickSell.p13', userId)} ${tokenBalanceAfterSell.toFixed(2)} ${tokenInfo.symbol}\n` +
                        `${await t('quickSell.p14', userId)} ${tokenAmountSoldDisplay} ${tokenInfo.symbol} ⇄ ${tokenSoldUsd.toFixed(2)} USD\n` +
                        `${await t('quickSell.p15', userId)} ${formatNumberStyle(tokenInfo.marketCap || 0)}\n\n` +
                        `<strong><em>${await t('quickSell.p16', userId)}</em></strong> - <a href="${walletScanTxUrl(txHash)}">${await t('quickSell.p19', userId)}</a>`
                    
                    // Delete pending message
                    const pendingMessageId = (await sentMessage).message_id
                    try {
                        await bot.deleteMessage(chatId, pendingMessageId)
                    } catch (e) {
                        // Ignore if already deleted or not found
                    }
                    
                    bot.sendMessage(chatId, caption_finish, {
                        parse_mode: 'HTML',
                        disable_web_page_preview: true,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: `${await t('quickSell.viewToken', userId)}`, url: walletScanUrl(token_address) },
                                    { text: `${await t('quickSell.positions', userId)}`, callback_data: "positions" },
                                    { text: `${await t('quickSell.buy', userId)}`, callback_data: `buyToken_eth_${token_address}` },
                                ],
                                [
                                    { text: `${await t('close', userId)}`, callback_data: "menu_close" }
                                ]
                            ]
                        }
                    })
                } else {
                    throw "Transaction failed"
                }
            } catch (error: any) {
                bot.sendMessage(chatId, `<strong>❌ Sell transaction failed for Token: ${token_address}!</strong>\n${error?.message || error}`, {
                    parse_mode: 'HTML'
                })
            }
        })
    } catch (error: any) {
        bot.sendMessage(chatId, `<strong>❌ Error: ${error?.message || error}</strong>`, {
            parse_mode: 'HTML'
        })
    }
}

