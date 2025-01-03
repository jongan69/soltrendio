import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';

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

    // Get average totalValue and analyze topHoldings using MongoDB aggregation
    const aggregationResult = await wallets.aggregate([
      { $unwind: '$topHoldings' },
      {
        $group: {
          _id: null,
          averageTotalValue: { $avg: '$totalValue' },
          averageHoldingValue: { $avg: '$topHoldings.usdValue' },
          allHoldings: {
            $push: {
              symbol: '$topHoldings.symbol',
              value: '$topHoldings.usdValue'
            }
          }
        }
      }
    ]).toArray();

    // Get the largest wallet
    const largestWallet = await wallets.findOne(
      {},
      { sort: { totalValue: -1 } }
    );

    // Get top 5 holdings directly from MongoDB aggregation
    const top5Result = await wallets.aggregate([
      { $unwind: '$topHoldings' },
      {
        $group: {
          _id: '$topHoldings.symbol',
          totalValue: { $sum: '$topHoldings.usdValue' },
          balance: { $sum: '$topHoldings.balance' }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          symbol: '$_id',
          value: '$totalValue',
          totalBalance: '$balance'
        }
      }
    ]).toArray();

    return res.status(200).json({
      uniqueWallets: uniqueWalletsCount,
      averageTotalValue: aggregationResult[0]?.averageTotalValue || 0,
      averageHoldingValue: aggregationResult[0]?.averageHoldingValue || 0,
      largestHolding: largestWallet?.totalValue || 0,
      top5LargestHoldings: top5Result
    });

  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
