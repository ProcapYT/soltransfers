import crypto from "node:crypto";
import fs from "node:fs/promises";
import readline from "node:readline";
import { jsonName, folderName, fileName } from "./constants.cjs";
import path from "node:path";
import sc from "samcolors";
import { ERROR } from "./customLogs.js";
import { input } from "./input.js";

function generateKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
}

function encodeText(text, password) {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    const key = generateKey(password, salt);

    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encoding = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
        salt: salt.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        data: encoding.toString("base64"),
    };
}

function decodeText({ salt, iv, tag, data }, password) {
    const key = generateKey(password, Buffer.from(salt, "base64"));
    const decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        Buffer.from(iv, "base64")
    );

    decipher.setAuthTag(Buffer.from(tag, "base64"));

    let decoding;

    try {
        decoding = Buffer.concat([
            decipher.update(Buffer.from(data, "base64")),
            decipher.final(),
        ]);
    } catch {
        ERROR("Wrong password");
        process.exit(1);
    }

    return decoding.toString("utf8");
}

export async function encodeFile(text, encodedFilePath, jsonPath, password) {
    const encoding = encodeText(text, password);

    const jsonContent = {
        salt: encoding.salt,
        iv: encoding.iv,
        tag: encoding.tag,
    };

    const encodedFileContent = encoding.data;

    await fs.writeFile(encodedFilePath, encodedFileContent, { encoding: "utf-8" });
    await fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 4), { encoding: "utf-8" });
}

export async function decodeFile(encodedFilePath, jsonPath, password) {
    const encodedFileContent = await fs.readFile(encodedFilePath, "utf-8");
    const jsonContent = JSON.parse(await fs.readFile(jsonPath, "utf-8"));

    await checkFileExistance(encodedFilePath);
    await checkFileExistance(jsonPath);
    
    const decoding = decodeText({ salt: jsonContent.salt, iv: jsonContent.iv, tag: jsonContent.tag, data: encodedFileContent }, password);
    return decoding;
}

async function checkFileExistance(filePath) {
    try {
        await fs.access(filePath, fs.constants.F_OK);
    } catch {
        ERROR(`File not found in ${sc.yellow(filePath)}`);
        process.exit(1);
    }
}

async function dirExists(path) {
    try {
        await fs.access(path, fs.constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

if (process.argv[2] == "--encode") {
    if (!await dirExists(path.join(process.cwd(), folderName))) {
        await fs.mkdir(folderName);
    }
    
    await encodeFile(
        await input("Private key: ", true), 
        path.join(process.cwd(), folderName, fileName), 
        path.join(process.cwd(), folderName, jsonName), 
        await input("Security password: ", true)
    );
}
