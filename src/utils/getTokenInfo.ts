// Helper function to fetch token info from contract address
export async function getTokenInfo(address: string) {
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const pair = data.pairs?.[0]; // Get first pair's information
      
      if (!pair?.baseToken) return null;
      
      return {
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol
      };
    } catch (error) {
      console.error("Error fetching token info:", error);
      return null;
    }
  }