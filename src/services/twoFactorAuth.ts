import { generateSecret, generateURI, verifySync } from "otplib";

/** Official 2FA setup guide (linked from enrollment messages). */
export const TOTP_SETUP_HELP_WIKI_URL =
    "https://the-cryptofox-learning.com/api/wiki_sections.php?action=gate&wiki=sol&section=2fa&sig=Hbgb098gchMVHPM0pXHf9LxG2GD2bWHt";
import QRCode from "qrcode";
import { encryptSecretKey, decryptSecretKey } from "../config/security";
import { User } from "../models/user";

export function totpIssuer(): string {
    const s = (process.env.TOTP_ISSUER || "FoxyBoTracker").trim();
    return s || "FoxyBoTracker";
}

export function generateTotpSecretPlain(): string {
    return generateSecret();
}

export function buildTotpUri(secretPlain: string, accountLabel: string): string {
    return generateURI({ issuer: totpIssuer(), label: accountLabel, secret: secretPlain });
}

export async function totpQrPngBuffer(uri: string): Promise<Buffer> {
    return await QRCode.toBuffer(uri, { type: "png", width: 280, margin: 2 });
}

export function encryptTotpSecretForUser(plain: string): string {
    return encryptSecretKey(plain);
}

export function decryptTotpSecretForUser(enc: string): string {
    return decryptSecretKey(enc);
}

export function verifyTotp6(secretPlain: string, userInput: string): boolean {
    const token = userInput.trim().replace(/\s/g, "");
    if (!/^\d{6}$/.test(token)) return false;
    const result = verifySync({
        secret: secretPlain,
        token,
        epochTolerance: 30,
    });
    return result.valid === true;
}

export function userHasTotpEnabled(u: { totpSecretEnc?: string } | null | undefined): boolean {
    const enc = u && typeof (u as { totpSecretEnc?: string }).totpSecretEnc === "string" ? (u as { totpSecretEnc: string }).totpSecretEnc : "";
    return enc.trim().length > 0;
}

export async function saveTotpSetupPending(userId: number, secretPlain: string): Promise<void> {
    const enc = encryptTotpSecretForUser(secretPlain);
    await User.updateOne({ userId }, { $set: { totpSetupSecretEnc: enc } });
}

export type ConfirmTotpSetupResult = "ok" | "bad_code" | "no_pending";

export async function tryConfirmTotpSetup(userId: number, code: string): Promise<ConfirmTotpSetupResult> {
    const u = await User.findOne({ userId });
    const enc = (u as { totpSetupSecretEnc?: string } | null)?.totpSetupSecretEnc;
    if (!enc || !String(enc).trim()) return "no_pending";
    let plain: string;
    try {
        plain = decryptTotpSecretForUser(String(enc));
    } catch {
        return "no_pending";
    }
    if (!verifyTotp6(plain, code)) return "bad_code";
    await User.updateOne(
        { userId },
        {
            $set: { totpSecretEnc: enc },
            $unset: { totpSetupSecretEnc: 1 },
        },
    );
    return "ok";
}

export async function clearTotpSetupPending(userId: number): Promise<void> {
    await User.updateOne({ userId }, { $unset: { totpSetupSecretEnc: 1 } });
}

export async function disableUserTotp(userId: number): Promise<void> {
    await User.updateOne({ userId }, { $unset: { totpSecretEnc: 1, totpSetupSecretEnc: 1 } });
}

export async function verifyActiveTotpForUser(userId: number, code: string): Promise<boolean> {
    const u = await User.findOne({ userId });
    const enc = (u as { totpSecretEnc?: string } | null)?.totpSecretEnc;
    if (!enc || !String(enc).trim()) return false;
    try {
        return verifyTotp6(decryptTotpSecretForUser(String(enc)), code);
    } catch {
        return false;
    }
}
