// import axios from "axios";
// import path from "path";
// import fs from 'fs';
// import { fileURLToPath } from "url";

// // const __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

// export default class AxiomService {
//   constructor() {
//     console.log("AxiomService is running...");
//   }

//   readCookie() {
//     try {
//       const cookiePath = path.join(__dirname, '../data/cookie.txt');
//       const cookieContent = fs.readFileSync(cookiePath, 'utf8').trim();

//       // Check if it's just the placeholder content
//       if (cookieContent.includes('# Placeholder cookie file') || cookieContent.includes('YOUR_TOKEN')) {
//         console.log('⚠️  Cookie file contains placeholder content. Please update with valid Axiom.trade cookies.');
//         return '';
//       }

//       return cookieContent;
//     } catch (e) {
//       console.log('⚠️  Could not read cookie file. Please ensure ../data/cookie.txt exists with valid Axiom.trade cookies.');
//       return '';
//     }
//   }

//   writeCookie(cookieStr: string) {
//     try {
//       const cookiePath = path.join(__dirname, '../data/cookie.txt');
//       fs.writeFileSync(cookiePath, cookieStr.trim(), 'utf8');
//       return true;
//     } catch (e) {
//       console.log('⚠️  Could not write to cookie file. Please check file permissions.');
//       return false;
//     }
//   }

//   async refreshAccessToken() {
//     try {
//       console.log(
//         `[${new Date().toLocaleString()}] Refreshing access token...`
//       );
//       const headers = {
//         accept: "application/json, text/plain, */*",
//         "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
//         "cache-control": "no-cache",
//         dnt: "1",
//         origin: "https://axiom.trade",
//         pragma: "no-cache",
//         priority: "u=1, i",
//         referer: "https://axiom.trade/",
//         "sec-ch-ua":
//           '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
//         "sec-ch-ua-mobile": "?0",
//         "sec-ch-ua-platform": '"macOS"',
//         "sec-fetch-dest": "empty",
//         "sec-fetch-mode": "cors",
//         "sec-fetch-site": "same-site",
//         "user-agent":
//           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
//         cookie: this.readCookie(),
//       };

//       const { Agent } = await import('https');
//       const response = await axios.post(
//         "https://api8.axiom.trade/refresh-access-token",
//         null,
//         {
//           headers,
//           // Disable certificate verification if necessary (not recommended in production)
//           httpsAgent: new Agent({
//             rejectUnauthorized: false,
//           }),
//         }
//       );


//       if (response.status !== 200) {
//         console.log(
//           `[${new Date().toLocaleString()}] Could not refresh access token!`
//         );
//         // console.log("Response:", response.data);
//         process.exit(1);
//       }

//       const cookies = response.headers["set-cookie"]
//         ? (response.headers["set-cookie"]).join(" ")
//         : "";
//       let newCookie = "";

//       const reAuthRefresh = new RegExp("auth-refresh-token=.*?;", "s").exec(cookies);
//       if (reAuthRefresh) {
//         newCookie += reAuthRefresh[0];
//       }
//       const reAuthAccess = new RegExp("auth-access-token=.*?;", "s").exec(cookies);
//       if (reAuthAccess) {
//         newCookie += " " + reAuthAccess[0];
//       }

//       if (!this.writeCookie(newCookie)) {
//         throw new Error("Could not write cookie!");
//       }
//       console.log(`[${new Date().toLocaleString()}] Access token refreshed!`);
//     } catch (e) {
//       console.error(
//         `[${new Date().toLocaleString()}] Could not refresh access token!`,
//         e
//       );
//       process.exit(1);
//     }
//   }


//   async pulse(overrides = {}) {
//     try {
//       const payload = {
//         "filters": {
//           "protocols": {
//             "raydium": false,
//             "pump": true,
//             "pumpAmm": false,
//             "launchLab": false,
//             "virtualCurve": false,
//             "launchACoin": false,
//             "bonk": false,
//             "boop": false,
//             "meteoraAmm": false,
//             "meteoraAmmV2": false,
//             "moonshot": false
//           },
//           "searchKeywords": [],
//           "excludeKeywords": [],
//           "dexPaid": false,
//           "mustEndInPump": false,
//           "age": {
//             "min": null,
//             "max": null
//           },
//           "top10Holders": {
//             "min": null,
//             "max": null
//           },
//           "devHolding": {
//             "min": null,
//             "max": null
//           },
//           "snipers": {
//             "min": null,
//             "max": null
//           },
//           "insiders": {
//             "min": null,
//             "max": null
//           },
//           "bundle": {
//             "min": null,
//             "max": null
//           },
//           "holders": {
//             "min": null,
//             "max": null
//           },
//           "botUsers": {
//             "min": null,
//             "max": null
//           },
//           "bondingCurve": {
//             "min": null,
//             "max": null
//           },
//           "liquidity": {
//             "min": null,
//             "max": null
//           },
//           "volume": {
//             "min": null,
//             "max": null
//           },
//           "marketCap": {
//             "min": null,
//             "max": null
//           },
//           "fees": {
//             "min": null,
//             "max": null
//           },
//           "txns": {
//             "min": null,
//             "max": null
//           },
//           "numBuys": {
//             "min": null,
//             "max": null
//           },
//           "numSells": {
//             "min": null,
//             "max": null
//           },
//           "numMigrations": {
//             "min": null,
//             "max": null
//           },
//           "twitter": {
//             "min": null,
//             "max": null
//           },
//           "twitterExists": true,
//           "website": false,
//           "telegram": true,
//           "atLeastOneSocial": true,
//           ...overrides
//         },

//         "tab": "newPairs",
//         "usdPerSol": 232.51,
//       }

//       const headers = {
//         accept: "application/json, text/plain, */*",
//         "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
//         "cache-control": "no-cache",
//         dnt: "1",
//         origin: "https://axiom.trade",
//         pragma: "no-cache",
//         priority: "u=1, i",
//         referer: "https://axiom.trade/",
//         "sec-ch-ua":
//           '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
//         "sec-ch-ua-mobile": "?0",
//         "sec-ch-ua-platform": '"macOS"',
//         "sec-fetch-dest": "empty",
//         "sec-fetch-mode": "cors",
//         "sec-fetch-site": "same-site",
//         "user-agent":
//           "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
//         cookie: this.readCookie(),
//       };

//       const { Agent } = await import('https');
//       const response = await axios.post(
//         "https://api2.axiom.trade/pulse",
//         payload,
//         {
//           headers,
//           // Disable certificate verification if necessary (not recommended in production)
//           httpsAgent: new Agent({
//             rejectUnauthorized: false,
//           }),
//         }
//       );

//       const data = response.data;
//       console.log(`[${new Date().toLocaleString()}] new tokens`, data.length, data.map((token: any) => token.tokenAddress).join(','));


//       if (data.length === 0) {
//         console.warn(`[${new Date().toLocaleString()}] No new tokens received.`);
//       }

//       return data;
//     } catch (e) {
//       console.error(
//         `[${new Date().toLocaleString()}] Could not refresh access token!`,
//         e
//       );
//     }
//   }
// }

import axios from "axios";
import path from "path";
import fs from "fs";

export default class AxiomService {
  activity: Map<string, { history: { timestamp: number, numBuys: number}[] }> = new Map();
  TOKEN_WINDOW = 5 * 60 * 1000; // 5 minutes
  // maximum number of samples to keep per token to avoid memory growth
  HISTORY_CAP = 60; // with 10s polling, ~10 minutes max; adjust as needed

  constructor() {
    console.log("🚀 AxiomService initialized");
  }

  private getCookiePath(): string {
    return path.join(__dirname, "../data/cookie.txt");
  }

  readCookie(): string {
    try {
      const cookiePath = this.getCookiePath();
      const cookieContent = fs.readFileSync(cookiePath, "utf8").trim();

      if (
        cookieContent.includes("# Placeholder cookie file") ||
        cookieContent.includes("YOUR_TOKEN")
      ) {
        console.log(
          "⚠️  Cookie file contains placeholder content. Please update with valid Axiom.trade cookies."
        );
        return "";
      }

      return cookieContent;
    } catch (e) {
      console.log(
        "⚠️  Could not read cookie file. Ensure ../data/cookie.txt exists with valid Axiom.trade cookies."
      );
      return "";
    }
  }

  writeCookie(cookieStr: string): boolean {
    try {
      const cookiePath = this.getCookiePath();
      fs.writeFileSync(cookiePath, cookieStr.trim(), "utf8");
      return true;
    } catch (e) {
      console.log(
        "⚠️  Could not write to cookie file. Please check file permissions."
      );
      return false;
    }
  }

  async refreshAccessToken(): Promise<boolean> {
    try {
      console.log(`[${new Date().toLocaleString()}] 🔄 Refreshing access token...`);

      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        dnt: "1",
        origin: "https://axiom.trade",
        pragma: "no-cache",
        referer: "https://axiom.trade/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        cookie: this.readCookie(),
      };

      const { Agent } = await import("https");
      const response = await axios.post(
        "https://api8.axiom.trade/refresh-access-token",
        null,
        {
          headers,
          httpsAgent: new Agent({ rejectUnauthorized: false }),
          validateStatus: () => true, // handle non-200 responses manually
        }
      );

      // Handle rate limits gracefully
      if (
        response.status === 429 ||
        /rate limit/i.test(JSON.stringify(response.data))
      ) {
        console.warn(
          `[${new Date().toLocaleString()}] ⚠️ Rate limit reached. Waiting 60s before retry...`
        );
        await new Promise((res) => setTimeout(res, 60000));
        return await this.refreshAccessToken();
      }

      if (response.status !== 200) {
        console.error(
          `[${new Date().toLocaleString()}] ❌ Failed to refresh token (status ${response.status})`
        );
        return false;
      }

      const cookies = response.headers["set-cookie"]?.join(" ") || "";
      let newCookie = "";

      const reAuthRefresh = /auth-refresh-token=.*?;/.exec(cookies);
      if (reAuthRefresh) newCookie += reAuthRefresh[0];
      const reAuthAccess = /auth-access-token=.*?;/.exec(cookies);
      if (reAuthAccess) newCookie += " " + reAuthAccess[0];

      if (!newCookie) {
        console.error("⚠️  No valid cookie returned by Axiom.");
        return false;
      }

      this.writeCookie(newCookie);
      console.log(`[${new Date().toLocaleString()}] ✅ Access token refreshed!`);
      return true;
    } catch (err: any) {
      console.error(
        `[${new Date().toLocaleString()}] ❌ Error refreshing access token:`,
        err.message
      );
      return false;
    }
  }

  async pulse(overrides: Record<string, any> = {}): Promise<any[]> {
    try {
      const payload = {
        filters: {
          protocols: {
            raydium: false,
            pump: true,
            pumpAmm: false,
            launchLab: false,
            virtualCurve: false,
            launchACoin: false,
            bonk: false,
            boop: false,
            meteoraAmm: false,
            meteoraAmmV2: false,
            moonshot: false,
          },
          searchKeywords: [],
          excludeKeywords: [],
          dexPaid: false,
          mustEndInPump: false,
          twitterExists: true,
          website: false,
          telegram: true,
          atLeastOneSocial: true,
          ...overrides,
        },
        tab: "newPairs",
        usdPerSol: 230.0,
      };

      const headers = {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        dnt: "1",
        origin: "https://axiom.trade",
        pragma: "no-cache",
        referer: "https://axiom.trade/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        cookie: this.readCookie(),
      };

      const { Agent } = await import("https");
      const response = await axios.post(
        "https://api2.axiom.trade/pulse",
        payload,
        {
          headers,
          httpsAgent: new Agent({ rejectUnauthorized: false }),
        }
      );

      const data = response.data;
      console.log(
        `[${new Date().toLocaleString()}] ✅ Received ${data.length} new tokens`
      );

      // console.log(`[${new Date().toLocaleString()}] new tokens`, data.length, data.map((token: any) => token.tokenAddress).join(','));

      return data;
    } catch (e: any) {
      console.error(
        `[${new Date().toLocaleString()}] ❌ Pulse request failed:`,
        e.message
      );
      return [];
    }
  }

  // async getMostActiveToken(): Promise<any | null> {
  //   const data = await this.pulse();

  //   if (!data || data.length === 0) {
  //     console.log("⚠️  No tokens received from pulse().");
  //     return null;
  //   }

  //   const sorted = data.sort(
  //     (a: any, b: any) =>
  //       (b.numBuys + b.numSells) - (a.numBuys + a.numSells)
  //   );
  //   const top = sorted[0];

  //   console.log(
  //     `🔥 Most active token: ${top.name} (${top.tokenAddress}) | Buys: ${top.numBuys} | Sells: ${top.numSells}`
  //   );
  //   return top;
  // }

  async getRecentlyActiveTokens(minBuys = 3, filters: Record<string, any> = {}): Promise<any[]> {
    try {
      const now = Date.now();

      const data = await this.pulse(filters);

      const activeTokens: any[] = [];

      for (const token of data) {
        const tokenAddress = token.tokenAddress ?? token.address ?? token.id;
        if (!tokenAddress) continue;

        const numBuys = Number(token.numBuys ?? 0);

        if (!this.activity.has(tokenAddress)) {
          this.activity.set(tokenAddress, { history: [] });
        }

        const tokenData = this.activity.get(tokenAddress)!;

        // push newest sample
        tokenData.history.push({ timestamp: now, numBuys });

        // cap history length
        if (tokenData.history.length > this.HISTORY_CAP) {
          tokenData.history.splice(0, tokenData.history.length - this.HISTORY_CAP);
        }

        // prune entries older than TOKEN_WINDOW
        tokenData.history = tokenData.history.filter((s) => now - s.timestamp <= this.TOKEN_WINDOW);

        // compute totals within the window
        let totalBuys = 0;
        let totalSells = 0;
        for (const s of tokenData.history) {
          totalBuys += s.numBuys;
        }

        if (totalBuys >= minBuys) {
          // include totals and most recent sample
          activeTokens.push({
            ...token,
            tokenAddress,
            totalBuys,
            lastSample: tokenData.history[tokenData.history.length - 1],
          });
        }
      }

      // sort highest activity first
      activeTokens.sort((a, b) => b.totalBuys - a.totalBuys);
      return activeTokens;
    } catch (e) {
      console.error("❌ getRecentlyActiveTokens failed:", e);
      return [];
    }
  }

  cleanupActivity(): void {
    try {
      const now = Date.now();
      const expireAfter = this.TOKEN_WINDOW * 2;
      const removed: string[] = [];

      for (const [addr, data] of this.activity.entries()) {
        const last = data.history.length ? data.history[data.history.length - 1].timestamp : 0;
        if (!last || now - last > expireAfter) {
          this.activity.delete(addr);
          removed.push(addr);
        }
      }

      if (removed.length > 0) {
        console.log(`[${new Date().toLocaleString()}] 🧹 cleanupActivity removed ${removed.length} stale tokens`);
      }
    } catch (e) {
      console.error("⚠️ cleanupActivity error:", e);
    }
  }
}
