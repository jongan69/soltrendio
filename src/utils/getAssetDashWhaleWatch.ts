interface TrendScore {
  name: string;
  bullishScore: number;
  bearishScore: number;
  token_address: string;
}

// Initialize with type
const trendScores: Record<string, TrendScore> = {};

export async function getLatestWhaleActivity() {
    try {
        const apiUrl = `https://swap-api.assetdash.com/api/api_v5/whalewatch/transactions/list?page=1&limit=100`;
      // Calculate the timestamp for 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const formattedTimestamp = threeDaysAgo.toISOString();
  
      // Append the dynamic after_timestamp to the API URL
      const urlWithTimestamp = `${apiUrl}&after_timestamp=${encodeURIComponent(formattedTimestamp)}`;
  
      const response = await fetch(urlWithTimestamp, {
        headers: {
          'Authorization': `Bearer ${process.env.ASSETDASH_API_KEY}`,
        },
      });
      const data = await response.json();
  
      if (!data.transactions || !Array.isArray(data.transactions)) {
        throw new Error("Invalid data format");
      }
  
      // Calculate trend scores based on transactions
      data.transactions.forEach((transaction: { transaction_type: any; swap_token?: { symbol: any; name: any; token_address: any; } | undefined; trade_size: any; }) => {
        const {
          transaction_type,
          swap_token: { symbol, name, token_address } = {},
          trade_size,
        } = transaction;
  
        if (!symbol || !name || !token_address) return;
  
        // Initialize the token in trendScores if not already present
        if (!(symbol in trendScores)) {
          trendScores[symbol] = { 
            name, 
            token_address,
            bullishScore: 0, 
            bearishScore: 0 
          };
        }

        // Assign weight to trade sizes (e.g., high = 3, medium = 2, low = 1)
        const tradeWeight = trade_size === "high" ? 3 : trade_size === "medium" ? 2 : 1;
  
        // Update scores based on transaction type
        if (transaction_type === "buy") {
          trendScores[symbol].bullishScore += tradeWeight;
        } else if (transaction_type === "sell") {
          trendScores[symbol].bearishScore += tradeWeight;
        }
      });
  
      // Sort tokens by bullish and bearish scores
      const sortedBullish = Object.entries(trendScores)
        .sort((a, b) => b[1].bullishScore - a[1].bullishScore)
        .map(([symbol, { name, bullishScore, token_address }]) => ({ 
          symbol, 
          name, 
          token_address,
          bullishScore 
        }));
  
      const sortedBearish = Object.entries(trendScores)
        .sort((a, b) => b[1].bearishScore - a[1].bearishScore)
        .map(([symbol, { name, bearishScore, token_address }]) => ({ 
          symbol, 
          name, 
          token_address,
          bearishScore 
        }));
  
      // Return top 5 bullish and bearish coins
      return {
        bullish: sortedBullish.slice(0, 5),
        bearish: sortedBearish.slice(0, 5),
      };
    } catch (error) {
      console.error("Error fetching or processing data:", error);
      return { bullish: [], bearish: [] };
    }
  }