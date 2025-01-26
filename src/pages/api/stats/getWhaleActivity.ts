import { getLatestWhaleActivity } from '@utils/getAssetDashWhaleWatch';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        const whaleActivity = await getLatestWhaleActivity();
        return res.status(200).json({
            whaleActivity: whaleActivity || []
        });

    } catch (error) {
        console.error('Error fetching M3 Vaults:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}