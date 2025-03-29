import { NextApiRequest, NextApiResponse } from 'next';
import { TREND_SETTERS_NFT_COLLECTION, VAULT_ADDRESS } from '@utils/globals';
import { getNftHolders } from '@utils/getNftHolders';
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const response = await fetch(`https://stake-for-fee-api.meteora.ag/vault/${VAULT_ADDRESS}`);
        const vault = await response.json();
        console.log(vault);
        const vaultHolders = vault.top_lists.map((stake: any) => stake.owner);
        const nftHolders = await getNftHolders(TREND_SETTERS_NFT_COLLECTION);

        const uniqueHolders = [...new Set([...vaultHolders, ...nftHolders])];
        return res.status(200).json({
            holderCount: uniqueHolders.length,
            UniqueNftHoldersAndStakers: uniqueHolders || []
        });

    } catch (error) {
        console.error('Error fetching M3 Vaults:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}