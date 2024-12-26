import { MongoClient } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';

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

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  try {
    const client = await MongoClient.connect(uri as string);
    const db = client.db('walletAnalyzer'); // You can change the database name

    const walletsCollection = db.collection('wallets');

    // Save wallet with timestamp
    await walletsCollection.insertOne({
      address,
      createdAt: new Date(),
    });

    await client.close();

    return res.status(200).json({ message: 'Wallet saved successfully' });
  } catch (error) {
    console.error('Error saving wallet:', error);
    return res.status(500).json({ message: 'Error saving wallet' });
  }
} 