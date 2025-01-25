import { NextApiRequest, NextApiResponse } from 'next';
import { fetchWhirlpoolsByTokenPair } from '@orca-so/whirlpools';
import { Connection } from '@solana/web3.js';
import { SOLANA_ADDRESS } from '@utils/globals';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    if(!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
        throw new Error('NEXT_PUBLIC_SOLANA_RPC_URL is not set');
    }   
    
    const { contractAddress } = req.body;
    try {
        const rpc = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL);

        const pools = await fetchWhirlpoolsByTokenPair(
            rpc,
            contractAddress,
            SOLANA_ADDRESS
          );
        return res.status(200).json({
            pools
        });

    } catch (error) {
        console.error('Error fetching portfolios:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching M3 Vaults',
            errorMessage: error
        });
    }
}