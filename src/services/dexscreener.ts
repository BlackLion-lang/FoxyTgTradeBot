import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getSolPrice } from "./solana";

interface QuoteToken {
    address: string;
    name: string;
    symbol: string;
}

export async function getAllTokneInfoformWallet(walletAddress: string) {
    try {
        const tokenAddresses = await getTokenAddressesFromWallet(walletAddress);

        const tokenInfos = [];

        for (const tokenAddress of tokenAddresses) {
            try {
                const tokenInfo = await getTokenInfo(tokenAddress);
                if (tokenInfo) {
                    tokenInfos.push(tokenInfo);
                }
            } catch (error) {
                console.error(
                    `Error fetching info for token ${tokenAddress}:`,
                    error,
                );
            }
        }
        return tokenInfos;
    } catch (error) {
        console.error("Error fetching token addresses from wallet:", error);
        throw error;
    }
}
export async function getTokenAddressesFromWallet(
    walletAddress: string,
): Promise<string[]> {
    if (!walletAddress || typeof walletAddress !== "string") {
        throw new Error("Invalid wallet address provided");
    }
    // Solana RPC URL for mainnet
    const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

    try {
        const response = await fetch(SOLANA_RPC_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getTokenAccountsByOwner",
                params: [
                    walletAddress,
                    {
                        programId:
                            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA", // SPL Token Program
                    },
                    {
                        encoding: "jsonParsed",
                    },
                ],
            }),
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(`Solana RPC Error: ${data.error.message}`);
        }

        // Extract token mint addresses
        interface TokenAccount {
            account: {
                data: {
                    parsed: {
                        info: {
                            mint: string;
                        };
                    };
                };
            };
        }

        interface SolanaRpcResponse {
            result: {
                value: TokenAccount[];
            };
        }

        const tokenAddresses = (data as SolanaRpcResponse).result.value
            .map(
                (account: TokenAccount) =>
                    account.account.data.parsed.info.mint,
            )
            .filter((mint: string) => mint); // Filter out any null/undefined values

        return tokenAddresses;
    } catch (error) {
        console.error("Error fetching token addresses from wallet:", error);
        throw error;
    }
}
export async function getTokenInfo(tokenAddress: string) {
    try {
        const response = await fetch(
            "https://api.dexscreener.com/latest/dex/search?q=" + tokenAddress,
            {
                method: "GET",
            },
        );
        const data = await response.json();
        console.log("date", data)

        if (data.pairs || data.pairs.length > 0) {
            const tokenData = data.pairs[0]; // Assuming we want the first pair
            return {
                tokenAddress: tokenAddress,
                symbol: tokenData.baseToken.symbol,
                price: tokenData.priceUsd,
                priceChange24h: tokenData.priceChange24h,
                volume24h: tokenData.volume24h,
                liquidity: tokenData.liquidity?.usd || 0,
                marketCap: tokenData.marketCap,
                dexId: tokenData.dexId,
                createAt: tokenData.createAt,
                pairAddress: tokenData.pairAddress,
                url: tokenData.url,
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching token info for ${tokenAddress}`, error);
        throw new Error("Failed to fetch token info");
    }

}
export const getPairByAddress = async (tokenAddress: string) => {
    try {
        const response = await fetch(
            "https://api.dexscreener.com/latest/dex/search?q=" + tokenAddress,
            {
                method: "GET",
            },
        );
        const data = await response.json();

        return data.pairs;
    } catch (error) {
        return [];
    }

    const fetchPumpFunData = async (tokenAddress: string) => {
        const pumpUrl = `https://frontend-api-v3.pump.fun/coins/${tokenAddress}`;
        const res = await fetch(pumpUrl);
        const data = await res.json();
        if (!data) {
            throw new Error("No pair");
        }
        const solPrice = getSolPrice();
        const liquidity =
            (data.virtual_sol_reserves * solPrice) / LAMPORTS_PER_SOL;
        const marketCap = data.usd_market_cap;
        const realTokenReserves =
            data.virtual_token_reserves / 10 ** 6 - 73000000;
        const bondingCurve =
            100 - ((realTokenReserves - 206900000) * 100) / 793100000;
        return {
            address: data.mint,
            dexId: "pumpfun",
            price: (marketCap / data.total_supply) * 10 ** 6,
            liquidity,
            bonding_curve: bondingCurve,
            market_cap: marketCap,
            symbol: data.symbol,
            name: data.name,
        };
    };
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    return fetch(url)
        .then((res) => res.json())
        .then(async ({ pairs }) => {
            if (pairs === null || pairs === undefined) {
                // return fetchPumpFunData(tokenAddress)
                throw "No pair";
            }
            const pair = pairs.find(
                ({ quoteToken }: { quoteToken: QuoteToken }) =>
                    quoteToken.address ===
                    "So11111111111111111111111111111111111111112",
            );
            if (
                pair === null ||
                pair === undefined ||
                (pair.dexId === "pumpfun" && pair.liquidity === undefined)
            ) {
                // return fetchPumpFunData(tokenAddress)
                throw "No pair";
            } else if (pair === null || pair === undefined) {
                throw new Error("No pair");
            }
            return {
                address: pair.baseToken.address,
                dexId: pair.dexId,
                priceUsd: pair.priceUsd,
                priceNative: pair.priceNative,
                liquidity: pair.liquidity.usd,
                bonding_curve: 0,
                market_cap: pair.marketCap,
                symbol: pair.baseToken.symbol,
                name: pair.baseToken.name,
            };
        });
};
let tokenPrice = 0;
export const getTokenPrice = async (tokenAddress: string): Promise<string> => {
    try {
        const pairs = await getPairByAddress(tokenAddress);
        if (pairs.length > 0) {
            console.log("token current price", pairs[0].priceUsd, "USD");
            return pairs[0].priceUsd;
        }
        return "Unknown";
    } catch (error) {
        console.error("Error fetching token symbol:", error);
        return "Unknown";
    }
};

export const setTokenPrice = (newPrice: any) => {
    tokenPrice = newPrice;
};

export const getTokenLink = (
    platform: string,
    tokenAddress: string,
): string => {
    switch (platform) {
        case "pump":
        case "pumpswap":
            return "https://pump.fun/coin/" + tokenAddress;
        default:
            break;
    }
    return `https://solscan.io/token/${tokenAddress}`;
};
export const formatNumber = (value: number): string => {
    if (value >= 1e6) {
        return (value / 1e6).toFixed(2) + "M";
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(2) + "K";
    } else if (value == 0 || value == undefined || value == null) {
        return "None";
    } else {
        return value.toString();
    }
};
