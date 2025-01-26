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
        // Using Orca's API directly
        const response = await fetch('https://api.orca.so/v1/whirlpool/list');

        // Log the response status and text for debugging
        console.log('Response status:', response.status);
        const responseData = await response.json();
        // console.log('Response text:', responseData);

        // Only try to parse if we got a successful response
        if (!response.ok) {
            throw new Error(`API responded with status ${response.status}: ${responseData}`);
        }

        const data = responseData.whirlpools?.filter((pool: any) => pool.tokenA.mint === contractAddress || pool.tokenB.mint === contractAddress);

        return res.status(200).json({
            pools: data || []
        });

    } catch (error) {
        console.error('Error fetching Orca whirlpools:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching Orca whirlpools',
            errorMessage: error instanceof Error ? error.message : String(error)
        });
    }
};