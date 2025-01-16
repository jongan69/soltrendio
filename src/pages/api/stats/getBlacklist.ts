import { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed, use GET.' });
    }

    const startTime = Date.now();

    try {
        const client = await connectToDatabase();
        const db = client.db('soltrendio');
        const collection = db.collection('blacklistedWallets');

        // Find and delete duplicates, keeping the most recent entry
        const deletedDuplicates = await collection.aggregate([
            {
                $sort: { lastSaleTimestamp: -1 } // Sort by timestamp descending
            },
            {
                $group: {
                    _id: "$wallet",
                    docId: { $first: "$_id" }, // Keep the ID of the most recent entry
                    count: { $sum: 1 }
                }
            },
            {
                $match: {
                    count: { $gt: 1 } // Only get groups with duplicates
                }
            }
        ]).toArray();

        // Delete all duplicate entries except the most recent one
        for (const doc of deletedDuplicates) {
            await collection.deleteMany({
                wallet: doc._id,
                _id: { $ne: doc.docId } // Don't delete the most recent entry
            });
        }

        // Get the updated list
        const largeSellers = await collection.find({}).toArray();

        return res.status(200).json({
            status: 'success',
            data: largeSellers,
            processingStats: {
                totalSellers: largeSellers.length,
                duplicatesRemoved: deletedDuplicates.length,
                processedTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
            }
        });

    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
