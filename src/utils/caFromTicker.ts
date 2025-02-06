export async function getSolanaTokenCA(ticker: string) {
  /**
   * Retrieve the contract address (CA) of a Solana token by its ticker symbol.
   * Returns the CA of the token with the highest liquidity.
   *
   * @param {string} ticker - The ticker symbol of the Solana token (e.g., 'SOL', 'USDC', or '$SOL').
   * @returns {Promise<string|null>} - The contract address of the token if found, otherwise null.
   */

  // Remove '$' if present at the start of the ticker
  if (ticker.startsWith('$')) {
    ticker = ticker.slice(1);
  }

  try {
    // Store both uppercase and lowercase versions of the ticker for comparison
    const tickerUpper = ticker.toUpperCase();
    const tickerLower = ticker.toLowerCase();

    // DEX Screener API search endpoint
    const url = `https://api.dexscreener.com/latest/dex/search?q=${ticker}`;

    // Send GET request to the API
    const response = await fetch(url);
    const data = await response.json();
    // console.log("data", data)
    // Filter for Solana pairs and valid quote tokens (SOL or USDC)
    const validPairs = ((data.pairs || []) as any[]).filter((pair: any) => 
      pair.chainId === 'solana' && 
      (pair.quoteToken?.address === 'So11111111111111111111111111111111111111112' || // SOL
       pair.quoteToken?.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') && // USDC
      pair.liquidity?.usd > 5000 // Minimum liquidity threshold
    );

    // Log all pairs for this specific token
    // validPairs.forEach((pair: { baseToken: { address: string; symbol: any; }; quoteToken: { symbol: any; }; liquidity: { usd: any; }; volume: { h24: any; }; marketCap: any; pairAddress: any; }) => {
    //   if (pair.baseToken?.address === '7XJiwLDrjzxDYdZipnJXzpr1iDTmK55XixSFAa7JgNEL') {
    //     console.log('Found target token pair:', {
    //       baseToken: pair.baseToken?.symbol,
    //       quoteToken: pair.quoteToken?.symbol,
    //       liquidity: pair.liquidity?.usd,
    //       volume24h: pair.volume?.h24,
    //       marketCap: pair.marketCap,
    //       pairAddress: pair.pairAddress
    //     });
    //   }
    // });

    // Group pairs by base token address
    const groupedPairs = validPairs.reduce((acc: { [key: string]: any[] }, pair: any) => {
      const address = pair.baseToken?.address;
      if (address) {
        if (!acc[address]) acc[address] = [];
        acc[address].push(pair);
      }
      return acc;
    }, {});

    // Log grouped pairs for this specific token
    // if (groupedPairs['7XJiwLDrjzxDYdZipnJXzpr1iDTmK55XixSFAa7JgNEL']) {
    //   console.log('Grouped pairs for target token:', 
    //     groupedPairs['7XJiwLDrjzxDYdZipnJXzpr1iDTmK55XixSFAa7JgNEL'].map((p: { quoteToken: { symbol: any; }; volume: { h24: any; }; }) => ({
    //       quoteToken: p.quoteToken?.symbol,
    //       volume24h: p.volume?.h24
    //     }))
    //   );
    // }

    // For each token, select the SOL pair with highest market cap
    const bestPairs = Object.values(groupedPairs).map(pairs => {
      // Only consider SOL pairs
      const solPairs = pairs.filter((p: { quoteToken: { address: string; }; }) => 
        p.quoteToken?.address === 'So11111111111111111111111111111111111111112'
      );
      
      // If we have SOL pairs, pick the one with highest market cap
      if (solPairs.length > 0) {
        return solPairs.reduce((best: any, current: any) => {
          const bestMarketCap = best.baseToken?.fdv || 0;
          const currentMarketCap = current.baseToken?.fdv || 0;
          return currentMarketCap > bestMarketCap ? current : best;
        });
      }

      // If no SOL pairs, return null
      return null;
    }).filter(Boolean); // Remove null entries

    // Sort by market cap
    bestPairs.sort((a: any, b: any) => {
      const marketCapA = a.baseToken?.fdv || 0;
      const marketCapB = b.baseToken?.fdv || 0;
      return marketCapB - marketCapA;
    });

    // console.log("bestPairs", bestPairs)
    // Sort by market cap, holder count, and liquidity
    bestPairs.sort((a: any, b: any) => {
      const marketCapA = a.baseToken?.fdv || 0;
      const marketCapB = b.baseToken?.fdv || 0;
      const holdersA = a.holders?.holders?.length || 0;
      const holdersB = b.holders?.holders?.length || 0;
      const liquidityA = a.liquidity?.usd || 0;
      const liquidityB = b.liquidity?.usd || 0;
      
      // First compare by holder count
      if (holdersA !== holdersB) {
        return holdersB - holdersA;
      }
      
      // Then by market cap
      if (marketCapA !== marketCapB) {
        return marketCapB - marketCapA;
      }
      
      // Finally by liquidity
      return liquidityB - liquidityA;
    });

    // console.log("Top 3 pairs by ranking:", bestPairs.slice(0, 3).map(p => ({
    //   symbol: p.baseToken?.symbol,
    //   marketCap: p.marketCap,
    //   liquidity: p.liquidity?.usd,
    //   quoteToken: p.quoteToken?.symbol,
    //   holders: p.holders?.holders?.length || 0,
    //   volume24h: p.volume?.h24
    // })));

    // Find the highest market cap pair that matches the ticker
    for (const pair of bestPairs) {
      const baseToken = pair.baseToken || {};
      const quoteToken = pair.quoteToken || {};

      if (
        baseToken.symbol?.toUpperCase() === tickerUpper ||
        baseToken.symbol?.toLowerCase() === tickerLower
      ) {
        return baseToken.address;
      } else if (
        quoteToken.symbol?.toUpperCase() === tickerUpper ||
        quoteToken.symbol?.toLowerCase() === tickerLower
      ) {
        return quoteToken.address;
      }
    }

    // If no exact match found but we have valid pairs, return the highest market cap one
    if (bestPairs.length > 0) {
      console.log(`No exact match found. Returning highest market cap token: ${bestPairs[0].baseToken.symbol}`);
      return bestPairs[0].baseToken.address;
    }

    // Return null if no valid pairs found
    console.log(`Token ${ticker} not found on Solana with sufficient liquidity.`);
    return null;

  } catch (error: any) {
    console.error(`Error fetching token data: ${error.message}`);
    return null;
  }
}