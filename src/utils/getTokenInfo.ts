import { DEXSCREENER } from "./endpoints";

// Helper function to fetch token info from contract address
export async function getTokenInfo(address: string) {
    try {
      const response = await fetch(`${DEXSCREENER}/latest/dex/tokens/${address}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const pair = data.pairs?.[0]; // Get first pair's information
    
      
      if (!pair?.baseToken) return null;
      
      return {
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        marketCap: pair.marketCap,
        price: pair.price,
        image: pair.info.imageUrl,
        website: pair.info.websites.Website,
      };
    } catch (error) {
      console.error("Error fetching token info:", error);
      return null;
    }
  }