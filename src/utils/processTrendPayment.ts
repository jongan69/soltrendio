import { createTransferInstruction } from "@solana/spl-token";

import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DEFAULT_WALLET } from "./globals";
import { DEFAULT_TOKEN_3 } from "./globals";
import { fetchTokenAccounts } from "./tokenUtils";

export const processTrendPayment = async (publicKey: PublicKey, connection: Connection, amount: number, sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>) => {
          // Create and send transaction
          const transaction = new Transaction();
          const tokenAccounts = await fetchTokenAccounts(publicKey);
          const fromTokenAccount = tokenAccounts.value.find(account =>
            account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
          );
    
          const toTokenAccounts = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
          const toTokenAccount = toTokenAccounts.value.find(account =>
            account.account.data.parsed.info.mint === DEFAULT_TOKEN_3
          );
    
          if (!fromTokenAccount || !toTokenAccount) {
            throw new Error('Token accounts not found');
          }
    
          transaction.add(
            createTransferInstruction(
              fromTokenAccount.pubkey,
              toTokenAccount.pubkey,
              publicKey,
              amount * Math.pow(10, 6) // TREND is 6 decimals
            )
          );
    
          const { blockhash } = await connection.getLatestBlockhash();
          transaction.recentBlockhash = blockhash;
          transaction.feePayer = publicKey;
    
          const signature = await sendTransaction(transaction, connection);
          const confirmation = await connection.confirmTransaction({
            signature,
            ...(await connection.getLatestBlockhash())
          });

          return confirmation;

}