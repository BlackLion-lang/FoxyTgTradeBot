// // import axios from "axios";
// // import path from "path";
// // import fs from 'fs';
// // import { fileURLToPath } from "url";

// // // const __filename = fileURLToPath(import.meta.url);
// // // const __dirname = path.dirname(__filename);

// // export default class AxiomService {
// //   constructor() {
// //     console.log("AxiomService is running...");
// //   }

// //   readCookie() {
// //     try {
// //       const cookiePath = path.join(__dirname, '../data/cookie.txt');
// //       const cookieContent = fs.readFileSync(cookiePath, 'utf8').trim();

// //       // Check if it's just the placeholder content
// //       if (cookieContent.includes('# Placeholder cookie file') || cookieContent.includes('YOUR_TOKEN')) {
// //         console.log('⚠️  Cookie file contains placeholder content. Please update with valid Axiom.trade cookies.');
// //         return '';
// //       }

// //       return cookieContent;
// //     } catch (e) {
// //       console.log('⚠️  Could not read cookie file. Please ensure ../data/cookie.txt exists with valid Axiom.trade cookies.');
// //       return '';
// //     }
// //   }

// //   writeCookie(cookieStr: string) {
// //     try {
// //       const cookiePath = path.join(__dirname, '../data/cookie.txt');
// //       fs.writeFileSync(cookiePath, cookieStr.trim(), 'utf8');
// //       return true;
// //     } catch (e) {
// //       console.log('⚠️  Could not write to cookie file. Please check file permissions.');
// //       return false;
// //     }
// //   }

// //   async refreshAccessToken() {
// //     try {
// //       console.log(
// //         `[${new Date().toLocaleString()}] Refreshing access token...`
// //       );
// //       const headers = {
// //         accept: "application/json, text/plain, */*",
// //         "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
// //         "cache-control": "no-cache",
// //         dnt: "1",
// //         origin: "https://axiom.trade",
// //         pragma: "no-cache",
// //         priority: "u=1, i",
// //         referer: "https://axiom.trade/",
// //         "sec-ch-ua":
// //           '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
// //         "sec-ch-ua-mobile": "?0",
// //         "sec-ch-ua-platform": '"macOS"',
// //         "sec-fetch-dest": "empty",
// //         "sec-fetch-mode": "cors",
// //         "sec-fetch-site": "same-site",
// //         "user-agent":
// //           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
// //         cookie: this.readCookie(),
// //       };

// //       const { Agent } = await import('https');
// //       const response = await axios.post(
// //         "https://api8.axiom.trade/refresh-access-token",
// //         null,
// //         {
// //           headers,
// //           // Disable certificate verification if necessary (not recommended in production)
// //           httpsAgent: new Agent({
// //             rejectUnauthorized: false,
// //           }),
// //         }
// //       );


// //       if (response.status !== 200) {
// //         console.log(
// //           `[${new Date().toLocaleString()}] Could not refresh access token!`
// //         );
// //         // console.log("Response:", response.data);
// //         process.exit(1);
// //       }

// //       const cookies = response.headers["set-cookie"]
// //         ? (response.headers["set-cookie"]).join(" ")
// //         : "";
// //       let newCookie = "";

// //       const reAuthRefresh = new RegExp("auth-refresh-token=.*?;", "s").exec(cookies);
// //       if (reAuthRefresh) {
// //         newCookie += reAuthRefresh[0];
// //       }
// //       const reAuthAccess = new RegExp("auth-access-token=.*?;", "s").exec(cookies);
// //       if (reAuthAccess) {
// //         newCookie += " " + reAuthAccess[0];
// //       }

// //       if (!this.writeCookie(newCookie)) {
// //         throw new Error("Could not write cookie!");
// //       }
// //       console.log(`[${new Date().toLocaleString()}] Access token refreshed!`);
// //     } catch (e) {
// //       console.error(
// //         `[${new Date().toLocaleString()}] Could not refresh access token!`,
// //         e
// //       );
// //       process.exit(1);
// //     }
// //   }


// //   async pulse(overrides = {}) {
// //     try {
// //       const payload = {
// //         "filters": {
// //           "protocols": {
// //             "raydium": false,
// //             "pump": true,
// //             "pumpAmm": false,
// //             "launchLab": false,
// //             "virtualCurve": false,
// //             "launchACoin": false,
// //             "bonk": false,
// //             "boop": false,
// //             "meteoraAmm": false,
// //             "meteoraAmmV2": false,
// //             "moonshot": false
// //           },
// //           "searchKeywords": [],
// //           "excludeKeywords": [],
// //           "dexPaid": false,
// //           "mustEndInPump": false,
// //           "age": {
// //             "min": null,
// //             "max": null
// //           },
// //           "top10Holders": {
// //             "min": null,
// //             "max": null
// //           },
// //           "devHolding": {
// //             "min": null,
// //             "max": null
// //           },
// //           "snipers": {
// //             "min": null,
// //             "max": null
// //           },
// //           "insiders": {
// //             "min": null,
// //             "max": null
// //           },
// //           "bundle": {
// //             "min": null,
// //             "max": null
// //           },
// //           "holders": {
// //             "min": null,
// //             "max": null
// //           },
// //           "botUsers": {
// //             "min": null,
// //             "max": null
// //           },
// //           "bondingCurve": {
// //             "min": null,
// //             "max": null
// //           },
// //           "liquidity": {
// //             "min": null,
// //             "max": null
// //           },
// //           "volume": {
// //             "min": null,
// //             "max": null
// //           },
// //           "marketCap": {
// //             "min": null,
// //             "max": null
// //           },
// //           "fees": {
// //             "min": null,
// //             "max": null
// //           },
// //           "txns": {
// //             "min": null,
// //             "max": null
// //           },
// //           "numBuys": {
// //             "min": null,
// //             "max": null
// //           },
// //           "numSells": {
// //             "min": null,
// //             "max": null
// //           },
// //           "numMigrations": {
// //             "min": null,
// //             "max": null
// //           },
// //           "twitter": {
// //             "min": null,
// //             "max": null
// //           },
// //           "twitterExists": true,
// //           "website": false,
// //           "telegram": true,
// //           "atLeastOneSocial": true,
// //           ...overrides
// //         },

// //         "tab": "newPairs",
// //         "usdPerSol": 232.51,
// //       }

// //       const headers = {
// //         accept: "application/json, text/plain, */*",
// //         "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
// //         "cache-control": "no-cache",
// //         dnt: "1",
// //         origin: "https://axiom.trade",
// //         pragma: "no-cache",
// //         priority: "u=1, i",
// //         referer: "https://axiom.trade/",
// //         "sec-ch-ua":
// //           '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
// //         "sec-ch-ua-mobile": "?0",
// //         "sec-ch-ua-platform": '"macOS"',
// //         "sec-fetch-dest": "empty",
// //         "sec-fetch-mode": "cors",
// //         "sec-fetch-site": "same-site",
// //         "user-agent":
// //           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
// //         cookie: this.readCookie(),
// //       };

// //       const { Agent } = await import('https');
// //       const response = await axios.post(
// //         "https://api2.axiom.trade/pulse",
// //         payload,
// //         {
// //           headers,
// //           // Disable certificate verification if necessary (not recommended in production)
// //           httpsAgent: new Agent({
// //             rejectUnauthorized: false,
// //           }),
// //         }
// //       );

// //       const data = response.data;
// //       console.log(`[${new Date().toLocaleString()}] new tokens`, data.length, data.map((token: any) => token.tokenAddress).join(','));


// //       if (data.length === 0) {
// //         console.warn(`[${new Date().toLocaleString()}] No new tokens received.`);
// //       }

// //       return data;
// //     } catch (e) {
// //       console.error(
// //         `[${new Date().toLocaleString()}] Could not refresh access token!`,
// //         e
// //       );
// //     }
// //   }
// // }

// import axios from "axios";
// import path from "path";
// import fs from "fs";

// export default class AxiomService {
//   activity: Map<string, { history: { timestamp: number, numBuys: number}[] }> = new Map();
//   TOKEN_WINDOW = 5 * 60 * 1000; // 5 minutes
//   // maximum number of samples to keep per token to avoid memory growth
//   HISTORY_CAP = 60; // with 10s polling, ~10 minutes max; adjust as needed

//   // Rate limiting and request management
//   private lastRequestTime: number = 0;
//   private minRequestInterval: number = 5000; // Minimum 5 seconds between requests
//   private requestQueue: Array<{ resolve: (value: any[]) => void; reject: (error: any) => void; overrides: Record<string, any> }> = [];
//   private isProcessingQueue: boolean = false;
//   private cache: { data: any[]; timestamp: number; key: string } | null = null;
//   private cacheTTL: number = 10000; // Cache for 10 seconds
//   private consecutiveErrors: number = 0;
//   private backoffUntil: number = 0; // Timestamp when we can retry after backoff
//   private lastTokenRefresh: number = 0;
//   private minTokenRefreshInterval: number = 60000; // Minimum 1 minute between token refreshes

//   constructor() {
//     console.log("🚀 AxiomService initialized");
//   }

//   private getCookiePath(): string {
//     return path.join(__dirname, "../data/cookie.txt");
//   }

//   readCookie(): string {
//     try {
//       const cookiePath = this.getCookiePath();
//       const cookieContent = fs.readFileSync(cookiePath, "utf8").trim();

//       if (
//         cookieContent.includes("# Placeholder cookie file") ||
//         cookieContent.includes("YOUR_TOKEN")
//       ) {
//         console.log(
//           "⚠️  Cookie file contains placeholder content. Please update with valid Axiom.trade cookies."
//         );
//         return "";
//       }

//       return cookieContent;
//     } catch (e) {
//       console.log(
//         "⚠️  Could not read cookie file. Ensure ../data/cookie.txt exists with valid Axiom.trade cookies."
//       );
//       return "";
//     }
//   }

//   writeCookie(cookieStr: string): boolean {
//     try {
//       const cookiePath = this.getCookiePath();
//       fs.writeFileSync(cookiePath, cookieStr.trim(), "utf8");
//       return true;
//     } catch (e) {
//       console.log(
//         "⚠️  Could not write to cookie file. Please check file permissions."
//       );
//       return false;
//     }
//   }

//   // Get rate limit status for debugging
//   getRateLimitStatus(): { 
//     queueLength: number; 
//     backoffUntil: number; 
//     consecutiveErrors: number;
//     isProcessing: boolean;
//   } {
//     return {
//       queueLength: this.requestQueue.length,
//       backoffUntil: this.backoffUntil,
//       consecutiveErrors: this.consecutiveErrors,
//       isProcessing: this.isProcessingQueue,
//     };
//   }

//   async refreshAccessToken(): Promise<boolean> {
//     try {
//       // Prevent too frequent token refreshes
//       const now = Date.now();
//       const timeSinceLastRefresh = now - this.lastTokenRefresh;
//       if (timeSinceLastRefresh < this.minTokenRefreshInterval) {
//         const waitTime = this.minTokenRefreshInterval - timeSinceLastRefresh;
//         console.log(
//           `[${new Date().toLocaleString()}] ⏳ Waiting ${Math.ceil(waitTime / 1000)}s before token refresh...`
//         );
//         await new Promise((resolve) => setTimeout(resolve, waitTime));
//       }

//       console.log(`[${new Date().toLocaleString()}] 🔄 Refreshing access token...`);
//       this.lastTokenRefresh = Date.now();

//       const headers = {
//         accept: "application/json, text/plain, */*",
//         "accept-language": "en-US,en;q=0.9",
//         "cache-control": "no-cache",
//         dnt: "1",
//         origin: "https://axiom.trade",
//         pragma: "no-cache",
//         referer: "https://axiom.trade/",
//         "user-agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
//         cookie: this.readCookie(),
//       };

//       const { Agent } = await import("https");
//       const response = await axios.post(
//         "https://api8.axiom.trade/refresh-access-token",
//         null,
//         {
//           headers,
//           httpsAgent: new Agent({ rejectUnauthorized: false }),
//           validateStatus: () => true, // handle non-200 responses manually
//         }
//       );

//       // Handle rate limits gracefully
//       if (
//         response.status === 429 ||
//         /rate limit/i.test(JSON.stringify(response.data))
//       ) {
//         console.warn(
//           `[${new Date().toLocaleString()}] ⚠️ Rate limit reached. Waiting 60s before retry...`
//         );
//         await new Promise((res) => setTimeout(res, 60000));
//         return await this.refreshAccessToken();
//       }

//       if (response.status !== 200) {
//         console.error(
//           `[${new Date().toLocaleString()}] ❌ Failed to refresh token (status ${response.status})`
//         );
//         return false;
//       }

//       const cookies = response.headers["set-cookie"]?.join(" ") || "";
//       let newCookie = "";

//       const reAuthRefresh = /auth-refresh-token=.*?;/.exec(cookies);
//       if (reAuthRefresh) newCookie += reAuthRefresh[0];
//       const reAuthAccess = /auth-access-token=.*?;/.exec(cookies);
//       if (reAuthAccess) newCookie += " " + reAuthAccess[0];

//       if (!newCookie) {
//         console.error("⚠️  No valid cookie returned by Axiom.");
//         return false;
//       }

//       this.writeCookie(newCookie);
//       console.log(`[${new Date().toLocaleString()}] ✅ Access token refreshed!`);
//       return true;
//     } catch (err: any) {
//       console.error(
//         `[${new Date().toLocaleString()}] ❌ Error refreshing access token:`,
//         err.message
//       );
//       return false;
//     }
//   }

//   // Check cache first
//   private getCacheKey(overrides: Record<string, any>): string {
//     return JSON.stringify(overrides);
//   }

//   private getCachedResult(overrides: Record<string, any>): any[] | null {
//     if (this.cache) {
//       const now = Date.now();
//       const cacheKey = this.getCacheKey(overrides);
//       if (this.cache.key === cacheKey && (now - this.cache.timestamp) < this.cacheTTL) {
//         console.log(`[${new Date().toLocaleString()}] 📦 Using cached result`);
//         return this.cache.data;
//       }
//     }
//     return null;
//   }

//   private setCache(data: any[], overrides: Record<string, any>): void {
//     this.cache = {
//       data,
//       timestamp: Date.now(),
//       key: this.getCacheKey(overrides),
//     };
//   }

//   // Process request queue with rate limiting
//   private async processQueue(): Promise<void> {
//     if (this.isProcessingQueue || this.requestQueue.length === 0) {
//       return;
//     }

//     this.isProcessingQueue = true;

//     while (this.requestQueue.length > 0) {
//       // Check if we're in backoff period
//       const now = Date.now();
//       if (now < this.backoffUntil) {
//         const waitTime = this.backoffUntil - now;
//         console.log(
//           `[${new Date().toLocaleString()}] ⏳ Rate limit backoff: waiting ${Math.ceil(waitTime / 1000)}s`
//         );
//         await new Promise((resolve) => setTimeout(resolve, waitTime));
//       }

//       // Ensure minimum interval between requests
//       const timeSinceLastRequest = now - this.lastRequestTime;
//       if (timeSinceLastRequest < this.minRequestInterval) {
//         const waitTime = this.minRequestInterval - timeSinceLastRequest;
//         await new Promise((resolve) => setTimeout(resolve, waitTime));
//       }

//       const request = this.requestQueue.shift();
//       if (!request) break;

//       try {
//         const result = await this.executePulse(request.overrides);
//         this.consecutiveErrors = 0; // Reset error counter on success
//         this.backoffUntil = 0; // Clear backoff on success
//         request.resolve(result);
//       } catch (error) {
//         request.reject(error);
//       }

//       this.lastRequestTime = Date.now();
//     }

//     this.isProcessingQueue = false;
//   }

//   // Main pulse method with rate limiting and queuing
//   async pulse(overrides: Record<string, any> = {}, retryOnAuth = true): Promise<any[]> {
//     // Check cache first
//     const cached = this.getCachedResult(overrides);
//     if (cached !== null) {
//       return cached;
//     }

//     // Queue the request if we're processing or need to wait
//     return new Promise((resolve, reject) => {
//       this.requestQueue.push({ resolve, reject, overrides });
//       this.processQueue();
//     });
//   }

//   // Execute the actual pulse request
//   private async executePulse(overrides: Record<string, any> = {}, retryOnAuth = true): Promise<any[]> {
//     try {
//       const payload = {
//         filters: {
//           protocols: {
//             raydium: false,
//             pump: true,
//             pumpAmm: false,
//             launchLab: false,
//             virtualCurve: false,
//             launchACoin: false,
//             bonk: false,
//             boop: false,
//             meteoraAmm: false,
//             meteoraAmmV2: false,
//             moonshot: false,
//           },
//           searchKeywords: [],
//           excludeKeywords: [],
//           dexPaid: false,
//           mustEndInPump: false,
//           twitterExists: true,
//           website: false,
//           telegram: true,
//           atLeastOneSocial: true,
//           ...overrides,
//         },
//         tab: "newPairs",
//         usdPerSol: 230.0,
//       };

//       const headers = {
//         accept: "application/json, text/plain, */*",
//         "accept-language": "en-US,en;q=0.9",
//         "cache-control": "no-cache",
//         dnt: "1",
//         origin: "https://axiom.trade",
//         pragma: "no-cache",
//         referer: "https://axiom.trade/",
//         "user-agent":
//           "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
//         cookie: this.readCookie(),
//       };

//       const { Agent } = await import("https");
      
//       // Try multiple API endpoints as fallbacks
//       const apiEndpoints = [
//         "https://api8.axiom.trade/pulse",  // Same as refresh token endpoint
//         "https://api2.axiom.trade/pulse",  // Original endpoint
//         "https://api1.axiom.trade/pulse",
//         "https://api3.axiom.trade/pulse",
//       ];

//       let response: any = null;
//       let lastError: any = null;

//       for (const endpoint of apiEndpoints) {
//         try {
//           response = await axios.post(
//             endpoint,
//             payload,
//             {
//               headers,
//               httpsAgent: new Agent({ rejectUnauthorized: false }),
//               validateStatus: (status) => status < 500, // Don't throw on 4xx errors
//             }
//           );

//           // Handle rate limiting (429)
//           if (response.status === 429) {
//             this.consecutiveErrors++;
//             // Exponential backoff: 30s, 60s, 120s, etc. (max 5 minutes)
//             const backoffSeconds = Math.min(30 * Math.pow(2, this.consecutiveErrors - 1), 300);
//             this.backoffUntil = Date.now() + (backoffSeconds * 1000);
//             console.warn(
//               `[${new Date().toLocaleString()}] ⚠️ Rate limit (429) on ${endpoint}. Backing off for ${backoffSeconds}s`
//             );
//             lastError = { status: response.status, data: response.data, endpoint, rateLimited: true };
//             // Don't try other endpoints if rate limited - wait instead
//             throw new Error(`Rate limited: ${backoffSeconds}s backoff required`);
//           }

//           // If we got a successful response, use it
//           if (response.status === 200) {
//             console.log(
//               `[${new Date().toLocaleString()}] ✅ Using endpoint: ${endpoint}`
//             );
//             break;
//           }

//           // If it's an auth error and we haven't retried yet, refresh token and retry this endpoint
//           if ((response.status === 401 || response.status === 403) && retryOnAuth) {
//             console.log(
//               `[${new Date().toLocaleString()}] 🔄 Auth error (${response.status}) on ${endpoint}, refreshing token...`
//             );
//             const refreshed = await this.refreshAccessToken();
//             if (refreshed) {
//               // Update headers with new cookie
//               headers.cookie = this.readCookie();
//               // Retry the same endpoint
//               response = await axios.post(
//                 endpoint,
//                 payload,
//                 {
//                   headers,
//                   httpsAgent: new Agent({ rejectUnauthorized: false }),
//                   validateStatus: (status) => status < 500,
//                 }
//               );
//               if (response.status === 200) {
//                 console.log(
//                   `[${new Date().toLocaleString()}] ✅ Using endpoint: ${endpoint} (after token refresh)`
//                 );
//                 break;
//               }
//             }
//           }

//           // 404 means endpoint doesn't exist, try next one
//           if (response.status === 404) {
//             console.log(
//               `[${new Date().toLocaleString()}] ⚠️  Endpoint ${endpoint} returned 404, trying next...`
//             );
//             lastError = { status: response.status, data: response.data, endpoint };
//             continue;
//           }

//           // Other errors - save and try next endpoint
//           lastError = { status: response.status, data: response.data, endpoint };
//         } catch (e: any) {
//           lastError = { error: e.message, endpoint };
//           continue;
//         }
//       }

//       // If no endpoint worked, handle the error
//       if (!response || response.status !== 200) {
//         // Check if it's an authentication error
//         if (response && (response.status === 401 || response.status === 403) && retryOnAuth) {
//           console.log(
//             `[${new Date().toLocaleString()}] 🔄 Auth error (${response.status}), refreshing token and retrying...`
//           );
//           const refreshed = await this.refreshAccessToken();
//           if (refreshed) {
//             // Retry once after token refresh (will go through queue)
//             return await this.executePulse(overrides, false);
//           }
//         }

//         // Increment error counter for non-auth errors
//         if (!response || (response.status !== 401 && response.status !== 403)) {
//           this.consecutiveErrors++;
//         }

//         // Log detailed error information
//         const errorMsg = response 
//           ? (response.data 
//               ? `Status ${response.status}: ${JSON.stringify(response.data).substring(0, 200)}`
//               : `Status ${response.status}`)
//           : (lastError?.error || "All endpoints failed");
        
//         console.error(
//           `[${new Date().toLocaleString()}] ❌ Pulse request failed: ${errorMsg}`
//         );

//         // For 404, log that all endpoints failed
//         if (!response || response.status === 404) {
//           console.error(
//             `[${new Date().toLocaleString()}] ⚠️  All endpoints returned 404. The API endpoints may have changed.`
//           );
//         }

//         return [];
//       }

//       const data = response.data;
//       console.log(
//         `[${new Date().toLocaleString()}] ✅ Received ${data.length} new tokens`
//       );

//       // Cache successful result
//       this.setCache(data, overrides);
//       this.consecutiveErrors = 0; // Reset error counter on success
//       this.backoffUntil = 0; // Clear backoff on success

//       // console.log(`[${new Date().toLocaleString()}] new tokens`, data.length, data.map((token: any) => token.tokenAddress).join(','));

//       return data;
//     } catch (e: any) {
//       // Handle network errors or other exceptions
//       const statusCode = e.response?.status;
//       const errorMessage = e.response?.data 
//         ? `${e.message} - Response: ${JSON.stringify(e.response.data).substring(0, 200)}`
//         : e.message;

//       // Check if it's a rate limit error we threw
//       if (e.message?.includes("Rate limited")) {
//         // Re-throw to be handled by queue processor
//         throw e;
//       }

//       console.error(
//         `[${new Date().toLocaleString()}] ❌ Pulse request failed:`,
//         errorMessage
//       );

//       // Increment error counter
//       if (statusCode !== 401 && statusCode !== 403) {
//         this.consecutiveErrors++;
//       }

//       // If it's an auth error and we haven't retried yet, try refreshing token
//       if ((statusCode === 401 || statusCode === 403) && retryOnAuth) {
//         console.log(
//           `[${new Date().toLocaleString()}] 🔄 Auth error (${statusCode}), refreshing token and retrying...`
//         );
//         const refreshed = await this.refreshAccessToken();
//         if (refreshed) {
//           // Retry once after token refresh (will go through queue)
//           return await this.executePulse(overrides, false);
//         }
//       }

//       // For 404, provide more context
//       if (statusCode === 404) {
//         console.error(
//           `[${new Date().toLocaleString()}] ⚠️  Endpoint not found (404). The API endpoint may have changed or the request format is incorrect.`
//         );
//       }

//       return [];
//     }
//   }

//   // async getMostActiveToken(): Promise<any | null> {
//   //   const data = await this.pulse();

//   //   if (!data || data.length === 0) {
//   //     console.log("⚠️  No tokens received from pulse().");
//   //     return null;
//   //   }

//   //   const sorted = data.sort(
//   //     (a: any, b: any) =>
//   //       (b.numBuys + b.numSells) - (a.numBuys + a.numSells)
//   //   );
//   //   const top = sorted[0];

//   //   console.log(
//   //     `🔥 Most active token: ${top.name} (${top.tokenAddress}) | Buys: ${top.numBuys} | Sells: ${top.numSells}`
//   //   );
//   //   return top;
//   // }

//   async getRecentlyActiveTokens(minBuys = 3, filters: Record<string, any> = {}): Promise<any[]> {
//     try {
//       const now = Date.now();

//       const data = await this.pulse(filters);

//       const activeTokens: any[] = [];

//       for (const token of data) {
//         const tokenAddress = token.tokenAddress ?? token.address ?? token.id;
//         if (!tokenAddress) continue;

//         const numBuys = Number(token.numBuys ?? 0);

//         if (!this.activity.has(tokenAddress)) {
//           this.activity.set(tokenAddress, { history: [] });
//         }

//         const tokenData = this.activity.get(tokenAddress)!;

//         // push newest sample
//         tokenData.history.push({ timestamp: now, numBuys });

//         // cap history length
//         if (tokenData.history.length > this.HISTORY_CAP) {
//           tokenData.history.splice(0, tokenData.history.length - this.HISTORY_CAP);
//         }

//         // prune entries older than TOKEN_WINDOW
//         tokenData.history = tokenData.history.filter((s) => now - s.timestamp <= this.TOKEN_WINDOW);

//         // compute totals within the window
//         let totalBuys = 0;
//         let totalSells = 0;
//         for (const s of tokenData.history) {
//           totalBuys += s.numBuys;
//         }

//         if (totalBuys >= minBuys) {
//           // include totals and most recent sample
//           activeTokens.push({
//             ...token,
//             tokenAddress,
//             totalBuys,
//             lastSample: tokenData.history[tokenData.history.length - 1],
//           });
//         }
//       }

//       // sort highest activity first
//       activeTokens.sort((a, b) => b.totalBuys - a.totalBuys);
//       return activeTokens;
//     } catch (e) {
//       console.error("❌ getRecentlyActiveTokens failed:", e);
//       return [];
//     }
//   }

//   cleanupActivity(): void {
//     try {
//       const now = Date.now();
//       const expireAfter = this.TOKEN_WINDOW * 2;
//       const removed: string[] = [];

//       for (const [addr, data] of this.activity.entries()) {
//         const last = data.history.length ? data.history[data.history.length - 1].timestamp : 0;
//         if (!last || now - last > expireAfter) {
//           this.activity.delete(addr);
//           removed.push(addr);
//         }
//       }

//       if (removed.length > 0) {
//         console.log(`[${new Date().toLocaleString()}] 🧹 cleanupActivity removed ${removed.length} stale tokens`);
//       }
//     } catch (e) {
//       console.error("⚠️ cleanupActivity error:", e);
//     }
//   }
// }
