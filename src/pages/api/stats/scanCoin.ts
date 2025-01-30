import { scanCoin } from '@utils/scanCoin';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const { coin } = req.body;
        if (!coin) {
            return res.status(400).json({ error: 'Coin is required' });
        }
        const coinData = await scanCoin(coin);
        return res.status(200).json({
            coinData: coinData || []
        });

    } catch (error) {
        console.error('Error fetching M3 Vaults:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}