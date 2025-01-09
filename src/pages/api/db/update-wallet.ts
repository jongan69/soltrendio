import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from './connectDB';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address, totalValue, topHoldings, timestamp, domain } = req.body;

  if (!address) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('walletAnalyzer');
    const walletsCollection = db.collection('wallets');

    // Ensure unique index exists
    await walletsCollection.createIndex({ "address": 1 }, { unique: true });

    // First get the current wallet data
    const currentWallet = await walletsCollection.findOne({ address });

    // Only update previousTotalValue if the new value is different
    const shouldUpdatePrevious = currentWallet &&
      Math.abs(currentWallet.totalValue - totalValue) > 0.01; // Small threshold for floating point comparison

    // Update wallet with upsert
    const result = await walletsCollection.updateOne(
      { address },
      {
        $set: {
          address,
          totalValue,
          topHoldings,
          lastSeen: timestamp,
          previousTotalValue: shouldUpdatePrevious ? currentWallet.totalValue : (currentWallet?.previousTotalValue || totalValue),
          domain: currentWallet?.domain || domain,
          lastValueChange: shouldUpdatePrevious ? timestamp : (currentWallet?.lastValueChange || timestamp)
        },
        $setOnInsert: {
          createdAt: new Date(),
          firstTotalValue: totalValue
        }
      },
      { upsert: true }
    );

    await client.close();

    return res.status(200).json({
      message: result.upsertedCount > 0 ? 'Wallet created successfully' : 'Wallet updated successfully',
      isNew: result.upsertedCount > 0
    });
  } catch (error) {
    console.error('Error updating wallet:', error);
    return res.status(500).json({ message: 'Error updating wallet' });
  }
} 