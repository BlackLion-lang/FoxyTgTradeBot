import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

export default class AntService {
    constructor() {
        console.log("AntService is running with Ant.fun API...");
    }

    private buildBasePayload(type: string = 'new_pairs', overrides: any = {}) {
        // If type is empty/null, try to build payload without type restriction
        // This might allow getting all tokens regardless of when they were created
        const basePayload: any = {
            "type": type || 'new_pairs', // Default to 'new_pairs' if type is not provided
            "filters": {
              "search_key_words": [],
              "exclude_key_words": [],
              "tw": false,
              "tg": false,
              "web": false,
              "private_filters": {
                "bsc": {
                  "age": { "max": null, "min": null },
                  "bonding_curve": { "max": null, "min": null },
                  "btnxs": { "max": null, "min": null },
                  "bundler_hold_ratio": { "max": null, "min": null },
                  "dev_hold_ratio": { "max": null, "min": null },
                  "dev_migrations": { "max": null, "min": null },
                  "holders": { "max": null, "min": null },
                  "launchpad": {
                    "four_meme": false,
                    "binance": false,
                    "bsc_flap": false
                  },
                  "liquidity": { "max": null, "min": null },
                  "market_cap": { "max": null, "min": null },
                  "monitor_holders": { "max": null, "min": null },
                  "pro_traders": { "max": null, "min": null },
                  "sniper_hold_ratio": { "max": null, "min": null },
                  "stnxs": { "max": null, "min": null },
                  "tnxs": { "max": null, "min": null },
                  "top10_hold_ratio": { "max": null, "min": null },
                  "total_paid_fee": { "max": null, "min": null },
                  "volume_usd": { "max": null, "min": null }
                },
                "sol": {
                  "age": { "max": null, "min": null },
                  "bonding_curve": { "max": null, "min": null },
                  "btnxs": { "max": null, "min": null },
                  "bundler_hold_ratio": { "max": null, "min": null },
                  "dev_hold_ratio": { "max": null, "min": null },
                  "dev_migrations": { "max": null, "min": null },
                  "holders": { "max": null, "min": null },
                  "is_pumpfun_live": false, // false = include both live and migrated (swapped) tokens
                  "launchpad": {
                    "pump": true,  // Only pump.fun tokens
                    "moonshot": false,
                    "raydium_launchpad": false,
                    "meteora_dbc": false,
                    "boop": false,
                    "bonk": false,
                    "believe": false,
                    "jupiter_studio": false,
                    "bags": false,
                    "heaven": false,
                    "token_mill": false,
                    "cooking": false,
                    "soar": false,
                    "mayhem": false
                  },
                  "liquidity": { "max": null, "min": null },
                  "market_cap": { "max": null, "min": null },
                  "monitor_holders": { "max": null, "min": null },
                  "pro_traders": { "max": null, "min": null },
                  "sniper_hold_ratio": { "max": null, "min": null },
                  "stnxs": { "max": null, "min": null },
                  "tnxs": { "max": null, "min": null },
                  "top10_hold_ratio": { "max": null, "min": null },
                  "total_paid_fee": { "max": null, "min": null },
                  "volume_usd": { "max": null, "min": null },
                  ...overrides
                },
                "xlayer": {
                  "age": { "max": null, "min": null },
                  "bonding_curve": { "max": null, "min": null },
                  "btnxs": { "max": null, "min": null },
                  "bundler_hold_ratio": { "max": null, "min": null },
                  "dev_hold_ratio": { "max": null, "min": null },
                  "dev_migrations": { "max": null, "min": null },
                  "holders": { "max": null, "min": null },
                  "launchpad": {
                    "dyor_fun": false,
                    "xlayer_flap": false
                  },
                  "liquidity": { "max": null, "min": null },
                  "market_cap": { "max": null, "min": null },
                  "monitor_holders": { "max": null, "min": null },
                  "pro_traders": { "max": null, "min": null },
                  "sniper_hold_ratio": { "max": null, "min": null },
                  "stnxs": { "max": null, "min": null },
                  "tnxs": { "max": null, "min": null },
                  "top10_hold_ratio": { "max": null, "min": null },
                  "total_paid_fee": { "max": null, "min": null },
                  "volume_usd": { "max": null, "min": null }
                }
              }
            }
          };

        return basePayload;
    }

    private getHeaders() {
        if (!process.env.ANT_API_TOKEN) {
            throw new Error("ANT_API_TOKEN environment variable is required to call Ant.fun API");
        }

        return {
            accept: "application/json, text/plain, */*",
            "accept-encoding": "gzip, deflate, br, zstd",
            "accept-language": "en-US,en;q=0.9",
            authorization: `Bearer ${process.env.ANT_API_TOKEN}`,
            "content-type": "application/json",
            origin: "https://ant.fun",
            referer: "https://ant.fun/",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-site",
            "user-agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
            "x-device-id": process.env.ANT_DEVICE_ID || "a1db51fb-b202-4681-b86f-f6d7486019f9",
            "x-device-type": "web",
            "x-device-version": "5.0.0",
            "sec-ch-ua": '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"Windows"',
        };
    }

    async callPulse(type: string = 'new_pairs', overrides: any = {}) {
        try {
            // Build payload with the specified type
            // Note: 'new_pairs' type may only return new tokens, but filters should help get older tokens too
            const payload = this.buildBasePayload(type, overrides);
            const headers = this.getHeaders();

            const response = await axios.post(
                "https://tapi2.ant.fun/api/v1/pulse/list",
                payload,
                { headers }
            );
            console.log(response.data);

            const data = response.data;
            
            // Check for error responses first
            if (data?.status === "error" || data?.code === 403 || (data?.code && data.code >= 400)) {
                const errorMsg = data?.msg || data?.message || "Unknown error";
                console.error(`[${new Date().toLocaleString()}] ❌ Ant.fun API error (type: ${type}): ${errorMsg} (code: ${data?.code || 'N/A'})`);
                return [];
            }
            
            // Try different possible response structures
            let pulseList = null;
            
            // Structure 1: data.data.pulse_list (most common)
            if (data?.data?.pulse_list && Array.isArray(data.data.pulse_list)) {
                pulseList = data.data.pulse_list;
            }
            // Structure 2: data.pulse_list
            else if (data?.pulse_list && Array.isArray(data.pulse_list)) {
                pulseList = data.pulse_list;
            }
            // Structure 3: data.data is an array
            else if (Array.isArray(data?.data)) {
                pulseList = data.data;
            }
            // Structure 4: data is an array
            else if (Array.isArray(data)) {
                pulseList = data;
            }
            // Structure 5: data.data.list or data.list
            else if (data?.data?.list && Array.isArray(data.data.list)) {
                pulseList = data.data.list;
            }
            else if (data?.list && Array.isArray(data.list)) {
                pulseList = data.list;
            }
            
            if (!pulseList || !Array.isArray(pulseList)) {
                console.warn(`[${new Date().toLocaleString()}] ⚠️ Ant.fun API returned unexpected response structure for type '${type}'`);
                return [];
            }
            
            if (pulseList.length > 0) {
                console.log(`[${new Date().toLocaleString()}] ✅ Ant.fun pulse response received (type: ${type}): ${pulseList.length} tokens`);
            }
            return pulseList;
        } catch (e: any) {
            if (e?.response?.data) {
                const errorData = e.response.data;
                if (errorData?.status === "error" || errorData?.code === 403 || errorData?.code >= 400) {
                    const errorMsg = errorData?.msg || errorData?.message || "Unknown error";
                    console.error(`[${new Date().toLocaleString()}] ❌ Ant.fun API error (type: ${type}): ${errorMsg} (code: ${errorData?.code || e.response.status})`);
                    return [];
                }
            }
            
            console.error(
                `[${new Date().toLocaleString()}] ❌ Error calling Ant.fun pulse API (type: ${type}):`,
                e instanceof Error ? e.message : String(e)
            );
            
            return [];
        }
    }

    async pulseNewPairs(overrides: any = {}) {
        return this.callPulse('new_pairs', overrides);
    }

    async pulseAllTokens(overrides: any = {}) {
        // Fetch ALL pump.fun tokens that match filter criteria, including:
        // 1. New pairs (tokens still on pump.fun bonding curve)
        // 2. Migrated tokens (tokens that have been swapped/migrated to Raydium)
        // This ensures we detect tokens at all stages: new, live on pump.fun, and swapped/migrated
        try {
            // Fetch new pairs - tokens still on pump.fun bonding curve
            const newPairs = await this.callPulse('new_pairs', overrides).catch(() => []);
            
            // Fetch migrated tokens - tokens that have been swapped/migrated from pump.fun to Raydium
            // These are important as they represent tokens that have "graduated" from pump.fun
            const migratedTokens = await this.callPulse('migrated', overrides).catch(() => []);
            
            // Mark tokens with their migration status
            // Mark new pairs as NOT migrated (still on pump.fun bonding curve)
            const markedNewPairs = (newPairs || []).map((token: any) => ({
                ...token,
                _isMigrated: false // Still on pump.fun bonding curve
            }));
            
            // Mark migrated tokens as migrated (swapped to Raydium/pump swap)
            const markedMigratedTokens = (migratedTokens || []).map((token: any) => ({
                ...token,
                _isMigrated: true // Migrated to pump swap (Raydium)
            }));
            
            // Combine both types to get all pump.fun tokens (new + swapped/migrated)
            const combinedTokens = [...markedNewPairs, ...markedMigratedTokens];
            const tokenMap = new Map<string, any>();
            
            combinedTokens.forEach(token => {
                // Ant.fun API returns 'base' as the mint address field
                const mint = token.base || token.mint || token.token_address || token.address || token.id;
                if (mint) {
                    // If token already exists, prefer migrated version (has real liquidity and updated MC)
                    // Migrated tokens have more accurate market cap from Raydium pool
                    const existing = tokenMap.get(mint);
                    if (!existing) {
                        tokenMap.set(mint, token);
                    } else {
                        // Prefer migrated token if available (has real liquidity and updated MC from pump swap)
                        if (token._isMigrated && !existing._isMigrated) {
                            tokenMap.set(mint, token);
                        } else if (!token._isMigrated && existing._isMigrated) {
                            // Keep existing migrated version
                        } else {
                            // Both same type, prefer one with more complete data
                            if (token.created_at && !existing.created_at) {
                                tokenMap.set(mint, token);
                            } else if (token.chain && !existing.chain) {
                                tokenMap.set(mint, token);
                            }
                        }
                    }
                }
            });
            
            const result = Array.from(tokenMap.values());
            console.log(`[${new Date().toLocaleString()}] 📊 Combined ${result.length} unique pump.fun tokens from AntService (new_pairs: ${newPairs?.length || 0}, migrated/swapped: ${migratedTokens?.length || 0})`);
            return result;
        } catch (e) {
            console.error(`[${new Date().toLocaleString()}] ❌ Error in pulseAllTokens:`, e instanceof Error ? e.message : e);
            return [];
        }
    }

    /**
     * Call Ant.fun wallet asset list API
     * Uses ANT_API_TOKEN (required) and ANT_DEVICE_ID (optional) from environment variables
     */
    async getAntWalletAssets(overrides: any = {}) {
        try {
            const payload = this.buildBasePayload('new_pairs', overrides);
            const headers = this.getHeaders();

            const response = await axios.post(
                "https://api2.ant.fun/api/v1/pulse/list",
                payload,
                { headers }
            );

            const data = response.data;
            console.log(`[${new Date().toLocaleString()}] Ant.fun wallet assets response received`);
            return data;
        } catch (e) {
            console.error(
                `[${new Date().toLocaleString()}] Error calling Ant.fun wallet asset list API`,
                e
            );
            throw e;
        }
    }
}
