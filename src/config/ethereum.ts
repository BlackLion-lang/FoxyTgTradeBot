import * as dotenv from 'dotenv';
import { JsonRpcProvider } from "ethers";
import { JsonRpcProvider as JsonRpcProviderV5 } from "@ethersproject/providers";

dotenv.config()

export const ETH_UNISWAP_V2_ROUTER = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
export const ETH_UNISWAP_V3_ROUTER = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'

// export const ETH_SWAP_ROUTER = '0x4D41e18A3255A50f9B77437e6Cb5b6314d7EA849'
export const ETH_SWAP_ROUTER = '0xafB0E9e9C9528FE45A254626a901b93b617B3903'

export const ETH_UNISWAP_QUOTER = '0x61fFE014bA17989E743c5F6cB21bF9697530B21e'
export const ETH_UNISWAP_FACTORY = '0x1F98431c8aD98523631AE4a59f267346ea31F984'

export const publicethRpcUrl ='https://ethereum-rpc.publicnode.com'

export const ethRpcUrl = 'https://eth-mainnet.g.alchemy.com/v2/DJEwy_YmFV6pS4Z67QjlNWO4mlnd1QiJ'

// Ethers v6 providers (for Contract, etc.)
export const public_ethereum_provider = new JsonRpcProvider(publicethRpcUrl)

export const ethereum_provider = new JsonRpcProvider(ethRpcUrl)

// Ethers v5 providers (for @ethersproject/wallet)
export const public_ethereum_provider_v5 = new JsonRpcProviderV5(publicethRpcUrl)

export const ethereum_provider_v5 = new JsonRpcProviderV5(ethRpcUrl)

export const ETH_WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'


