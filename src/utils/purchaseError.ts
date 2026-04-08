/** User-facing failure categories (no amounts in copy). */
export type PurchaseErrorKind =
    | "insufficient_native"
    | "slippage"
    | "liquidity"
    | "network"
    | "generic";

export function classifyPurchaseError(
    raw: string | undefined,
    chain: "solana" | "ethereum",
): PurchaseErrorKind {
    const e = (raw ?? "").toLowerCase();

    if (chain === "solana") {
        if (
            e.includes("slippage") ||
            e.includes("price impact") ||
            e.includes("0x1771") ||
            e.includes("too much slippage")
        ) {
            return "slippage";
        }
        if (
            e.includes("no route") ||
            e.includes("not tradable") ||
            e.includes("no_routes") ||
            e.includes("route not found") ||
            (e.includes("liquidity") && (e.includes("jupiter") || e.includes("quote")))
        ) {
            return "liquidity";
        }
        if (
            e.includes("insufficient") ||
            e.includes("lamport") ||
            e.includes("insufficient funds for rent") ||
            e.includes("custom program error: 0x1") ||
            (e.includes("simulation failed") &&
                (e.includes("transfer") || e.includes("insufficient") || e.includes("lamport")))
        ) {
            return "insufficient_native";
        }
        if (
            e.includes("timeout") ||
            e.includes("econnrefused") ||
            e.includes("enotfound") ||
            e.includes("fetch failed") ||
            e.includes("rate limit") ||
            e.includes("network")
        ) {
            return "network";
        }
        return "generic";
    }

    if (
        e.includes("slippage") ||
        e.includes("too little received") ||
        e.includes("insufficient_output_amount") ||
        e.includes("insufficient output")
    ) {
        return "slippage";
    }
    if (
        e.includes("insufficient funds") ||
        e.includes("insufficient balance") ||
        e.includes("gas required exceeds") ||
        e.includes("gas too low") ||
        e.includes("max fee per gas") ||
        e.includes("underpriced") ||
        e.includes("exceeds the balance")
    ) {
        return "insufficient_native";
    }
    if (e.includes("liquidity") || e.includes("pair does not exist")) {
        return "liquidity";
    }
    if (
        e.includes("timeout") ||
        e.includes("econnrefused") ||
        e.includes("network") ||
        e.includes("nonce has already been used")
    ) {
        return "network";
    }
    return "generic";
}

/** SOL buffer for priority / platform fees on top of the smallest quick-buy amount (heuristic). */
const SOL_QUICK_BUY_FEE_BUFFER = 0.015;

/** ETH reserved for gas on top of the smallest quick-buy amount (heuristic). */
const ETH_QUICK_BUY_GAS_BUFFER = 0.008;

export function shouldWarnLowSolBalance(balance: number, buyAmounts: number[]): boolean {
    const valid = buyAmounts.filter((a) => typeof a === "number" && Number.isFinite(a) && a > 0);
    if (valid.length === 0) return false;
    const minBuy = Math.min(...valid);
    return balance < minBuy + SOL_QUICK_BUY_FEE_BUFFER;
}

export function shouldWarnLowEthBalance(balance: number, buyAmounts: number[]): boolean {
    const valid = buyAmounts.filter((a) => typeof a === "number" && Number.isFinite(a) && a > 0);
    if (valid.length === 0) return false;
    const minBuy = Math.min(...valid);
    return balance < minBuy + ETH_QUICK_BUY_GAS_BUFFER;
}

export function purchaseErrorLocaleKey(kind: PurchaseErrorKind, chain: "solana" | "ethereum"): string {
    switch (kind) {
        case "insufficient_native":
            return chain === "solana" ? "buy.purchaseErrorInsufficientSol" : "buy.purchaseErrorInsufficientEth";
        case "slippage":
            return "buy.purchaseErrorSlippage";
        case "liquidity":
            return "buy.purchaseErrorLiquidity";
        case "network":
            return "buy.purchaseErrorNetwork";
        default:
            return "buy.purchaseErrorGeneric";
    }
}
