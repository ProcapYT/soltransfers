import {
    Connection,
    Keypair,
    PublicKey,
    clusterApiUrl,
    sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
    getAssociatedTokenAddress,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { decodeFile } from "./fileEncoder.js";
import bs58 from "bs58";

const secret = bs58.decode("5L5XxdDUBYZ7wbzAkCVjDLAgTLFx8Utcnx6hQ8PBEevyPMH3D6PMy9KsdCKCrCKxWrXzpkmvGj8fnchLs7zKHAgp");
const senderKeypair = Keypair.fromSecretKey(secret);

const USDC_MINT = new PublicKey("Tu_USDC_MINT_ADDRESS");
const TO_WALLET = new PublicKey("DirecciónDelReceptor");

const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

async function sendUSDC(senderKeypair, TO_WALLET) {
    const fromTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      senderKeypair.publicKey
    );
  
    const toTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT,
      TO_WALLET
    );
  
    const amount = 5 * 10 ** 6; 
  
    const transferIx = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      senderKeypair.publicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );
  
    const tx = await sendAndConfirmTransaction(connection, {
      feePayer: senderKeypair.publicKey,
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      instructions: [transferIx]
    }, [senderKeypair]);
  
    console.log("Transfer sent 👍:", tx);
}

sendUSDC(senderKeypair, TO_WALLET);
