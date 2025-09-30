import { Keypair, LAMPORTS_PER_SOL, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { connection } from "../config/connection";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { encryptSecretKey, decryptSecretKey, uint8ArrayToBase64, base64ToUint8Array, } from "../config/security";

let sol_price = 0;

export async function getSolanaPrice() {
    const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
    );
    const sol_data = await response.json();
    console.log("Solana Price:", sol_data);
    return sol_data?.solana?.usd ?? 0;
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
    const secretKey = encryptSecretKey(secretKeyBase58, "password");

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
        const associatedTokenAccount = await getAssociatedTokenAddress(
            tokenAddress,
            publicKey,
        );

        const tokenAmount = await connection.getTokenAccountBalance(
            associatedTokenAccount,
        );
        const tokenBalance = tokenAmount.value.uiAmount;
        const tokenDecimal = tokenAmount.value.decimals;

        return tokenBalance || 0;
    } catch (error) {
        // console.log("error=>getBalance:", error);
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