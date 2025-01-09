import { TokenData } from "./tokenUtils";

export const generatePortfolioName = (tokens: TokenData[]): string => {
    // Get unique tickers, remove any numbers, and split into parts
    const tickers = [...new Set(tokens.map(t => t.symbol || ''))]
      .filter(Boolean)
      .map(ticker => ticker.replace(/[0-9]/g, ''));
    
    // Split tickers into parts (2-3 chars each)
    const parts = tickers.flatMap(ticker => {
      const len = ticker.length;
      return [
        ticker.slice(0, Math.min(3, len)),
        len > 3 ? ticker.slice(-2) : ''
      ].filter(Boolean);
    });
  
    if (parts.length === 0) return `PUMP${Math.floor(Math.random() * 999)}`;
  
    // Create a random combination (max 3 parts to keep it under 12 chars)
    const numParts = Math.min(3, parts.length);
    const shuffled = parts.sort(() => Math.random() - 0.5);
    const combined = shuffled.slice(0, numParts).join('');
  
    // Ensure it's not too long and add random number if too short
    const name = combined.slice(0, 8);
    return name.length < 4 ? `${name}${Math.floor(Math.random() * 999)}` : name;
  };