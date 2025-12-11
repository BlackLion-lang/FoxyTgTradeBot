import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
import { JITO_IDENTITY, JITO_AUTH, JITO_TIP_ACCOUNTS, JITO_RELAYS } from "../config/constant.js";

async function sendToRelay(url: string, encodedSignedTransactions: string[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Identity": JITO_IDENTITY || '',
      "X-Authorization": JITO_AUTH || ''
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "sendBundle",
      params: [encodedSignedTransactions]
    })
  });

  console.log(res);

  const json = await res.json().catch(() => ({}));
  if (json?.error?.code === -32097) throw new Error(`Rate-limited at ${url}`);
  if (json?.error) throw new Error(`Relay ${url} error: ${JSON.stringify(json.error)}`);
  return url;
}

export function getRandomTipAccount(index = -1) {
  const randomIndex = Math.floor(Math.random() * (JITO_TIP_ACCOUNTS.length - 1));
  return new PublicKey(JITO_TIP_ACCOUNTS[index < 0 ? randomIndex : index]);
}

export async function submitBundle(txs: VersionedTransaction[]) {
  const bundle = txs.map(tx => bs58.encode(tx.serialize()));
  console.log('Submit jito bundle...');

  try {
    const maxAttempts = 3;
    const delayMs = 2000; // 2 second delay between attempts

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const response = await axios.post(JITO_RELAYS[3], {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [bundle],
      });

      const bundleId = response.data.result;
      console.log(`Bundle submitted with ID: ${bundleId}`);

      // Poll for confirmation status
      const confirmed = await pollBundleStatus(bundleId);

      if (confirmed) {
        console.log(`Bundle ${bundleId} confirmed! 🚀`);
        // const signatures = txs.map(tx => bs58.encode(tx.signatures[0]));
        // signatures.forEach(signature => {
        //     console.log(`Transaction : https://solscan.io/tx/${signature}`);
        // });
        break;
      } else {
        if (attempt < maxAttempts) {
          console.log(`Bundle submission failed, retrying... (${attempt}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          console.error('Bundle submission failed after maximum attempts.');
        }
      }
    }
  } catch (error) {
    console.error('Error submitting bundle', error instanceof Error ? error.message : String(error));
  }
}

async function pollBundleStatus(bundleId: string) {
  const maxAttempts = 2;
  const delayMs = 4000; // 4 second delay between polls

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Checking bundle status (attempt ${attempt}/${maxAttempts})...`);

      const response = await axios.post(JITO_RELAYS[3], {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBundleStatuses',
        params: [[bundleId]]
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout
      });

      const data = response.data;

      console.log(`Status ${attempt}`, data.result);

      if (data.result.value && data.result.value.length > 0) {
        const bundleStatus = data.result.value[0];

        console.log(`Bundle status: ${bundleStatus.confirmation_status}`);

        // Check if bundle is confirmed or finalized
        if (bundleStatus.confirmation_status === 'confirmed' ||
          bundleStatus.confirmation_status === 'finalized') {
          return true;
        }

        // Check for errors
        if (bundleStatus.err) {
          console.error('Bundle error:', bundleStatus.err);
          return false;
        }
      }

      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

    } catch (error) {
      console.error(`Error checking bundle status (attempt ${attempt}):`);

      // Wait before retry (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

export { sendToRelay };