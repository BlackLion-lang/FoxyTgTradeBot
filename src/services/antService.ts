import axios from "axios";
import * as dotenv from "dotenv";

dotenv.config();

export default class AntService {
    constructor() {
        console.log("AntService is running with Ant.fun API...");
    }

    private buildBasePayload(type: string = 'new_pairs', overrides: any = {}) {
        const basePayload = {
            "type": type,
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
                  "is_pumpfun_live": false,
                  "launchpad": {
                    "pump": true,
                    "moonshot": true,
                    "raydium_launchpad": true,
                    "meteora_dbc": true,
                    "boop": true,
                    "bonk": true,
                    "believe": true,
                    "jupiter_studio": true,
                    "bags": true,
                    "heaven": true,
                    "token_mill": true,
                    "cooking": true,
                    "soar": true,
                    "mayhem": true
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

    private async callPulse(type: string = 'new_pairs', overrides: any = {}) {
        try {
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
        // Fetch all tokens by combining new_pairs and migrated types
        try {
            const [newPairs, migrated] = await Promise.all([
                this.callPulse('new_pairs', overrides).catch(() => []),
                this.callPulse('migrated', overrides).catch(() => [])
            ]);
            
            // Combine and deduplicate by mint address
            const allTokens = [...(newPairs || []), ...(migrated || [])];
            const tokenMap = new Map<string, any>();
            
            allTokens.forEach(token => {
                // Ant.fun API returns 'base' as the mint address field
                const mint = token.base || token.mint || token.token_address || token.address || token.id;
                if (mint) {
                    tokenMap.set(mint, token);
                }
            });
            
            return Array.from(tokenMap.values());
        } catch (e) {
            console.error(`[${new Date().toLocaleString()}] Error in pulseAllTokens:`, e instanceof Error ? e.message : e);
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
