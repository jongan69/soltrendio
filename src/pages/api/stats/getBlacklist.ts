import { getBlackList } from '@utils/getBlackList';
import { DEFAULT_TOKEN_3 } from '@utils/globals';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed, use GET.' });
    }

    const startTime = Date.now();

    try {
        const largeSellers = await getBlackList(DEFAULT_TOKEN_3);

        return res.status(200).json({
            status: 'success',
            data: largeSellers,
            processingStats: {
                totalSellers: largeSellers.length,
                processedTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
