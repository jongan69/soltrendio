import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const { contractAddress } = req.body;
    if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
    }
    try {
        // console.log(contractAddress);
        const response = await fetch(`https://dlmm-api.meteora.ag/pair/all_with_pagination?include_token_mints=${contractAddress}`);
        const allPairs = await response.json();
        return res.status(200).json({
            pairs: allPairs.pairs || [],
            count: allPairs.length || 0
        });

    } catch (error) {
        console.error('Error fetching DLMM Pools:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching DLMM Pools',
            errorMessage: error
        });
    }
}