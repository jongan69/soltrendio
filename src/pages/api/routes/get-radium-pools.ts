import { SOLANA_ADDRESS } from '@utils/globals';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const { contractAddress } = req.body;
    try {
        const response = await fetch(`https://api-v3.raydium.io/pools/info/mint?mint1=${contractAddress}&poolType=all&poolSortField=fee24h&sortType=desc&pageSize=1000&page=1`);
        const allPools = await response.json();
        return res.status(200).json({
            pools: allPools.data.data || [],
            count: allPools.data.count || 0
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}