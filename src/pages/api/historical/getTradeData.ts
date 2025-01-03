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

  const address = Array.isArray(req.query.address) ? req.query.address[0] : req.query.address;
  const limit = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
  const beforeSignature = Array.isArray(req.query.beforeSignature) ? req.query.beforeSignature[0] : req.query.beforeSignature;
  
  if (!address) {
    return res.status(400).json({ error: "Missing required parameter: address" });
  }
  
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is misconfigured: API key not set." });
  }
  
  try {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
    url.searchParams.append('api-key', apiKey);
    url.searchParams.append('limit', '100');
    if (beforeSignature) {
      url.searchParams.append('before', beforeSignature);
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
    console.log(`Found ${transactions.length} total transactions`);

    const tradeHistory = [];

    // Process transactions to extract trade data
    for (const txn of transactions) {
      try {
        // Focus on SWAP transactions
        if (txn.type !== 'SWAP' || !txn.tokenTransfers?.length) continue;

        // Get the input and output transfers
        const transfers = txn.tokenTransfers.filter((transfer: TokenTransfer) => 
          transfer.fromUserAccount === address || transfer.toUserAccount === address
        );

        if (transfers.length < 2) continue;

        // Find the "out" and "in" transfers
        const tokenOut = transfers.find((t: TokenTransfer) => t.fromUserAccount === address);
        const tokenIn = transfers.find((t: TokenTransfer) => t.toUserAccount === address);

        if (!tokenIn || !tokenOut) continue;

        // Get token information
        const [tokenInInfo, tokenOutInfo] = await Promise.all([
          getTokenInfo(tokenIn.mint),
          getTokenInfo(tokenOut.mint)
        ]);

        // Skip if we couldn't get token info
        if (!tokenInInfo || !tokenOutInfo) continue;

        const trade = {
          timestamp: txn.timestamp,
          signature: txn.signature,
          tokenIn: {
            mint: tokenIn.mint,
            amount: tokenIn.tokenAmount,
            decimals: tokenInInfo.decimals || 9,
            symbol: tokenInInfo.symbol || 'Unknown',
            image: tokenInInfo.image || null,
            website: tokenInInfo.website || null,
            price: tokenInInfo.price,
            priceNative: tokenInInfo.priceNative || 0
          },
          tokenOut: {
            mint: tokenOut.mint,
            amount: tokenOut.tokenAmount,
            decimals: tokenOutInfo.decimals || 9,
            symbol: tokenOutInfo.symbol || 'Unknown',
            image: tokenOutInfo.image || null,
            website: tokenOutInfo.website || null,
            price: tokenOutInfo.price,
            priceNative: tokenOutInfo.priceNative || 0
          },
          fee: txn.fee || 0,
          success: true,
          source: txn.source || 'Unknown DEX'
        };

        tradeHistory.push(trade);
        console.log('Processed trade:', {
          tokenIn: trade.tokenIn.symbol,
          tokenOut: trade.tokenOut.symbol,
          amountIn: trade.tokenIn.amount,
          amountOut: trade.tokenOut.amount
        });

      } catch (err) {
        console.error('Error processing transaction:', err);
        continue;
      }
    }

    console.log(`Successfully processed ${tradeHistory.length} trades`);

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
  