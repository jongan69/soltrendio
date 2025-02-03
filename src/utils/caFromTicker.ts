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

    // Filter for Solana pairs and valid quote tokens (SOL or USDC)
    const validPairs = (data.pairs || []).filter((pair: any) => 
      pair.chainId === 'solana' && 
      (pair.quoteToken?.address === 'So11111111111111111111111111111111111111112' || // SOL
       pair.quoteToken?.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') && // USDC
      pair.liquidity?.usd > 5000 // Minimum liquidity threshold
    );

    // Sort pairs by liquidity (highest first)
    validPairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));

    // Find the highest liquidity pair that matches the ticker
    for (const pair of validPairs) {
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

    // If no exact match found but we have valid pairs, return the highest liquidity one
    if (validPairs.length > 0) {
      console.log(`No exact match found. Returning highest liquidity token: ${validPairs[0].baseToken.symbol}`);
      return validPairs[0].baseToken.address;
    }

    // Return null if no valid pairs found
    console.log(`Token ${ticker} not found on Solana with sufficient liquidity.`);
    return null;

  } catch (error: any) {
    console.error(`Error fetching token data: ${error.message}`);
    return null;
  }
}
