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
import { TokenListProvider } from "solana-token-list";
import sc from "samcolors";
import dns from "node:dns/promises";
import { LOG, ERROR, WARN } from "./customLogs.js";

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

// Decode private key file with password
const jsonPath = path.join(process.cwd(), folderName, jsonName);
const privateKeyFilePath = path.join(process.cwd(), folderName, fileName);
const password = await input("Security password: ", true);
const privateKey = await decodeFile(privateKeyFilePath, jsonPath, password);

// sender data
import bs58 from "bs58";
const secretKey = bs58.decode(privateKey);
const senderKeypair = Keypair.fromSecretKey(secretKey);

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

async function sendSOL(senderKeypair, receiverWallet, amount) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    const amountInLamports = toBaseUnits(amount, 9); // 1 solana equals 1,000,000,000 lamports

    const transferIx = SystemProgram.transfer({
        fromPubkey: senderKeypair.publicKey,
        toPubkey: receiverWallet,
        lamports: amountInLamports,
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
        terminalError(`Invalid amount ${sc.yellow(amountString)}`);

    const [whole, fraction = ""] = amountString.split(".");

    if (fraction.length > decimals)
        terminalError(`Amount ${sc.yellow(amountString)} has more than ${decimals} decimals`);

    return BigInt(whole + fraction.padEnd(decimals, "0"));
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

// send the token to the public addresses
const rawJsonContent = await fs.readFile(path.join(process.cwd(), addressesJsonPath));
const transactions = JSON.parse(rawJsonContent);

// fetched lazily, only if there is at least one SPL token transfer
let tokens;

for (const transactionData of transactions) {
    const { address, TOKEN_MINT: RAW_TOKEN_MINT, amount } = transactionData;

    if ("skip" in transactionData && transactionData.skip == true) continue;

    const publicAddress = new PublicKey(address);

    if (RAW_TOKEN_MINT == "SOLANA") {
        LOG(`Transfering ${sc.yellow(amount + " SOL")}`);

        await sendSOL(senderKeypair, publicAddress, amount);
    } else {
        if (!tokens) {
            const tokenListProvider = new TokenListProvider();
            const tokenList = await tokenListProvider.resolve();
            tokens = tokenList.filterByClusterSlug('mainnet-beta').getList();
        }

        const TOKEN_MINT = new PublicKey(RAW_TOKEN_MINT);

        const tokenInfo = tokens.find(token => token.address == TOKEN_MINT);
        LOG(`Transfering ${sc.yellow(amount + " " + (tokenInfo?.symbol ?? RAW_TOKEN_MINT))}`);

        const tokenDecimals = await getTokenDecimals(TOKEN_MINT);
        const tokenAmount = toBaseUnits(amount, tokenDecimals);

        const transaction = await sendToken(senderKeypair, publicAddress, TOKEN_MINT, tokenAmount);
    }
}
