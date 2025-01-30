export async function getSolanaTokenCA(ticker: string) {
  /**
   * Retrieve the contract address (CA) of a Solana token by its ticker symbol.
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

    let firstFoundAddress = null; // Variable to store the first found address

    // Iterate through the pairs to find a match on the Solana chain
    for (const pair of data.pairs || []) {
      if (pair.chainId === 'solana') {
        console.log(`Found token on Solana: ${pair.baseToken?.symbol}`);

        const baseToken = pair.baseToken || {};
        const quoteToken = pair.quoteToken || {};

        // Store the first found address if not already stored
        if (!firstFoundAddress) {
          firstFoundAddress = baseToken.address || quoteToken.address;
        }

        // Check if the ticker matches either the base or quote token
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
    }

    // Return the first found address if no exact match is found
    if (firstFoundAddress) {
      console.log(`No exact match found. Returning the first found address: ${firstFoundAddress}`);
      return firstFoundAddress;
    }

    // Return null if the token is not found
    console.log(`Token ${ticker} not found on Solana.`);
    return null;

  } catch (error: any) {
    console.error(`Error fetching token data: ${error.message}`);
    return null;
  }
}

// Example Usage
// const ticker = "LOCKIN";
// getSolanaTokenCA(ticker).then((tokenAddress) => {
//   if (tokenAddress) {
//     console.log(`The contract address for ${ticker} is: ${tokenAddress}`);
//   } else {
//     console.log(`Token ${ticker} not found.`);
//   }
// });
