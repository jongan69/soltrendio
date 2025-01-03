// nftfloor.ts
import { NextApiRequest, NextApiResponse } from 'next';

interface NFTFloorResponse {
  floorPrice: number | string;
  usdValue: number;
  uiFormmatted: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NFTFloorResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ 
      floorPrice: "Method not allowed", 
      usdValue: 0.00, 
      uiFormmatted: "0.0000 Sol" 
    });
    return;
  }

  const { ca } = req.body;

  if (!ca) {
    res.status(400).json({ 
      floorPrice: "Missing contract address", 
      usdValue: 0.00, 
      uiFormmatted: "0.0000 Sol" 
    });
    return;
  }

  const url = `https://api.simplehash.com/api/v0/nfts/solana/${ca}/0`;
  const options = {
    method: 'GET',
    headers: { 
      accept: 'application/json', 
      'X-API-KEY': process.env.SIMPLEHASH_API_KEY ?? "" 
    },
  };

  try {
    const response = await fetch(url, options)
      .then(res => res.json());
    
    const floorPriceInSol = response.collection.floor_prices[0].value / 1_000_000_000;
    const usdValue = response.collection.floor_prices[0].value_usd_cents / 100;
    
    res.status(200).json({ 
      floorPrice: floorPriceInSol, 
      usdValue, 
      uiFormmatted: `${floorPriceInSol.toFixed(4)} Sol ($${usdValue.toFixed(2)})` 
    });
  } catch (error) {
    console.error(`Error fetching NFT Collection data: ${error}`);
    res.status(500).json({ 
      floorPrice: "Error", 
      usdValue: 0.00, 
      uiFormmatted: "0.0000 Sol" 
    });
  }
}
