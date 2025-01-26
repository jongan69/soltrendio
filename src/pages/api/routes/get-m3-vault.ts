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
        const response = await fetch(`https://stake-for-fee-api.meteora.ag/vault/all`);
        // console.log(response);
        const allVaults = await response.json();
        // console.log(allVaults);
        const vaults = allVaults.data.filter((vault: any) => vault.token_a_mint === contractAddress);
        // console.log(vaults);
        return res.status(200).json({
            vaults: vaults || []
        });

    } catch (error) {
        console.error('Error fetching M3 Vaults:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}