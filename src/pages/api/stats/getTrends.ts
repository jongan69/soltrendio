import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';
import { fetchJupiterSwap } from '@utils/fetchJupiterSwap';
import { DEFAULT_M3_VAULT, DEFAULT_TOKEN_3, SOLANA_ADDRESS } from '@utils/globals';
import { getM3Vault } from '@utils/getM3Vault';
import { formatNumber } from '@utils/formatNumber';
import { getLargeHolders } from '@utils/getLargeHolders';
// import { fetch6900 } from '@utils/fetch6900';
// import { fetchSP500MarketCap } from '@utils/fetchSP500';
import { fetchBitcoinPrice } from '@utils/bitcoinPrice';
import { getTopTickers } from '@utils/topTickers';
import { fetchEthereumPrice } from '@utils/ethereumPrice';
import { getLatestWhaleActivity } from '@utils/getAssetDashWhaleWatch';
import { fetchOptionRecomendations } from '@utils/fetchOptionRecomendations';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const client = await connectToDatabase();
    const db = client.db('walletAnalyzer');
    const wallets = db.collection('wallets');

    const promises = await Promise.allSettled([
      fetchJupiterSwap(DEFAULT_TOKEN_3),
      getM3Vault(DEFAULT_M3_VAULT),
      getLargeHolders(DEFAULT_TOKEN_3),
      fetchJupiterSwap(SOLANA_ADDRESS),
      fetchBitcoinPrice(),
      // fetchSP500MarketCap(),
      // fetch6900(),
      getTopTickers(true),
      getLatestWhaleActivity(),
      fetchEthereumPrice(),
      fetchOptionRecomendations()
    ]);

    // Helper function to safely get value from settled promise
    const getValue = <T>(result: PromiseSettledResult<T>, defaultValue: T): T => {
      return result.status === 'fulfilled' ? result.value : defaultValue;
    };

    // Destructure results with safe fallbacks
    const [
      jupiterSwapResponse,
      m3VaultData,
      largeHolders,
      jupiterSwapResponse2,
      bitcoinPrice,
      // sp500MarketCap,
      // spx6900MarketCap,
      topTickers,
      whaleActivity,
      ethereumPrice,
      optionRecommendations
    ] = promises;

    // Safely access values with fallbacks
    const trendPrice = getValue(jupiterSwapResponse, { data: { [DEFAULT_TOKEN_3]: { price: 0 } } })
      .data[DEFAULT_TOKEN_3].price;
    const totalAmountStaked = getValue(m3VaultData, { total_staked_amount: 0 })?.total_staked_amount;
    const largeHoldersCount = getValue(largeHolders, 0);
    const solanaPrice = getValue(jupiterSwapResponse2, { data: { [SOLANA_ADDRESS]: { price: 0 } } })
      .data[SOLANA_ADDRESS]?.price;
    const btcPrice = getValue(bitcoinPrice, 0);
    // const sp500Cap = getValue(sp500MarketCap, 0);
    // const spx6900Cap = getValue(spx6900MarketCap, 0);
    // const percentOfSpx6900flippingSp500 = ((spx6900Cap / sp500Cap) * 100).toFixed(5);
    const topTickersData = getValue(topTickers, []);
    const whaleActivityData = getValue(whaleActivity, { bullish: [], bearish: [] });
    const ethPrice = getValue(ethereumPrice, 0);

    // Add this debugging section
    // const anyWallet = await wallets.findOne({});
    // console.log('Sample wallet fields:', {
    //   availableFields: anyWallet ? Object.keys(anyWallet) : [],
    //   sampleData: anyWallet
    // });

    // Check total number of documents
    // const totalDocs = await wallets.countDocuments();
    // console.log('Total documents in collection:', totalDocs);

    // Check what fields we have in the collection
    // const distinctFields = await wallets.aggregate([
    //   { 
    //     $project: { 
    //       fields: { $objectToArray: "$$ROOT" } 
    //     }
    //   },
    //   { 
    //     $unwind: "$fields" 
    //   },
    //   { 
    //     $group: { 
    //       _id: "$fields.k" 
    //     } 
    //   }
    // ]).toArray();

    // console.log('Available fields in collection:', distinctFields.map(f => f._id));

    // const recentUpdates = await wallets.find({
    //   lastValueChange: { $gte: twentyFourHoursAgo }
    // }).limit(5).toArray();

    // console.log('Recent updates count:', recentUpdates.length);
    // console.log('First few recent updates:', recentUpdates.map(w => ({
    //   lastValueChange: w.lastValueChange,
    //   totalValue: w.totalValue,
    //   previousTotalValue: w.previousTotalValue
    // })));

    // Add this debug query before the main aggregation
    // const recentWalletUpdates = await wallets.find({
    //   lastValueChange: { $gte: twentyFourHoursAgo },
    //   topHoldings: { $exists: true }
    // }).limit(3).toArray();

    // console.log('Recent wallet updates with holdings:', 
    //   recentWalletUpdates.map(w => ({
    //     address: w.address,
    //     lastValueChange: w.lastValueChange,
    //     totalValue: w.totalValue,
    //     previousTotalValue: w.previousTotalValue,
    //     firstTotalValue: w.firstTotalValue,
    //     holdingsCount: w.topHoldings?.length
    //   }))
    // );

    // Add this debug query to check date fields
    // const dateCheck = await wallets.aggregate([
    //   {
    //     $match: {
    //       lastValueChange: { $exists: true }
    //     }
    //   },
    //   {
    //     $project: {
    //       address: 1,
    //       lastValueChange: 1,
    //       totalValue: 1,
    //       previousTotalValue: 1,
    //       dateType: { $type: "$lastValueChange" }
    //     }
    //   },
    //   { $limit: 5 }
    // ]).toArray();

    // console.log('Date field check:', JSON.stringify(dateCheck, null, 2));

    // Modify the valueChanges stage to be more lenient and show what we're matching
    const last24HoursStats = await wallets.aggregate([
      {
        $facet: {
          "newWallets": [
            {
              $match: {
                createdAt: {
                  $gte: twentyFourHoursAgo,
                  $exists: true
                }
              }
            },
            {
              $count: "count"
            }
          ],
          "valueChanges": [
            {
              $match: {
                $or: [
                  {
                    lastValueChange: {
                      $gte: twentyFourHoursAgo.toISOString()
                    }
                  },
                  {
                    lastSeen: {
                      $gte: twentyFourHoursAgo.toISOString()
                    }
                  }
                ],
                totalValue: { $exists: true }
              }
            },
            {
              $project: {
                address: 1,
                totalValue: { $ifNull: ["$totalValue", 0] },
                previousTotalValue: { $ifNull: ["$previousTotalValue", 0] },
                lastValueChange: 1,
                lastSeen: 1,
                valueChange: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$totalValue", null] },
                        { $ne: ["$previousTotalValue", null] }
                      ]
                    },
                    then: {
                      $subtract: [
                        { $ifNull: ["$totalValue", 0] },
                        { $ifNull: ["$previousTotalValue", 0] }
                      ]
                    },
                    else: 0
                  }
                }
              }
            },
            {
              $match: {
                $or: [
                  { valueChange: { $ne: 0 } },
                  {
                    $and: [
                      { totalValue: { $ne: 0 } },
                      { previousTotalValue: { $ne: 0 } }
                    ]
                  }
                ]
              }
            },
            {
              $group: {
                _id: null,
                totalValueChange: { $sum: "$valueChange" },
                walletsUpdated: { $sum: 1 },
                totalCurrentValue: { $sum: "$totalValue" },
                totalPreviousValue: { $sum: "$previousTotalValue" }
              }
            }
          ]
        }
      }
    ]).toArray();

    // Add this debug log
    // console.log('24 Hour Stats Raw:', JSON.stringify(last24HoursStats, null, 2));

    // Get total unique wallets count
    const uniqueWalletsCount = await wallets.countDocuments();

    // Get top 5 most valuable domains, excluding Unknown and requiring minimum value
    const topDomains = await wallets.aggregate([
      {
        $match: {
          domain: {
            $exists: true,
            $ne: '',
            $regex: /\.sol$/i  // Only include .sol domains
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
          smallestWallet: { $min: '$totalValue' },
          addresses: { $push: '$address' }
        }
      },
      {
        $match: {
          walletCount: { $gt: 0 },
          _id: { $ne: null }  // Additional check to exclude null domains
        }
      },
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
          smallestWalletValue: '$smallestWallet',
          addresses: '$addresses'
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
          _id: '$address',  // Group by wallet address
          holdings: {
            $addToSet: '$topHoldings.symbol'  // Use addToSet to avoid duplicates within a wallet
          }
        }
      },
      { $match: { 'holdings.1': { $exists: true } } },  // Only wallets with 2+ tokens
      {
        $unwind: {
          path: '$holdings',
          includeArrayIndex: 'index'
        }
      },
      {
        $unwind: {
          path: '$holdings',
          includeArrayIndex: 'index2'
        }
      },
      {
        $match: {
          $expr: { $lt: ['$index', '$index2'] }  // Only keep pairs where first index < second index
        }
      },
      {
        $group: {
          _id: {
            token1: '$holdings',
            token2: '$holdings'
          },
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 }  // Only pairs held by multiple wallets
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]).toArray();

    return res.status(200).json({
      trendPrice,
      largeHoldersCount: largeHoldersCount,
      totalAmountStaked: formatNumber(totalAmountStaked) + " TREND",
      totalUniqueWallets: uniqueWalletsCount,
      bitcoinPrice: btcPrice ?? 0,
      solanaPrice: solanaPrice ?? 0,
      ethereumPrice: ethPrice ?? 0,
      // sp500MarketCap: sp500Cap,
      // spx6900MarketCap: spx6900Cap,
      // percentOfSpx6900flippingSp500,
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
          (totalValueStats[0]?.totalPortfolioValue || 1)) * 100,
        addresses: domain.addresses
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
        sharedHolders: Math.floor(pair.count / 2)  // Divide by 2 since we counted each pair twice
      })),
      last24Hours: {
        newWallets: last24HoursStats[0]?.newWallets[0]?.count || 0,
        walletsUpdated: last24HoursStats[0]?.valueChanges[0]?.walletsUpdated || 0,
        totalValueChange: last24HoursStats[0]?.valueChanges[0]?.totalValueChange || 0,
        percentageChange: last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue > 0
          ? ((last24HoursStats[0]?.valueChanges[0]?.totalCurrentValue -
            last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue) /
            last24HoursStats[0]?.valueChanges[0]?.totalPreviousValue) * 100
          : 0
      },
      topTweetedTickers: topTickersData,
      whaleActivity: whaleActivityData,
      optionRecommendations: getValue(optionRecommendations, { total_stocks_analyzed: 0, recommendations: [] })
    });

  } catch (error) {
    console.error('Error fetching wallet stats:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
