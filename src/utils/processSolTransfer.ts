import { Connection } from "@solana/web3.js";

import { SystemProgram } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { DEFAULT_WALLET } from "./globals";
import { Transaction } from "@solana/web3.js";

export const processSolTransfer = async (publicKey: PublicKey, connection: Connection, amount: number, sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>) => {
    let transaction = new Transaction();
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(DEFAULT_WALLET),
            lamports: amount
        })
    );
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey;

    const signature = await sendTransaction(transaction, connection);

    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      ...latestBlockhash
    });

    return confirmation;
}