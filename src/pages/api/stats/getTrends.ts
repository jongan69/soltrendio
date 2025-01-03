import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';
import { ObjectId } from 'mongodb';

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

    // Add 24-hour stats calculation
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const last24HoursStats = await wallets.aggregate([
      {
        $facet: {
          "newWallets": [
            {
              $match: {
                createdAt: { $gte: twentyFourHoursAgo }
              }
            },
            {
              $count: "count"
            }
          ],
          "valueChanges": [
            {
              $match: {
                lastValueChange: { $gte: twentyFourHoursAgo },
                previousTotalValue: { $exists: true }
              }
            },
            {
              $group: {
                _id: null,
                totalValueChange: {
                  $sum: { 
                    $subtract: [
                      "$totalValue",
                      "$previousTotalValue"
                    ]
                  }
                },
                walletsUpdated: { $sum: 1 },
                totalCurrentValue: { $sum: "$totalValue" },
                totalPreviousValue: { $sum: "$previousTotalValue" }
              }
            }
          ]
        }
      }
    ]).toArray();

    // Get total unique wallets count
    const uniqueWalletsCount = await wallets.countDocuments();

    // Get top 5 most valuable domains, excluding Unknown and requiring minimum value
    const topDomains = await wallets.aggregate([
      {
        $match: {
          domain: { 
            $exists: true, 
            $ne: null,
          },
          totalValue: { $gt: 100 }
        }
      },
      {
        $group: {
          _id: '$domain',
          totalValue: { $sum: '$totalValue' },
          walletCount: { $sum: 1 },
          averageWalletValue: { $avg: '$totalValue' },
          largestWallet: { $max: '$totalValue' },
          smallestWallet: { $min: '$totalValue' }
        }
      },
      { $match: { walletCount: { $gt: 0 } } },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          name: '$_id',
          totalValue: '$totalValue',
          numberOfWallets: '$walletCount',
          averageWalletValue: '$averageWalletValue',
          largestWalletValue: '$largestWallet',
          smallestWalletValue: '$smallestWallet'
        }
      }
    ]).toArray();

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

    // Modify the top holdings aggregation to exclude empty symbols, addresses, and zero values
    const top5Result = await wallets.aggregate([
      { $unwind: '$topHoldings' },
      {
        $match: {
          'topHoldings.symbol': { 
            $ne: '', 
            $not: /^[A-Za-z0-9]{32,}$/ // Exclude long alphanumeric strings (addresses)
          },
          'topHoldings.usdValue': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$topHoldings.symbol',
          totalValue: { $sum: '$topHoldings.usdValue' },
          balance: { $sum: '$topHoldings.balance' },
          walletCount: { $sum: 1 }
        }
      },
      { $sort: { totalValue: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          symbol: '$_id',
          value: '$totalValue',
          totalBalance: '$balance',
          holderCount: '$walletCount'
        }
      }
    ]).toArray();

    // Calculate total value across all wallets for percentage calculation
    const totalValueStats = await wallets.aggregate([
      {
        $group: {
          _id: null,
          totalPortfolioValue: { $sum: '$totalValue' }
        }
      }
    ]).toArray();

    // Find tokens with most holders in common
    const commonHoldings = await wallets.aggregate([
      { $unwind: '$topHoldings' },
      {
        $match: {
          'topHoldings.symbol': { 
            $ne: '', 
            $not: /^[A-Za-z0-9]{32,}$/ 
          }
        }
      },
      {
        $group: {
          _id: '$_id',  // Group by wallet first
          holdings: { 
            $push: '$topHoldings.symbol' 
          }
        }
      },
      { $unwind: '$holdings' },
      { $unwind: '$holdings' },
      {
        $group: {
          _id: {
            token1: { $min: ['$holdings', '$$ROOT.holdings'] },
            token2: { $max: ['$holdings', '$$ROOT.holdings'] }
          },
          count: { $sum: 1 }
        }
      },
      { 
        $match: { 
          '_id.token1': { $ne: '_id.token2' },
          'count': { $gt: 1 }
        } 
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    return res.status(200).json({
      totalUniqueWallets: uniqueWalletsCount,
      portfolioMetrics: {
        averagePortfolioValue: aggregationResult[0]?.averageTotalValue || 0,
        averageTokenHoldingValue: aggregationResult[0]?.averageHoldingValue || 0,
        largestPortfolioValue: largestWallet?.totalValue || 0,
        totalPortfolioValue: totalValueStats[0]?.totalPortfolioValue || 0,
        activeWallets: await wallets.countDocuments({ totalValue: { $gt: 100 } })
      },
      topDomainsByValue: topDomains.map(domain => ({
        name: domain.name,
        totalValue: domain.totalValue,
        numberOfWallets: domain.numberOfWallets,
        averageWalletValue: domain.averageWalletValue,
        valueRange: {
          min: domain.smallestWalletValue,
          max: domain.largestWalletValue
        },
        percentageOfTotalValue: (domain.totalValue / 
          (totalValueStats[0]?.totalPortfolioValue || 1)) * 100
      })),
      topTokensByValue: top5Result.map(holding => ({
        tokenSymbol: holding.symbol,
        totalUsdValue: holding.value,
        aggregateBalance: holding.totalBalance,
        numberOfHolders: holding.holderCount,
        percentageOfTotalValue: (holding.value / (totalValueStats[0]?.totalPortfolioValue || 1)) * 100
      })),
      commonTokenPairs: commonHoldings.map(pair => ({
        tokens: [pair._id.token1, pair._id.token2],
        sharedHolders: pair.count
      })),
      last24Hours: {
        newWallets: last24HoursStats[0]?.newWallets[0]?.count || 0,
        walletsUpdated: last24HoursStats[0]?.valueChanges[0]?.walletsUpdated || 0,
        totalValueChange: last24HoursStats[0]?.valueChanges[0]?.totalValueChange || 0,
        percentageChange: last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue 
          ? ((last24HoursStats[0]?.valueChanges[0]?.totalCurrentValue - 
              last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue) / 
              last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue) * 100
          : 0
      },
    });

  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
