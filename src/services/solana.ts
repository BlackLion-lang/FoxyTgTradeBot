import { Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array, } from "../config/security";

let sol_price = 0;
let lastPriceFetchTime = 0;
let priceCacheDuration = 60000; // Cache for 60 seconds to avoid rate limits

export async function getSolanaPrice() {
    // Check if we have a cached price that's still fresh
    const now = Date.now();
    if (sol_price > 0 && (now - lastPriceFetchTime) < priceCacheDuration) {
        console.log(`Using cached SOL price: $${sol_price} (cached ${Math.floor((now - lastPriceFetchTime) / 1000)}s ago)`);
        return sol_price;
    }

    try {
    const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    );
        
        if (!response.ok) {
            // Handle rate limit errors
            if (response.status === 429) {
                console.warn(`⚠️ CoinGecko rate limit hit. Using cached price: $${sol_price}`);
                // Return cached price if available, otherwise return last known price
                return sol_price > 0 ? sol_price : 150; // Fallback to default SOL price
            }
            throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
        }
        
    const sol_data = await response.json();
        
        // Check for API error response
        if (sol_data?.status?.error_code === 429) {
            console.warn(`⚠️ CoinGecko rate limit exceeded. Using cached price: $${sol_price}`);
            return sol_price > 0 ? sol_price : 150;
        }
        
        const price = sol_data?.solana?.usd ?? 0;
        
        if (price > 0) {
            sol_price = price;
            lastPriceFetchTime = now;
            console.log(`✅ Updated SOL price: $${price}`);
        } else {
            console.warn(`⚠️ Invalid price from CoinGecko. Using cached price: $${sol_price}`);
            return sol_price > 0 ? sol_price : 150;
        }
        
        return price;
    } catch (error) {
        console.error("❌ Error fetching SOL price from CoinGecko:", error);
        // Return cached price if available
        if (sol_price > 0) {
            console.log(`Using cached SOL price: $${sol_price}`);
            return sol_price;
        }
        // Last resort fallback
        console.warn("⚠️ No cached price available, using default: $150");
        return 150;
    }
}

export async function getTokenPriceInSOL(tokenAddress: string): Promise<number> {
    const res = await fetch(`https://price.jup.ag/v4/price?ids=${tokenAddress}`);
    const json = await res.json();

    const price = json.data?.[tokenAddress]?.price;

    if (!price) throw new Error("Token price not found");

    return price;
}

export const getSolPrice = () => sol_price;

export const setSolPrice = (newPrice: number) => {
    sol_price = newPrice;
};

export const walletCreate = () => {
    const newWallet = Keypair.generate();

    const secretKeyBase58 = bs58.encode(newWallet.secretKey);
    const secretKey = encryptSecretKey(secretKeyBase58);

    // const secretKey = bs58.encode(newWallet.secretKey);
    return { publicKey: newWallet.publicKey.toBase58(), secretKey };
};

export const walletFromPrvKey = (secretKey: string) => {
    const newWallet = Keypair.fromSecretKey(bs58.decode(secretKey));
    return { publicKey: newWallet.publicKey.toBase58(), secretKey };
};

export function isValidPrivateKey(privateKey: string | Uint8Array): boolean {
    try {
        // If the private key is a string, convert it to Uint8Array
        const keyArray =
            typeof privateKey === "string"
                ? bs58.decode(privateKey)
                : privateKey;

        // Attempt to create a Keypair from the private key
        const keypair = Keypair.fromSecretKey(keyArray);

        // If no error is thrown, the key is valid
        return !!keypair;
    } catch (error) {
        // Invalid private key
        return false;
    }
}

export async function getTokenBalance(
    publicKey: PublicKey,
    tokenAddress: PublicKey,
) {
    try {
        // Validate inputs
        if (!publicKey || !tokenAddress) {
            console.error(`❌ Invalid inputs: publicKey=${!!publicKey}, tokenAddress=${!!tokenAddress}`);
            return 0;
        }

        console.log(`🔍 Checking token balance for ${tokenAddress.toBase58()} in wallet ${publicKey.toBase58()}`);

        // Method 1: Try associated token account (standard way)
        const associatedTokenAccount = await getAssociatedTokenAddress(
            tokenAddress,
            publicKey,
        );

        console.log(`🔍 Associated token account: ${associatedTokenAccount.toBase58()}`);

        // First check if the account exists
        const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
        
        if (accountInfo) {
            console.log(`✅ Associated token account exists, fetching balance...`);

            // Account exists, get the balance
            const tokenAmount = await connection.getTokenAccountBalance(
                associatedTokenAccount,
            );
            
            const tokenBalance = tokenAmount.value.uiAmount;
            const tokenDecimal = tokenAmount.value.decimals;
            const rawAmount = tokenAmount.value.amount;

            if (tokenBalance !== null && tokenBalance !== undefined) {
                console.log(`✅ Token balance (associated account): ${tokenBalance} ${tokenAmount.value.uiAmountString || ''} (decimals: ${tokenDecimal}, raw: ${rawAmount})`);
                return tokenBalance;
            }

            // If we have raw amount, try to calculate manually
            if (rawAmount && tokenDecimal !== undefined) {
                const calculatedBalance = Number(rawAmount) / Math.pow(10, tokenDecimal);
                console.log(`📊 Calculated balance from raw amount: ${calculatedBalance}`);
                return calculatedBalance;
            }
        } else {
            console.log(`ℹ️ Associated token account doesn't exist, checking all token accounts...`);
        }

        // Method 2: Fallback - Check all token accounts for this wallet
        console.log(`🔍 Searching all token accounts for wallet ${publicKey.toBase58()}...`);
        
        try {
            // Try using getParsedTokenAccountsByOwner (available in web3.js)
            const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                publicKey,
                {
                    mint: tokenAddress,
                },
            );

            console.log(`📊 Found ${tokenAccounts.value.length} token account(s) for mint ${tokenAddress.toBase58()}`);

            if (tokenAccounts.value.length > 0) {
                // Sum up all balances from all token accounts
                let totalBalance = 0;
                for (const account of tokenAccounts.value) {
                    const parsedInfo = account.account.data.parsed.info;
                    const balance = parsedInfo.tokenAmount.uiAmount;
                    const decimals = parsedInfo.tokenAmount.decimals;
                    const rawAmount = parsedInfo.tokenAmount.amount;
                    
                    console.log(`  💰 Account ${account.pubkey.toBase58()}: balance=${balance}, decimals=${decimals}, raw=${rawAmount}`);
                    
                    if (balance !== null && balance !== undefined) {
                        totalBalance += balance;
                    } else if (rawAmount && decimals !== undefined) {
                        // Calculate from raw amount if uiAmount is null
                        const calculated = Number(rawAmount) / Math.pow(10, decimals);
                        totalBalance += calculated;
                    }
                }
                
                if (totalBalance > 0) {
                    console.log(`✅ Total token balance (from all accounts): ${totalBalance}`);
                    return totalBalance;
                }
            }
        } catch (fallbackError: any) {
            console.log(`⚠️ Fallback method failed: ${fallbackError?.message || fallbackError}`);
            // Continue to return 0 if fallback also fails
        }

        console.log(`ℹ️ No token balance found for ${tokenAddress.toBase58()} - returning 0`);
        return 0;
    } catch (error: any) {
        // Log the actual error for debugging
        const errorMessage = error?.message || String(error);
        const errorCode = error?.code || 'UNKNOWN';
        console.error(`❌ Error getting token balance for ${tokenAddress.toBase58()}:`, errorMessage);
        console.error(`❌ Error code: ${errorCode}`);
        if (error?.stack) {
            console.error(`❌ Error stack:`, error?.stack);
        }
        return 0;
    }
}

export function isValidSolanaAddress(address: string): boolean {
    try {
        // Attempt to create a PublicKey instance
        const publicKey = new PublicKey(address);

        // Verify the address matches the expected format
        return PublicKey.isOnCurve(publicKey.toBytes());
    } catch (error) {
        // If an error is thrown, the address is invalid
        return false;
    }
}

export async function getBalanceWithLamports(address: string) {
    return await connection.getBalance(new PublicKey(address));
}

export async function getBalance(address: string) {
    return (
        Number(await connection.getBalance(new PublicKey(address))) /
        LAMPORTS_PER_SOL
    );
}

export async function getTokenSecurityInfo(address: string) {
    try {
        const mintInfo = await connection.getParsedAccountInfo(
            new PublicKey(address),
        );
        if (!mintInfo.value) {
            console.error("No mint info found for address:", address);
            return {};
        }

        // Check authorities
        const mintData = mintInfo.value.data as any;
        const data = mintData.parsed.info;

        const isSafe =
            (!data.freezeAuthority || data.freezeAuthority === "None") &&
            (!data.mintAuthority || data.mintAuthority === "None");
        // console.log('debug isSafe', isSafe);

        return {
            freezeAuthority: data.freezeAuthority == null ? true : false,
            mintAuthority: data.mintAuthority == null ? true : false,
            supply: data.supply,
            decimals: data.decimals,
            isInitialized: data.isInitialized,
            safe: isSafe,
        };
    } catch (error) {
        console.error("Error fetching token security info:", error);
        return {};
    }
}

// export async function getRecommendedMEVTip(): Promise<number> {
//   try {
//     const rpcUrl = connection.rpcEndpoint;
//     const body = {
//       jsonrpc: "2.0",
//       id: 1,
//       method: "getPriorityFeeEstimate",
//       params: [
//         {
//           transaction: "v0", // or "legacy"
//           options: {
//             includeAllPriorityFeeLevels: true
//           }
//         }
//       ]
//     };

//     const res = await fetch(rpcUrl, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body)
//     });

//     const json = await res.json();
//     console.log("⚠️ MEV Tip Response:", json);
//     const estimate = json?.result?.priorityFeeEstimate;
//     if (typeof estimate === "number" && estimate > 0) {
//       return estimate;
//     }

//     console.warn("⚠️ Invalid priority fee, using fallback.");
//     return 100_000;
//   } catch (err) {
//     console.error("❌ Failed to fetch MEV tip from Helius:", err);
//     return 100_000; // Fallback
//   }
// }

export async function getRecommendedMEVTip(level: "low" | "medium" | "high" | "veryHigh" = "medium"): Promise<number> {
    try {
        const rpcUrl = connection.rpcEndpoint;

        // Build a minimal dummy transaction message
        const message = new TransactionMessage({
            payerKey: new PublicKey("FpCFfxvbaVUYcRd3kHUpYqHLfjXYBjEz7FuQ5WPgYEDr"), // use any valid pubkey
            recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
            instructions: [], // empty instructions, just to build tx
        });

        const compiledMessage = message.compileToV0Message();

        const dummyTx = new VersionedTransaction(compiledMessage);

        // Serialize to base58Tx
        const base58Tx = bs58.encode(dummyTx.serialize());

        const body = {
            jsonrpc: "2.0",
            id: 1,
            method: "getPriorityFeeEstimate",
            params: [
                {
                    transaction: base58Tx,
                    options: {
                        includeAllPriorityFeeLevels: true,
                    },
                },
            ],
        };

        const res = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const json = await res.json();
        // console.log("⚠️ MEV Tip Response:", json);

        const levels = json.result.priorityFeeLevels;
        if (!levels) throw new Error("No priorityFeeLevels found");

        const tip = levels[level] ?? 100_000; return tip;
    } catch (error) {
        console.error("❌ Failed to fetch MEV tip:", error);
        return 100000; // fallback
    }
}