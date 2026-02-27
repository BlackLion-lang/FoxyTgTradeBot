import { Connection, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { PUMP_FUN_PROGRAM_ID } from "./config";

const PUMP_CREATE_DISCRIMINATOR = new Uint8Array([24, 30, 200, 40, 5, 28, 7, 119]);

export type TokenCreationResult = {
    mint: string;
    creator: string;
    signature: string;
    slot: number;
};

function buffersEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

export async function parseTokenCreation(
    conn: Connection,
    signature: string,
    expectedCreator: string,
    commitment: "confirmed" | "finalized" = "confirmed"
): Promise<TokenCreationResult | null> {
    let tx: { transaction: { message: any }; slot: number } | null = null;
    try {
        tx = await conn.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
            commitment,
        });
    } catch {
        return null;
    }
    if (!tx?.transaction?.message) return null;

    const message = tx.transaction.message;
    let accountKeys: { get: (i: number) => PublicKey | undefined };
    if (message.addressTableLookups?.length > 0) {
        const luts = await Promise.all(
            message.addressTableLookups.map((lut: { accountKey: string }) =>
                conn.getAddressLookupTable(new PublicKey(lut.accountKey))
            )
        );
        const lutAccounts = luts.map((r) => r.value).filter(Boolean) as any[];
        accountKeys = message.getAccountKeys({ addressLookupTableAccounts: lutAccounts });
    } else {
        accountKeys = message.getAccountKeys?.() ?? null;
    }
    if (!accountKeys) return null;

    const feePayerKey = accountKeys.get(0);
    if (!feePayerKey) return null;
    const feePayerStr = feePayerKey.toBase58();
    if (feePayerStr !== expectedCreator) return null;

    const pumpPubkey = new PublicKey(PUMP_FUN_PROGRAM_ID);
    const instructions = message.compiledInstructions ?? message.instructions;
    if (!Array.isArray(instructions)) return null;

    for (const ix of instructions) {
        const programId = accountKeys.get(ix.programIdIndex);
        if (!programId?.equals(pumpPubkey)) continue;

        let bytes: Uint8Array;
        const data = ix.data;
        if (typeof data === "string") {
            try {
                bytes = new Uint8Array(Buffer.from(data, "base64"));
            } catch {
                try {
                    bytes = new Uint8Array(bs58.decode(data));
                } catch {
                    continue;
                }
            }
        } else if (data && (data instanceof Uint8Array || Buffer.isBuffer(data))) {
            bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        } else {
            continue;
        }
        if (bytes.length < 8) continue;
        const slice = bytes.subarray ? bytes.subarray(0, 8) : new Uint8Array(bytes).subarray(0, 8);
        if (!buffersEqual(slice, PUMP_CREATE_DISCRIMINATOR)) continue;

        const keyIndexes = ix.accountKeyIndexes ?? ix.accounts;
        if (!Array.isArray(keyIndexes) || keyIndexes.length < 7) continue;
        const mintKey = accountKeys.get(keyIndexes[6]);
        if (!mintKey) continue;

        return {
            mint: mintKey.toBase58(),
            creator: feePayerStr,
            signature,
            slot: tx.slot ?? 0,
        };
    }
    return null;
}
