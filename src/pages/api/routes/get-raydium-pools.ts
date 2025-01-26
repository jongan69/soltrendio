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
        console.log(contractAddress);
        const response = await fetch(`https://api-v3.raydium.io/pools/info/mint?mint1=${contractAddress}&poolType=all&poolSortField=fee24h&sortType=desc&pageSize=1000&page=1`);
        const allPools = await response.json();
        return res.status(200).json({
            pools: allPools.data.data || [],
            count: allPools.data.count || 0
        });

    } catch (error) {
        console.error('Error fetching Raydium Pools:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching Raydium Pools',
            errorMessage: error
        });
    }
}