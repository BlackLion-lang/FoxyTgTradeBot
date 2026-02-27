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

function format(level: string, color: string, tag: string, ...args: unknown[]): void {
    const time = new Date().toISOString();
    const prefix = `${color}[${time}] [${tag}] ${level}${colors.reset}`;
    console.log(prefix, ...args);
}

export const logger = {
    info(tag: string, ...args: unknown[]): void {
        format("INFO ", colors.blue, tag, ...args);
    },
    success(tag: string, ...args: unknown[]): void {
        format("OK   ", colors.green, tag, ...args);
    },
    warn(tag: string, ...args: unknown[]): void {
        format("WARN ", colors.yellow, tag, ...args);
    },
    error(tag: string, ...args: unknown[]): void {
        format("ERR  ", colors.red, tag, ...args);
    },
};
