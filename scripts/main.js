import {
    Connection,
    PublicKey,
    Keypair,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    clusterApiUrl,
} from "@solana/web3.js";

import {
    getOrCreateAssociatedTokenAccount,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
    getMint,
} from "@solana/spl-token";

import { decodeFile } from "./privateKeyEncoder.js";
import { input } from "./input.js";
import { jsonName, fileName, folderName, addressesJsonPath } from "./constants.cjs";
import path from "node:path";
import fs from "node:fs/promises";
import sc from "samcolors";
import dns from "node:dns/promises";
import { LOG, ERROR, WARN } from "./customLogs.js";
import { loadMints, loadAddressbook, mintsFilePath, addressbookFilePath, NATIVE_SYMBOL } from "./addressFiles.js";

// Check if the user has internet connection
async function hasInternet() {
    try {
        await dns.resolve("google.com"); // Any address will work, not only google.com
        return true;
    } catch {
        return false;
    }
}

if (!await hasInternet()) {
    terminalError("No internet connection");
}

// .env configuration
import dotenv from "dotenv";
dotenv.config();

// connection to the solana network
const connection = new Connection(clusterApiUrl(process.env.SOLANA_NETWORK), "confirmed");

async function sendToken(senderKeypair, receiverWallet, TOKEN_MINT, amount) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash({ commitment: "processed" });

    // token account of the sender
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        TOKEN_MINT,
        senderKeypair.publicKey
    );

    LOG(`Got sender associated token account (${sc.yellow(senderKeypair.publicKey)})`);

    // token account of the receiver
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        senderKeypair,
        TOKEN_MINT,
        receiverWallet
    );

    LOG(`Got receiver associated token account (${sc.yellow(receiverWallet)})`);

    const transferIx = createTransferInstruction(
        fromTokenAccount.address,
        toTokenAccount.address,
        senderKeypair.publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
    );

    LOG("Created transfer instructions");

    const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: senderKeypair.publicKey,
    }).add(transferIx);

    transaction.sign(senderKeypair);

    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                commitment: "processed",
                preflightCommitment: "processed",
                skipPreflight: false,
                maxRetries: 3,
                blockhash,
                lastValidBlockHeight,
            }
        );

        console.log(sc.bold(sc.green("COMPLETED: ")) + "Transaction successfully made!");
        return signature;
    } catch (err) {
        handleTransactionErrors(err);
    }
}

async function sendSOL(senderKeypair, receiverWallet, lamports) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const transferIx = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: receiverWallet,
        lamports,
    });

    LOG("Created transfer instructions");

    const transaction = new Transaction().add(transferIx);

    try {
        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair],
            {
                blockhash,
                lastValidBlockHeight
            }
        );

        console.log(sc.bold(sc.green("COMPLETED: ")) + "Transaction successfully made!");
        return signature;
    } catch (err) {
        handleTransactionErrors(err);
    }
}

// Convert a decimal amount (e.g. 1.5) into integer base units without floating point errors
function toBaseUnits(amount, decimals) {
    const amountString = String(amount);

    if (!/^\d+(\.\d+)?$/.test(amountString))
        throw new Error(`invalid amount ${sc.yellow(amountString)}`);

    const [whole, fraction = ""] = amountString.split(".");

    if (fraction.length > decimals)
        throw new Error(`amount ${sc.yellow(amountString)} has more than ${decimals} decimals`);

    const baseUnits = BigInt(whole + fraction.padEnd(decimals, "0"));

    if (baseUnits == 0n)
        throw new Error("amount must be greater than 0");

    return baseUnits;
}

async function getTokenDecimals(MINT) {
    const mintInfo = await getMint(connection, MINT);
    return mintInfo.decimals;
}

function handleTransactionErrors(err) {
    const fullError = err.stack ?? err.toString();

    if (fullError.includes("TransactionExpiredBlockheightExceededError"))
        WARN("Blockhash expired before the transaction was confirmed");

    else if (fullError.includes("BlockhashNotFound"))
        terminalError("Blockhash not found");

    else if (fullError.includes("custom program error"))
        terminalError("The program had an error in the execution");

    else if (fullError.includes("Transaction signature verification failure"))
        terminalError("Problem in the verification of the signature");

    else if (fullError.includes("Missing signature for fee payer"))
        WARN("No fee payer found in the list");

    else if (fullError.includes("429") || fullError.includes("Too many requests"))
        terminalError("You are making to many requests to the RPC");

    else {
        ERROR("Unknown error");
        console.error(err.message);
    }
}

function terminalError(msg) {
    ERROR(msg);
    process.exit(1);
}

// Validate every entry and resolve its token before sending anything, so a bad entry can't leave a run half done
async function prepareTransfers(transactions, mints, addressbook) {
    const transfers = [];
    const errors = [];
    const decimalsBySymbol = new Map([[NATIVE_SYMBOL, 9]]); // 1 solana equals 1,000,000,000 lamports

    for (const [index, transactionData] of transactions.entries()) {
        if ("skip" in transactionData && transactionData.skip == true) continue;

        const where = `entry ${index + 1}`;
        const { address, token, amount } = transactionData;

        if ("TOKEN_MINT" in transactionData) {
            errors.push(`${where}: "TOKEN_MINT" is no longer supported, use "token" with a symbol from the mints file (e.g. "token": "USDC")`);
            continue;
        }

        // the address is a name from the addressbook or a raw solana address
        const contact = typeof address == "string" ? addressbook.get(address.toUpperCase()) : undefined;
        let receiver = contact?.address;
        const receiverName = contact?.name ?? address;

        if (typeof address != "string") {
            errors.push(`${where}: missing "address"`);
        } else if (!receiver) {
            try {
                receiver = new PublicKey(address);
            } catch {
                errors.push(`${where}: unknown address ${sc.yellow(address)}, it is not a valid solana address nor a name in ${sc.yellow(addressbookFilePath())}`);
            }
        }

        if (typeof token != "string") {
            errors.push(`${where}: missing "token"`);
            continue;
        }

        const key = token.toUpperCase();
        const tokenData = key == NATIVE_SYMBOL ? { symbol: NATIVE_SYMBOL, mint: null } : mints.get(key);

        if (!tokenData) {
            errors.push(`${where}: unknown token ${sc.yellow(token)}, add it to ${sc.yellow(mintsFilePath(process.env.SOLANA_NETWORK))}`);
            continue;
        }

        if (!decimalsBySymbol.has(key)) {
            try {
                decimalsBySymbol.set(key, await getTokenDecimals(tokenData.mint));
            } catch {
                decimalsBySymbol.set(key, null);
                errors.push(`${where}: mint of ${tokenData.symbol} (${sc.yellow(tokenData.mint)}) not found on ${process.env.SOLANA_NETWORK}`);
                continue;
            }
        }

        const decimals = decimalsBySymbol.get(key);
        if (decimals == null) continue; // mint not found, already reported

        try {
            const baseUnits = toBaseUnits(amount, decimals);
            if (receiver) transfers.push({ ...tokenData, receiver, receiverName, amount, baseUnits });
        } catch (err) {
            errors.push(`${where}: ${err.message}`);
        }
    }

    if (errors.length > 0) {
        ERROR(`Invalid ${sc.yellow(addressesJsonPath)}, nothing has been sent`);
        errors.forEach(error => console.error("  - " + error));
        process.exit(1);
    }

    return transfers;
}

// validate the transfers before asking for the password
const mints = await loadMints(process.env.SOLANA_NETWORK);
const addressbook = await loadAddressbook();
const rawJsonContent = await fs.readFile(path.join(process.cwd(), addressesJsonPath));
const transfers = await prepareTransfers(JSON.parse(rawJsonContent), mints, addressbook);

// Decode private key file with password
const jsonPath = path.join(process.cwd(), folderName, jsonName);
const privateKeyFilePath = path.join(process.cwd(), folderName, fileName);
const password = await input("Security password: ", true);
const privateKey = await decodeFile(privateKeyFilePath, jsonPath, password);

// sender data
import bs58 from "bs58";
const secretKey = bs58.decode(privateKey);
const senderKeypair = Keypair.fromSecretKey(secretKey);

// send the tokens to the public addresses
for (const { symbol, mint, receiver, receiverName, amount, baseUnits } of transfers) {
    LOG(`Transfering ${sc.yellow(amount + " " + symbol)} to ${sc.yellow(receiverName)}`);

    if (mint == null) await sendSOL(senderKeypair, receiver, baseUnits);
    else await sendToken(senderKeypair, receiver, mint, baseUnits);
}
