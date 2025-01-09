import type { NextApiRequest, NextApiResponse } from 'next';
import { DEFAULT_TOKEN_3 } from '@utils/globals';
import { PublicKey } from '@solana/web3.js';
import { fetchTokenAccounts } from '@utils/tokenUtils';
import { connectToDatabase } from '../db/connectDB';

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
      if (existingUser?.isPremium) {
        return res.status(200).json({ isPremium: true });
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

      console.log("Premium status request:", req.body);
      // Just checking status
      return res.status(200).json({ 
        isPremium: existingUser?.isPremium,
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