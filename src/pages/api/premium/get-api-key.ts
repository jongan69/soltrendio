import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';
import { checkPremiumStatus } from '@utils/checkPremiumStatus';
import { checkNftOwnership } from '@utils/checkNftOwnership';
import { TREND_SETTERS_NFT_COLLECTION } from '@utils/globals';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { address } = req.body;

        if (!address) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }
        // Connect to MongoDB
        const client = await connectToDatabase();
        const db = client.db('walletAnalyzer');
        const walletsCollection = db.collection('wallets');
        // Verify premium status
        const existingUser = await walletsCollection.findOne({ address });
        const isPaid: boolean = existingUser?.isPremium;
        const isNftOwner: boolean = await checkNftOwnership(address, TREND_SETTERS_NFT_COLLECTION);
        const isPremium: boolean = isPaid || isNftOwner;

        if (!isPremium) {
            return res.status(403).json({ error: 'Premium access required' });
        }

        // Get the wallet document
        const wallet = await walletsCollection.findOne({ address });

        return res.status(200).json({ apiKey: wallet?.apiKey || null });
    } catch (error) {
        console.error('Error fetching API key:', error);
        return res.status(500).json({ error: 'Failed to fetch API key' });
    }
} 