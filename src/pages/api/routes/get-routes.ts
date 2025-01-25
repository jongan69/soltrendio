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
        const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        const response = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${usdcMint}&outputMint=${contractAddress}&amount=1&swapMode=ExactIn&autoSlippage=true`);
        const data = await response.json();
        const routes = data.routePlan.map((route: any) => {
            const { label, ammKey } = route.swapInfo;
            return { label, ammKey };
        });
        return res.status(200).json({
            routes,
            slippage: data.slippageBps
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching Routes',
            errorMessage: error
        });
    }
}