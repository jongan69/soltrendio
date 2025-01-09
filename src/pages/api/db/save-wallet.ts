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

  const { address, domain } = req.body;

  if (!address) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('walletAnalyzer');
    const walletsCollection = db.collection('wallets');

    // Ensure unique index exists
    await walletsCollection.createIndex({ "address": 1 }, { unique: true });

    // Use updateOne with upsert instead of separate insert/update
    const result = await walletsCollection.updateOne(
      { address },
      {
        $set: { lastSeen: new Date(), domain: domain || null },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    await client.close();

    return res.status(200).json({ 
      message: result.upsertedCount > 0 ? 'Wallet saved successfully' : 'Wallet updated successfully',
      isNew: result.upsertedCount > 0
    });
  } catch (error) {
    console.error('Error saving wallet:', error);
    return res.status(500).json({ message: 'Error saving wallet' });
  }
} 