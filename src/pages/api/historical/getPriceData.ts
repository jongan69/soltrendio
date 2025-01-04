import type { NextApiRequest, NextApiResponse } from 'next';

interface TokenAmount {
  tokenAmount: string;
  decimals: number;
}

interface TokenInfo {
  userAccount: string;
  tokenAccount: string;
  mint: string;
  rawTokenAmount: TokenAmount;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { address, tokenA, tokenB, timestamp } = req.query;
  const apiKey = process.env.HELIUS_API_KEY;

  if (!apiKey || !address || !tokenA || !tokenB) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    const targetTimestamp = timestamp ? 
      Number(timestamp) * (Number(timestamp) < 1000000000000 ? 1000 : 1) : 
      Date.now();

    // First fetch without any pagination to get recent transactions
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${apiKey}&type=SWAP`;

    let retries = 3;
    let delay = 1000;
    let allTransactions: any[] = [];
    let lastSignature: string | null = null;
    let foundTargetTime = false;

    // Keep fetching until we find transactions older than our target time
    // or until we run out of transactions
    while (retries > 0 && !foundTargetTime) {
      const paginatedUrl: string = lastSignature ? 
        `${url}&before=${lastSignature}` : 
        url;

      const response = await fetch(paginatedUrl);
      
      if (response.status === 429) {
        retries--;
        if (retries === 0) {
          throw new Error('Rate limit exceeded after all retries');
        }
        console.log(`Rate limited, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      if (!transactions.length) break;

      allTransactions = [...allTransactions, ...transactions];
      
      // Check if we've gone far enough back in time
      const oldestTx = transactions[transactions.length - 1];
      if (oldestTx.timestamp * 1000 < targetTimestamp) {
        foundTargetTime = true;
      } else {
        lastSignature = oldestTx.signature;
      }

      // Limit the number of pages we fetch to avoid infinite loops
      if (allTransactions.length > 300) break;
    }

    console.log(`Found ${allTransactions.length} total swap transactions`);

    // Find swaps involving our token pair
    const relevantSwaps = allTransactions
      .filter((tx: any) => {
        const swap = tx.events?.swap;
        if (!swap) return false;

        const hasTokenA = [...(swap.tokenInputs || []), ...(swap.tokenOutputs || [])]
          .some((t: TokenInfo) => t.mint === tokenA);
        const hasTokenB = [...(swap.tokenInputs || []), ...(swap.tokenOutputs || [])]
          .some((t: TokenInfo) => t.mint === tokenB);

        return hasTokenA && hasTokenB;
      })
      .sort((a: any, b: any) => {
        // Sort by closest to target timestamp
        return Math.abs(a.timestamp - targetTimestamp/1000) - Math.abs(b.timestamp - targetTimestamp/1000);
      })
      .slice(0, 1);

    console.log(`Found ${relevantSwaps.length} relevant swaps for ${tokenA}/${tokenB}`);

    const historicalPriceData = relevantSwaps.map((tx: any) => {
      const swap = tx.events.swap;
      
      const tokenInData = [...swap.tokenInputs, ...swap.tokenOutputs]
        .find((t: TokenInfo) => t.mint === tokenA);
      const tokenOutData = [...swap.tokenInputs, ...swap.tokenOutputs]
        .find((t: TokenInfo) => t.mint === tokenB);

      if (!tokenInData || !tokenOutData) return null;

      const inputAmount = Number(tokenInData.rawTokenAmount.tokenAmount) / 
        Math.pow(10, tokenInData.rawTokenAmount.decimals);
      const outputAmount = Number(tokenOutData.rawTokenAmount.tokenAmount) / 
        Math.pow(10, tokenOutData.rawTokenAmount.decimals);

      return {
        timestamp: tx.timestamp,
        signature: tx.signature,
        price: outputAmount / inputAmount
      };
    }).filter(Boolean);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({ historicalPriceData });

  } catch (error) {
    console.error("Error fetching price data:", error);
    return res.status(500).json({ 
      error: "Failed to fetch price data",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
