import { isSolanaAddress } from "./isSolanaAddress";
import { getTokenInfo } from "./getTokenInfo";

export const summarizeTokenData = async (tokens: any[]) => {
    // Process tokens and resolve any contract addresses
    const summary = await Promise.all(tokens.map(async (token: { symbol: string; name: string; amount: any; usdValue: any; }) => {
      let processedToken = {
        symbol: token.symbol,
        name: token.name,
        amount: token.amount,
        usdValue: token.usdValue,
      };

      // If symbol looks like a Solana address, try to fetch token info
      if (isSolanaAddress(token.symbol)) {
        const tokenInfo = await getTokenInfo(token.symbol);
        if (tokenInfo) {
          processedToken.name = tokenInfo.name;
          processedToken.symbol = tokenInfo.symbol;
        }
      }

      return processedToken;
    }));

    // Aggregate data for overall summary
    const totalValue = tokens.reduce((acc: any, token: { usdValue: any; }) => acc + token.usdValue, 0);
    const totalTokens = tokens.length;

    return {
      summary,
      totalValue,
      totalTokens,
    };
  };