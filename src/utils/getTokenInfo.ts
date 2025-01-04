import { DEXSCREENER } from "./endpoints";

interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  marketCap: number;
  price: number;
  priceNative: number;  // Price in SOL
  image: string;
  website: string;
}

// Helper function to fetch token info from contract address
export async function getTokenInfo(address: string) {
    try {
      const response = await fetch(`${DEXSCREENER}/latest/dex/tokens/${address}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      const pair = data.pairs?.[0]; // Get first pair's information
    
      
      if (!pair?.baseToken) return null;
      
      // Debug log
      console.log('DexScreener response for', address, ':', {
        priceUsd: pair.priceUsd,
        priceNative: pair.priceNative,
        baseToken: pair.baseToken
      });
      
      return {
        name: pair.baseToken.name,
        symbol: pair.baseToken.symbol,
        decimals: pair.baseToken.decimals,
        marketCap: pair.marketCap,
        price: pair.priceUsd || 0,
        priceNative: pair.priceNative || 0,
        image: pair.info?.imageUrl,
        website: pair.info?.websites,
      };
    } catch (error) {
      console.error("Error fetching token info for", address, ":", error);
      return null;
    }
  }