import { isSolanaAddress } from "./isSolanaAddress";
import { getTokenInfo } from "./getTokenInfo";

export const summarizeTokenData = async (tokens: any[]) => {
    // Process tokens and resolve any contract addresses
    const results = await Promise.allSettled(tokens.map(async (token: { 
      symbol: string; 
      name: string; 
      amount: any; 
      usdValue: any;
      mintAddress: string;
      isNft: boolean;
      logo: string;
    }) => {
      console.log('Processing token:', token);
      const tokenInfo = await getTokenInfo(token.mintAddress);
      
      let processedToken = {
        symbol: token.symbol,
        name: token.name,
        amount: token.amount,
        usdValue: token.usdValue,
        marketCap: tokenInfo?.marketCap || 0,
        price: tokenInfo?.price || 0,
        image: tokenInfo?.image || token.logo,
        website: tokenInfo?.website || '',
        isNft: token.isNft,
      };

      if (isSolanaAddress(token.symbol) && tokenInfo) {
        processedToken.name = tokenInfo.name;
        processedToken.symbol = tokenInfo.symbol;
        processedToken.marketCap = tokenInfo.marketCap || 0;
        processedToken.price = tokenInfo.price || 0;
        processedToken.image = tokenInfo.image || token.logo;
        processedToken.website = tokenInfo.website || '';
      }
      
      console.log('Processed token:', processedToken);
      return processedToken;
    }));

    // Filter out failed promises and get successful results
    const summary = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    // Aggregate data for overall summary (using filtered successful results)
    const totalValue = tokens.reduce((acc: any, token: { usdValue: any; }) => acc + token.usdValue, 0);
    const totalTokens = summary.length;
    const totalMarketCap = summary.reduce((acc, token) => acc + (token.marketCap || 0), 0);

    return {
      summary,
      totalValue,
      totalTokens,
      totalMarketCap,
    };
};