import { createTransferInstruction } from "@solana/spl-token";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DEFAULT_WALLET } from "./globals";
import { fetchTokenAccounts } from "./tokenUtils";

export const processTokenTransfer = async (publicKey: PublicKey, connection: Connection, mint: string, amount: number, decimals: number, sendTransaction: (transaction: Transaction, connection: Connection) => Promise<string>) => {
    let transaction = new Transaction();

    const tokenAccountsFromWallet = await fetchTokenAccounts(publicKey);
    const tokenAccountFromWallet = tokenAccountsFromWallet.value.find(account =>
      account.account.data.parsed.info.mint === mint
    );

    const tokenAccountsToWallet = await fetchTokenAccounts(new PublicKey(DEFAULT_WALLET));
    const tokenAccountToWallet = tokenAccountsToWallet.value.find(account =>
      account.account.data.parsed.info.mint === mint
    );

    if (!tokenAccountFromWallet || !tokenAccountToWallet) {
        throw new Error(`No ${mint} account found for payment`);
    }

    const amountInLamports = amount * Math.pow(10, decimals);

    transaction.add(
        createTransferInstruction(
          tokenAccountFromWallet!.pubkey,
          tokenAccountToWallet!.pubkey,
          publicKey,
          amountInLamports
        )
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