import { isProductionMode } from "./runtimeMode";

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
};

function formatTime(level: string, color: string, tag: string): string {
    const time = new Date().toISOString();
    return `${color}[${time}] [${tag}] ${level}${colors.reset}`;
}

export const logger = {
    info(tag: string, ...args: unknown[]): void {
        if (isProductionMode()) return;
        const prefix = formatTime("INFO ", colors.blue, tag);
        console.log(prefix, ...args);
    },
    success(tag: string, ...args: unknown[]): void {
        if (isProductionMode()) return;
        const prefix = formatTime("OK   ", colors.green, tag);
        console.log(prefix, ...args);
    },
    warn(tag: string, ...args: unknown[]): void {
        const prefix = formatTime("WARN ", colors.yellow, tag);
        console.warn(prefix, ...args);
    },
    error(tag: string, ...args: unknown[]): void {
        const prefix = formatTime("ERR  ", colors.red, tag);
        console.error(prefix, ...args);
    },
};
