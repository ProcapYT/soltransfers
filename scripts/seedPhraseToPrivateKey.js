import bip39 from "bip39";
import ed25519 from "ed25519-hd-key";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { input } from "./privateKeyEncoder.js";
import sc from "samcolors";

const seedPhrase = await input("Twelve word seed phrase: ");
const derivationPath = "m/44'/501'/0'/0'";  // Phantom uses this

const seed = await bip39.mnemonicToSeed(seedPhrase);
const derivedSeed = ed25519.derivePath(derivationPath, seed.toString("hex")).key;
const keypair = Keypair.fromSeed(derivedSeed);
console.log(sc.blue("Private Key (Base58):"), bs58.encode(keypair.secretKey));
console.log(sc.blue("Public Key (Address):"), keypair.publicKey.toBase58());