import type { NextApiRequest, NextApiResponse } from 'next';
import { getTokenInfo } from '@utils/getTokenInfo';

interface TokenTransfer {
  fromTokenAccount: string;
  toTokenAccount: string;
  fromUserAccount: string;
  toUserAccount: string;
  tokenAmount: number;
  mint: string;
  tokenStandard: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const address = req.body.address;
  const limit = req.body.limit;
  const beforeTimestamp = req.body.beforeTimestamp;
  
  // Validate address format
  if (!address) {
    return res.status(400).json({ error: "Missing required parameter: address" });
  }

  // Validate Solana address format (base58 string, 32-44 characters)
  const addressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  if (!addressRegex.test(address)) {
    return res.status(400).json({ error: "Invalid Solana address format" });
  }

  // Validate limit parameter
  if (limit && (!Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    return res.status(400).json({ error: "Invalid limit parameter. Must be an integer between 1 and 100" });
  }

  // Validate beforeTimestamp parameter
  if (beforeTimestamp && (!Number.isInteger(Number(beforeTimestamp)) || Number(beforeTimestamp) < 0)) {
    return res.status(400).json({ error: "Invalid beforeTimestamp parameter. Must be a positive integer" });
  }
  
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is misconfigured: API key not set." });
  }

  // Use URL constructor with a fixed base URL
  const baseUrl = 'https://api.helius.xyz/v0/addresses';
  
  try {
    // Construct URL with sanitized parameters
    const url = new URL(`${baseUrl}/${encodeURIComponent(address)}/transactions`);
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('limit', '100');
    if (beforeTimestamp) {
      url.searchParams.append('before', beforeTimestamp.toString());
    }
    url.searchParams.append('type', 'SWAP');

    const response = await fetch(url.toString(), {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Helius API error details:', errorText);
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const transactions = await response.json();
    // console.log(`Found ${transactions.length} total transactions`);

    // Create array of promises for processing each transaction
    const tradePromises = transactions.map(async (txn: any) => {
      // Skip non-SWAP transactions early
      if (txn.type !== 'SWAP' || !txn.tokenTransfers?.length) return null;

      // Get the input and output transfers
      const transfers = txn.tokenTransfers.filter((transfer: TokenTransfer) => 
        transfer.fromUserAccount === address || transfer.toUserAccount === address
      );

      if (transfers.length < 2) return null;

      // Find the "out" and "in" transfers
      const tokenOut = transfers.find((t: TokenTransfer) => t.fromUserAccount === address);
      const tokenIn = transfers.find((t: TokenTransfer) => t.toUserAccount === address);

      if (!tokenIn || !tokenOut) return null;

      // Get token information
      const [tokenInInfo, tokenOutInfo] = await Promise.allSettled([
        getTokenInfo(tokenIn.mint),
        getTokenInfo(tokenOut.mint)
      ]);

      // Skip if either promise was rejected or returned null
      if (tokenInInfo.status !== 'fulfilled' || tokenOutInfo.status !== 'fulfilled' || 
          !tokenInInfo.value || !tokenOutInfo.value) return null;

      return {
        timestamp: txn.timestamp,
        signature: txn.signature,
        tokenIn: {
          mint: tokenIn.mint,
          amount: tokenIn.tokenAmount,
          decimals: tokenInInfo.value.decimals || 9,
          symbol: tokenInInfo.value.symbol || 'Unknown',
          image: tokenInInfo.value.image || null,
          website: tokenInInfo.value.website || null,
          price: tokenInInfo.value.price,
          priceNative: tokenInInfo.value.priceNative || 0
        },
        tokenOut: {
          mint: tokenOut.mint,
          amount: tokenOut.tokenAmount,
          decimals: tokenOutInfo.value.decimals || 9,
          symbol: tokenOutInfo.value.symbol || 'Unknown',
          image: tokenOutInfo.value.image || null,
          website: tokenOutInfo.value.website || null,
          price: tokenOutInfo.value.price,
          priceNative: tokenOutInfo.value.priceNative || 0
        },
        fee: txn.fee || 0,
        success: true,
        source: txn.source || 'Unknown DEX'
      };
    });

    // Process all promises in parallel
    const results = await Promise.allSettled(tradePromises);
    
    // Filter successful results and remove nulls
    const tradeHistory = results
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => {
        const trade = result.value;
        // console.log('Processed trade:', {
        //   tokenIn: trade.tokenIn.symbol,
        //   tokenOut: trade.tokenOut.symbol,
        //   amountIn: trade.tokenIn.amount,
        //   amountOut: trade.tokenOut.amount
        // });
        return trade;
      });

    // console.log(`Successfully processed ${tradeHistory.length} trades`);

    // Sort trades by timestamp (newest first)
    const sortedTrades = tradeHistory.sort((a, b) => b.timestamp - a.timestamp);

    // Limit results if specified
    const limitedData = limit ? 
      sortedTrades.slice(0, parseInt(limit.toString())) : 
      sortedTrades;

    res.setHeader('Cache-Control', 'public, max-age=60'); // Cache for 1 minute

    res.status(200).json({ 
      tradeHistory: limitedData,
      metadata: {
        totalTransactions: transactions.length,
        processedTrades: tradeHistory.length,
        limitedTrades: limitedData.length,
        hasMore: transactions.length === 100,
        lastSignature: transactions[transactions.length - 1]?.signature
      }
    });

  } catch (error) {
    console.error("Error fetching or processing transactions:", error);
    res.status(500).json({ 
      error: "Failed to fetch trade history",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
  