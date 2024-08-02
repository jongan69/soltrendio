import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { createCloseAccountInstruction } from "@solana/spl-token";
import { toast } from "react-hot-toast";
import { useState } from "react";

export const useCloseTokenAccount = () => {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const closeTokenAccount = async (tokenAccountPubkey: PublicKey): Promise<TransactionInstruction> => {
    if (!publicKey || !signTransaction || !tokenAccountPubkey) {
      throw new Error("Wallet not connected or not able to sign transactions or Error with token account address");
    }

    const tokenAccount = new PublicKey(tokenAccountPubkey);
    console.log("Preparing to close token account: ", tokenAccount.toString());

    // Check if the token account is valid
    let tokenAccountInfo;
    try {
      tokenAccountInfo = await connection.getAccountInfo(tokenAccount);
      if (!tokenAccountInfo) {
        throw new Error("Token account not found");
      }
    } catch (error) {
      console.error("Failed to fetch token account info:", error);
      toast.error("Failed to fetch token account info. Please Refresh the page.");
      throw error;
    }

    const closeInstruction = createCloseAccountInstruction(
      tokenAccount,
      publicKey, // destination
      publicKey // owner of token account
    );
    return closeInstruction;
  };

  const closeTokenAccountsAndSendTransaction = async (instructions: TransactionInstruction[]) => {
    if (!publicKey || !signTransaction) {
      throw new Error("Wallet not connected or not able to sign transactions");
    }

    const transaction = new Transaction().add(...instructions);

    try {
      const { blockhash } = await connection.getLatestBlockhash();
      const latestBlockHash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signedTransaction = await signTransaction(transaction);
      const signature = await sendTransaction(signedTransaction, connection);

      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature
      });

      console.log("Transaction confirmed with signature:", signature);
      toast.success("Transaction confirmed successfully!");
      return signature;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      toast.error("Failed to send transaction. Please try again.");
      throw error;
    }
  };

  return { closeTokenAccount, closeTokenAccountsAndSendTransaction };
};
