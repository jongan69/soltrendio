import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Wallet address is required' });
  }

  try {
    console.log(`Proxying NFT request for address: ${address}`);
    
    const response = await fetch(`https://investassist.app/api/nfts?address=${address}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`API responded with status: ${response.status}`);
      return res.status(response.status).json({ 
        error: `API responded with status: ${response.status}` 
      });
    }

    const data = await response.json();
    console.log(`Successfully fetched ${Array.isArray(data) ? data.length : 'unknown number of'} NFTs`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching NFTs:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch NFTs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 