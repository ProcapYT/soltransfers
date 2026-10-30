import { PublicKey } from "@solana/web3.js";
import fs from "node:fs/promises";
import path from "node:path";
import sc from "samcolors";
import { mintsFolder, addressbookPath } from "./constants.cjs";
import { ERROR } from "./customLogs.js";

// Native SOL has no mint, so it can't be defined in the mints file
export const NATIVE_SYMBOL = "SOL";

export function mintsFilePath(network) {
    return path.join(process.cwd(), mintsFolder, `mints-${network}.txt`);
}

export function addressbookFilePath() {
    return path.join(process.cwd(), addressbookPath);
}

// Mints of the network tokens, keyed by the uppercase symbol
export async function loadMints(network) {
    const filePath = mintsFilePath(network);
    const content = await readIfExists(filePath);

    if (content == null) {
        ERROR(`Mints file not found for network ${sc.yellow(network)} (${sc.yellow(filePath)})`);
        process.exit(1);
    }

    const entries = parseAddressFile(content, filePath, NATIVE_SYMBOL);
    return new Map([...entries].map(([key, { name, address }]) => [key, { symbol: name, mint: address }]));
}

// Named recipient addresses, keyed by the uppercase name. The addressbook is optional
export async function loadAddressbook() {
    const filePath = addressbookFilePath();
    const content = await readIfExists(filePath);

    if (content == null) return new Map();

    return parseAddressFile(content, filePath);
}

async function readIfExists(filePath) {
    try {
        return await fs.readFile(filePath, "utf-8");
    } catch {
        return null;
    }
}

// Parse "NAME: address" lines into a Map keyed by the uppercase name
function parseAddressFile(content, filePath, reservedName) {
    const entries = new Map();
    const errors = [];

    content.split(/\r?\n/).forEach((rawLine, index) => {
        const line = rawLine.trim();
        const where = `line ${index + 1}`;

        // skip blank lines and comments
        if (line == "" || line.startsWith("#")) return;

        const match = line.match(/^([^:\s]+)\s*:\s*(\S+)$/);

        if (!match) {
            errors.push(`${where}: expected "NAME: address", got ${sc.yellow(line)}`);
            return;
        }

        const [, name, address] = match;
        const key = name.toUpperCase();

        if (key == reservedName) {
            errors.push(`${where}: ${reservedName} is native and must not be in this file`);
            return;
        }

        if (entries.has(key)) {
            errors.push(`${where}: duplicated name ${sc.yellow(name)}`);
            return;
        }

        try {
            entries.set(key, { name, address: new PublicKey(address) });
        } catch {
            errors.push(`${where}: invalid address ${sc.yellow(address)} for ${name}`);
        }
    });

    if (errors.length > 0) {
        ERROR(`Invalid file ${sc.yellow(filePath)}`);
        errors.forEach(error => console.error("  - " + error));
        process.exit(1);
    }

    return entries;
}
