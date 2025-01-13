import type { NextApiRequest, NextApiResponse } from 'next';
import { TREND_SETTERS_NFT_COLLECTION } from '@utils/globals';
import { connectToDatabase } from '../db/connectDB';
import { checkNftOwnership } from '@utils/checkNftOwnership';

const PREMIUM_COST = 100000; // 100k tokens

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const client = await connectToDatabase();
  const db = client.db('walletAnalyzer');
  const premiumUsersCollection = db.collection('wallets');
  if (req.method === 'POST') {
    try {
      const { address, action, confirmation } = req.body;


      // Check if already premium
      const existingUser = await premiumUsersCollection.findOne({ address });
      const isPaid: boolean = existingUser?.isPremium;
      const isNftOwner: boolean = await checkNftOwnership(address, TREND_SETTERS_NFT_COLLECTION);
      const isPremium: boolean = isPaid || isNftOwner;
      if (isPremium) {
        return res.status(200).json({ isPremium, message: 'Premium access granted' });
      }

      // If purchasing premium
      if (action === 'purchase' && confirmation) {
        // Create premium user record
        await premiumUsersCollection.findOneAndUpdate(
          { address },
          {
            $set: { 
              address,
              isPremium: true,
              purchaseDate: new Date(),
              confirmation: confirmation
            }
          },
          { upsert: true }
        );

        return res.status(200).json({ 
          isPremium: true,
          message: 'Premium access granted'
        });
      }

      console.log("Premium status request:", req.body, isPremium, isPaid, isNftOwner);
      // Just checking status
      return res.status(200).json({ 
        isPremium: isPremium,
        cost: PREMIUM_COST
      });
    } catch (error) {
      console.log("Premium status error:", error);
      console.error('Premium status error:', error);
      return res.status(500).json({ error: 'Failed to check premium status' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
} 