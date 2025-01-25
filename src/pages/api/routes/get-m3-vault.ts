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
        const response = await fetch(`https://stake-for-fee-api.meteora.ag/vault/all`);
        const allVaults = await response.json();
        const vaults = allVaults.data.filter((vault: any) => vault.token_a_mint === contractAddress);
        return res.status(200).json({
            vaults: vaults || []
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}