export function hasSpecialCharacters(text: string): boolean {
    // Regular expression to match special characters
    const specialCharsRegex = /[^a-zA-Z0-9\s]/;
    return specialCharsRegex.test(text);
}

export function getCurrentTime(): string {
    const now = new Date();

    const years = now.getFullYear().toString().padStart(4, "0");
    const months = (now.getUTCMonth() + 1).toString().padStart(2, "0");
    const days = now.getUTCDate().toString().padStart(2, "0");
    const hours = now.getUTCHours().toString().padStart(2, "0");
    const minutes = now.getUTCMinutes().toString().padStart(2, "0");
    const seconds = now.getUTCSeconds().toString().padStart(2, "0");

    return `${days}/${months}/${years} - ${hours}:${minutes}:${seconds}`;
}

export function getFrenchTime(): string {
    const now = new Date();

    // Get UTC time and manually add French offset (CEST = UTC+2, CET = UTC+1)
    // JavaScript will auto-handle daylight saving time when using Intl.DateTimeFormat
    const frenchTime = new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(now);

    const parts = Object.fromEntries(frenchTime.map(({ type, value }) => [type, value]));

    return `${parts.day}/${parts.month}/${parts.year} - ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function getFrenchTimeForWalletKeys(): string {
    const now = new Date();

    // Format date in Paris timezone, 24-hour format: "M/D/YYYY, HH:MM:SS"
    const frenchTime = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).formatToParts(now);

    const parts = Object.fromEntries(frenchTime.map(({ type, value }) => [type, value]));

    return `${parts.month}/${parts.day}/${parts.year} - ${parts.hour}:${parts.minute}:${parts.second}`;
}

export function msToTime(duration: number) {
    const seconds = Math.floor((duration / 1000) % 60);
    const minutes = Math.floor((duration / (1000 * 60)) % 60);
    const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds };
}


export function getLastUpdatedTime(timestamp: number): string {
    const date = new Date(timestamp);

    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

    return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

export function getlocationTime(timestamp: number): string {
    const date = new Date(timestamp);

    const years = date.getFullYear().toString().padStart(4, "0");
    const months = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const days = date.getUTCDate().toString().padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${years}-${months}-${days}-${hours}-${minutes}-${seconds}`;
}

export function formatNumberStyle(num: number): string {
    if (num >= 1e15) {
        const value = num / 1e15;
        return (value >= 1000 ? (num / 1e18).toFixed(2) + "E" : value.toFixed(2) + "Q");
    }
    if (num >= 1e12) {
        const value = num / 1e12;
        return (value >= 1000 ? (num / 1e15).toFixed(2) + "Q" : value.toFixed(2) + "T");
    }
    if (num >= 1e9) {
        const value = num / 1e9;
        return (value >= 1000 ? (num / 1e12).toFixed(2) + "T" : value.toFixed(2) + "B");
    }
    if (num >= 1e6) {
        const value = num / 1e6;
        return (value >= 1000 ? (num / 1e9).toFixed(2) + "B" : value.toFixed(2) + "M");
    }
    if (num >= 1e3) {
        const value = num / 1e3;
        return (value >= 1000 ? (num / 1e6).toFixed(2) + "M" : value.toFixed(2) + "K");
    }
    return String(num);
}

export function formatWithSuperscript(num: string): string {
    const numStr = num.toString();
    const match = numStr.match(/0\.(0+)(\d+)/); // Match leading zeros after "0."

    if (!match) return numStr; // If no match, return number as is

    const leadingZeros = match[1].length; // Count leading zeros
    const significantPart = match[2]; // The actual digits after zeros

    const superscriptDigits = "⁰¹²³⁴⁵⁶⁷⁸⁹";
    const superscript = superscriptDigits[leadingZeros]; // Convert to superscript

    return `0.0${superscript}${significantPart}`;
}

export function isMEVProtect(method: string) {
    if (method === "Ultra" || method === "Node") return false;
    else return true;
}

export function extractTokenAddress(text: string): string {
    const regex = /(?:📈 Buy .*?\n)([A-Za-z0-9]{32,44})/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            matches.push(match[1]);
        }
    }

    return matches[0];
}

export function extractTokenAddress_(text: string): string {
    const regex = /(?:📉 Sell .*?\n)([A-Za-z0-9]{32,44})/g;
    const matches: string[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match[1]) {
            matches.push(match[1]);
        }
    }

    return matches[0];
}
