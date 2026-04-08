import * as dotenv from "dotenv";

dotenv.config();

/** Silences node-telegram-bot-api DeprecationWarning about file content-type (see NTBA_FIX_350 in library). */
if (process.env.NTBA_FIX_350 === undefined) {
    process.env.NTBA_FIX_350 = "1";
}

const MODE = String(process.env.MODE ?? "").trim().toLowerCase();

/** `MODE=production` — suppress routine logs. Any other value (including empty) matches development-style logging. */
export function isProductionMode(): boolean {
    return MODE === "production";
}

export function isDevelopmentMode(): boolean {
    return !isProductionMode();
}

let consoleConfigured = false;

/**
 * In production: silence `console.log` / `console.info` / `console.debug`.
 * Keeps `console.warn` and `console.error` for operational visibility.
 * Call by importing this module first in the app entry (see `bot.ts`).
 */
export function configureConsoleForMode(): void {
    if (consoleConfigured) return;
    consoleConfigured = true;
    if (!isProductionMode()) return;
    const noop = (): void => undefined;
    // eslint-disable-next-line no-console
    console.log = noop;
    // eslint-disable-next-line no-console
    console.info = noop;
    // eslint-disable-next-line no-console
    console.debug = noop;
}

configureConsoleForMode();
