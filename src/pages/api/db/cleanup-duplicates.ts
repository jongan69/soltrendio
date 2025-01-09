import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from './connectDB';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('API route hit:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
      const client = await connectToDatabase();
      const db = client.db('walletAnalyzer');
    const walletsCollection = db.collection('wallets');

    // Find all duplicate addresses
    const duplicates = await walletsCollection.aggregate([
      {
        $group: {
          _id: "$address",
          count: { $sum: 1 },
          docs: { $push: "$_id" },
          lastSeen: { $max: "$lastSeen" },
          createdAt: { $min: "$createdAt" },
          // Keep the most recent data
          totalValue: { $last: "$totalValue" },
          topHoldings: { $last: "$topHoldings" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    let removedCount = 0;
    let updatedCount = 0;

    // Process each group of duplicates
    for (const duplicate of duplicates) {
      // Keep the first document and update it with the most recent data
      const [keepId, ...removeIds] = duplicate.docs;

      // Update the document we're keeping with the consolidated data
      await walletsCollection.updateOne(
        { _id: keepId },
        {
          $set: {
            lastSeen: duplicate.lastSeen,
            createdAt: duplicate.createdAt,
            totalValue: duplicate.totalValue,
            topHoldings: duplicate.topHoldings
          }
        }
      );
      updatedCount++;

      // Remove the other duplicates
      if (removeIds.length > 0) {
        const result = await walletsCollection.deleteMany({
          _id: { $in: removeIds }
        });
        removedCount += result.deletedCount;
      }
    }

    // Create a unique index on address to prevent future duplicates
    await walletsCollection.createIndex({ "address": 1 }, { unique: true });

    await client.close();

    return res.status(200).json({ 
      message: 'Cleanup completed successfully',
      duplicatesFound: duplicates.length,
      documentsRemoved: removedCount,
      documentsUpdated: updatedCount
    });
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return res.status(500).json({ message: 'Error cleaning up duplicates' });
  }
}

export default handler; 