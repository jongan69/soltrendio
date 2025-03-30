import { NextApiRequest, NextApiResponse } from 'next';

interface NFTItem {
  compression: {
    compressed: boolean;
  };
}

const HELIUS_RPC_URL = 'https://mainnet.helius-rpc.com';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const response = await fetch(`${HELIUS_RPC_URL}/?api-key=${process.env.HELIUS_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'wallet-holdings',
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: address,
          page: 1,
          limit: 100,
          sortBy: {
            sortBy: 'created',
            sortDirection: 'asc'
          },
          options: {
            showUnverifiedCollections: false,
            showCollectionMetadata: true,
            showGrandTotal: true,
            showFungible: false,
            showNativeBalance: false,
            showInscription: true,
            showZeroBalance: false
          }
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    // Filter out compressed NFTs
    if (data.result && data.result.items) {
      data.result.items = data.result.items.filter((item: NFTItem) => !item.compression.compressed);
      // Update total count
      data.result.total = data.result.items.length;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching wallet holdings:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet holdings' });
  }
} 