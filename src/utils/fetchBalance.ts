import { PublicKey } from "@solana/web3.js";
import { fetchTokenAccounts } from "./tokenUtils";

export const fetchBalance = async (walletAddress: string, tokenMint: string) => {
    try {
        if (!walletAddress) {
            return 0;
        }
        const tokenAccounts = await fetchTokenAccounts(new PublicKey(walletAddress));
        const tokenAccount = tokenAccounts.value.find(account =>
          account.account.data.parsed.info.mint === tokenMint
        );
  
        if (tokenAccount) {
          const balance = tokenAccount.account.data.parsed.info.tokenAmount.uiAmount;
          return balance;
        }
      } catch (error) {
        console.error("Error fetching fee wallet balance:", error);
      }
};