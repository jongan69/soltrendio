import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';
// import { connectToDatabase } from '@/utils/connectDB';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('walletAnalyzer');
    const wallets = db.collection('wallets');

    // Get total unique wallets count
    const uniqueWalletsCount = await wallets.countDocuments();

    // Get average holdings
    const averageResult = await wallets.aggregate([
      {
        $group: {
          _id: null,
          averageValue: { $avg: '$value' }
        }
      }
    ]).toArray();

    const averageValue = averageResult[0]?.averageValue || 0;

    // Get largest holding
    const largestHolding = await wallets.findOne(
      {},
      { sort: { value: -1 } }
    );

    return res.status(200).json({
      uniqueWallets: uniqueWalletsCount,
      averageValue: averageValue,
      largestHolding: largestHolding?.value || 0
    });

  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
