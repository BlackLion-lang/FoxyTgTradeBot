/**
 * Pump.fun token launch detection via PumpApi stream (same approach as backend).
 * Connects to wss://stream.pumpapi.io/ and emits create events; filter by txSigner for target wallet launches.
 * @see https://pumpapi.io/tutorial-basics/stream/
 */

import WebSocket from "ws";
import { logger } from "../utils/logger";

const TAG = "PumpStream";
const PUMP_STREAM_URL = "wss://stream.pumpapi.io/";
const RECONNECT_DELAY_MS = 5000;

export type PumpStreamCreateEvent = {
    txType: "create";
    pool?: string | null;
    mint: string;
    txSigner: string;
    signature?: string;
    symbol?: string;
    initialBuy?: number;
    tokenProgram?: string;
    timestamp?: number | string;
    [key: string]: unknown;
};

/** Buy event from pumpapi.io stream (target wallet purchased a Pump.fun token). */
export type PumpStreamBuyEvent = {
    txType: "buy";
    pool?: string | null;
    mint: string;
    txSigner: string;
    signature?: string;
    solAmount?: number;
    tokenProgram?: string;
    timestamp?: number | string;
    [key: string]: unknown;
};

export type PumpStreamEvent = PumpStreamCreateEvent | PumpStreamBuyEvent | { txType: "sell"; mint: string; txSigner: string; pool?: string; [key: string]: unknown };

export type OnPumpCreateCallback = (event: PumpStreamCreateEvent) => void | Promise<void>;
export type OnPumpBuyCallback = (event: PumpStreamBuyEvent) => void | Promise<void>;

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const createCallbacks: Set<OnPumpCreateCallback> = new Set();
const buyCallbacks: Set<OnPumpBuyCallback> = new Set();
const statusListeners: Array<(status: "connecting" | "open" | "closed" | "error") => void> = [];

function notifyStatus(status: "connecting" | "open" | "closed" | "error"): void {
    statusListeners.forEach((cb) => {
        try {
            cb(status);
        } catch (e) {
            logger.error(TAG, "Status listener error", e);
        }
    });
}

function connect(): void {
    if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;
    notifyStatus("connecting");
    ws = new WebSocket(PUMP_STREAM_URL);

    ws.on("open", () => {
        logger.info(TAG, "Connected to pumpapi.io stream");
        notifyStatus("open");
    });

    ws.on("message", (data: WebSocket.RawData) => {
        let event: PumpStreamEvent;
        try {
            const raw = typeof data === "string" ? data : data.toString();
            event = JSON.parse(raw) as PumpStreamEvent;
        } catch {
            return;
        }
        const pool = event.pool;
        const isPump = pool === "pump" || pool === undefined || pool === null;
        if (event.txType === "create" && isPump) {
            const createEvent = event as PumpStreamCreateEvent;
            setImmediate(() => {
                createCallbacks.forEach((cb) => {
                    try {
                        void Promise.resolve(cb(createEvent)).catch((err) =>
                            logger.error(TAG, "Create callback error", err)
                        );
                    } catch (err) {
                        logger.error(TAG, "Create callback error", err);
                    }
                });
            });
        } else if (event.txType === "buy" && isPump) {
            const buyEvent = event as PumpStreamBuyEvent;
            setImmediate(() => {
                buyCallbacks.forEach((cb) => {
                    try {
                        void Promise.resolve(cb(buyEvent)).catch((err) =>
                            logger.error(TAG, "Buy callback error", err)
                        );
                    } catch (err) {
                        logger.error(TAG, "Buy callback error", err);
                    }
                });
            });
        }
    });

    ws.on("close", () => {
        ws = null;
        notifyStatus("closed");
        reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
        }, RECONNECT_DELAY_MS);
    });

    ws.on("error", (err) => {
        logger.error(TAG, "WebSocket error", err?.message ?? err);
        notifyStatus("error");
    });
}

/**
 * Start the Pump stream. Safe to call multiple times.
 */
export function startPumpStream(): void {
    connect();
}

/**
 * Stop the Pump stream and clear reconnect timer.
 */
export function stopPumpStream(): void {
    if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    notifyStatus("closed");
}

/**
 * Register a callback for every Pump token create event from the stream.
 * For "target wallet's token launch", filter inside the callback: event.txSigner === targetWallet.
 * @returns Unsubscribe function.
 */
export function onPumpCreate(callback: OnPumpCreateCallback): () => void {
    createCallbacks.add(callback);
    return () => {
        createCallbacks.delete(callback);
    };
}

/**
 * Register a callback for every Pump buy event from the stream (target wallet purchased a token).
 * For copy-trading, filter inside the callback: event.txSigner === monitoredWallet.
 * @returns Unsubscribe function.
 */
export function onPumpBuy(callback: OnPumpBuyCallback): () => void {
    buyCallbacks.add(callback);
    return () => {
        buyCallbacks.delete(callback);
    };
}

/**
 * Subscribe to create events only when the creator (txSigner) is in the given set of addresses.
 * Addresses are compared case-insensitively (lowercase).
 * @returns Unsubscribe function.
 */
export function onTargetWalletCreate(
    targetAddresses: Set<string>,
    callback: OnPumpCreateCallback
): () => void {
    const normalized = new Set<string>();
    targetAddresses.forEach((a) => normalized.add(a.trim().toLowerCase()));

    const handler: OnPumpCreateCallback = (event) => {
        const signer = (event.txSigner ?? "").trim().toLowerCase();
        if (signer && normalized.has(signer)) {
            void Promise.resolve(callback(event)).catch((err) =>
                logger.error(TAG, "Target create callback error", err)
            );
        }
    };
    createCallbacks.add(handler);
    return () => {
        createCallbacks.delete(handler);
    };
}

export function onStreamStatus(callback: (status: "connecting" | "open" | "closed" | "error") => void): () => void {
    statusListeners.push(callback);
    return () => {
        const i = statusListeners.indexOf(callback);
        if (i !== -1) statusListeners.splice(i, 1);
    };
}
