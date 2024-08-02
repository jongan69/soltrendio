import { useState, useCallback } from "react";
import { Connection, PublicKey, VersionedTransaction, TransactionInstruction, TransactionMessage } from "@solana/web3.js";
import { toast } from "react-hot-toast";

const TRANSACTION_SIZE_LIMIT = 1232; // Max size limit in bytes

export const useSendBatchTransaction = () => {
  const [sending, setSending] = useState(false);

  const sendTransactionBatch = useCallback(async (
    instructions: TransactionInstruction[],
    publicKey: PublicKey,
    signAllTransactions: any,
    connection: Connection,
    setMessage: (msg: string) => void,
    sendTransaction: (arg0: any, arg1: any, arg2: { minContextSlot: any; }) => any,
    description: string
  ) => {
    try {
      setSending(true);
      console.log(`Entering sendTransactionBatch: ${description}`);

      const { blockhash } = await connection.getLatestBlockhash({ commitment: 'processed' });

      const createTransaction = (instrs: TransactionInstruction[]) => {
        const message = new TransactionMessage({
          payerKey: new PublicKey(publicKey),
          recentBlockhash: blockhash,
          instructions: instrs,
        }).compileToV0Message([]);
        return new VersionedTransaction(message);
      };

      let batches = [];
      let currentBatch: TransactionInstruction[] = [];

      for (const instruction of instructions) {
        currentBatch.push(instruction);
        const currentTransaction = createTransaction(currentBatch);

        if (currentTransaction.serialize().length > TRANSACTION_SIZE_LIMIT) {
          currentBatch.pop(); // Remove the last instruction that caused the size to exceed the limit
          batches.push([...currentBatch]);
          currentBatch = [instruction];
        }
      }

      if (currentBatch.length > 0) {
        batches.push(currentBatch);
      }

      for (const batch of batches) {
        const batchTransaction = createTransaction(batch);
        const signedBatchTransaction = await signAllTransactions([batchTransaction]);

        setMessage('Sending batch transaction...');
        const { context: { slot: minContextSlot } } = await connection.getLatestBlockhashAndContext({ commitment: 'processed' });
        await sendTransaction(signedBatchTransaction[0], connection, { minContextSlot });

        console.log("Completed sending batch transaction");
        toast.success('Batch transaction confirmed successfully!');
      }

      setSending(false);
    } catch (error: any) {
      setSending(false);
      console.error(`Error during transaction batch send: ${description}`, error.toString());
      console.log("Failed Instructions:", instructions); // Log the instructions causing the error
      throw new Error(`Error during transaction batch send: ${description}, ${error.toString()}`);
    }
  }, []);

  return { sendTransactionBatch, sending };
};
