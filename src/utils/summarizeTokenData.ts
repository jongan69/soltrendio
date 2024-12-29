import { isSolanaAddress } from "./isSolanaAddress";
import { getTokenInfo } from "./getTokenInfo";

export const summarizeTokenData = async (tokens: any[]) => {
    // Process tokens and resolve any contract addresses
    const summary = await Promise.all(tokens.map(async (token: { 
      symbol: string; 
      name: string; 
      amount: any; 
      usdValue: any;
      mintAddress: string;
    }) => {
      console.log('Processing token:', token);
      const tokenInfo = await getTokenInfo(token.mintAddress);
      console.log('Token marketCap:', tokenInfo?.marketCap);
      let processedToken = {
        symbol: token.symbol,
        name: token.name,
        amount: token.amount,
        usdValue: token.usdValue,
        marketCap: tokenInfo?.marketCap || 0,
        price: tokenInfo?.price || 0,
        image: tokenInfo?.image || '',
        website: tokenInfo?.website || '',
      };

      // If symbol looks like a Solana address, try to fetch token info
      if (isSolanaAddress(token.symbol)) {
        if (tokenInfo) {
          processedToken.name = tokenInfo.name;
          processedToken.symbol = tokenInfo.symbol;
          processedToken.marketCap = tokenInfo.marketCap;
          processedToken.price = tokenInfo.price;
          processedToken.image = tokenInfo.image;
          processedToken.website = tokenInfo.website;
        }
      }
      console.log('Processed token:', processedToken);
      return processedToken;
    }));

    // Aggregate data for overall summary
    const totalValue = tokens.reduce((acc: any, token: { usdValue: any; }) => acc + token.usdValue, 0);
    const totalTokens = tokens.length;
    const totalMarketCap = summary.reduce((acc, token) => acc + (token.marketCap || 0), 0);

    return {
      summary,
      totalValue,
      totalTokens,
      totalMarketCap,
    };
  };