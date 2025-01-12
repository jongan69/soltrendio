import { Connection, PublicKey } from '@solana/web3.js';
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

// Add MongoDB connection helper
async function connectToDatabase() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined');
    }
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    return client;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed, use POST.' });
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    // Connect to MongoDB and verify API key
    let mongoClient;
    try {
        mongoClient = await connectToDatabase();
        const db = mongoClient.db("walletAnalyzer");
        
        // Check if API key exists and is valid
        const wallet = await db.collection('wallets').findOne({
            apiKey: apiKey,
            isPremium: true // Ensure the wallet has premium status
        });

        if (!wallet) {
            return res.status(401).json({ error: 'Invalid or expired API key' });
        }

        const { contractAddress } = req.body;

        if (!contractAddress) {
            return res.status(400).json({ error: 'Missing contract address.' });
        }

        if (!process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT) {
            throw new Error('SOLANA_RPC_URL is not set');
        }

        const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT);
        const address = new PublicKey(contractAddress);

        // Fetch transaction signatures for the contract address
        const signatures = await connection.getSignaturesForAddress(address);

        // Batch process signatures
        const batchSize = 10;
        const bundledTransactions = [];

        // Process signatures in batches
        for (let i = 0; i < signatures.length; i += batchSize) {
            const batch = signatures.slice(i, i + batchSize);

            // Create promises for parallel processing
            const batchPromises = batch.map(async (signatureInfo) => {
                try {
                    // First check if it's a bundle
                    const bundleResponse = await fetch(
                        `https://bundles.jito.wtf/api/v1/bundles/transaction/${signatureInfo.signature}`
                    );
                    if (bundleResponse.status == 404 || bundleResponse.status == 400) {
                        return null;
                    }

                    const bundleTxDetails = await bundleResponse.json();

                    // If it's a bundle, then get transaction details
                    if (bundleTxDetails[0]?.bundle_id) {
                        const txDetails = await connection.getTransaction(signatureInfo.signature, {
                            maxSupportedTransactionVersion: 0
                        });

                        if (!txDetails) return null;

                        return {
                            signature: signatureInfo.signature,
                            bundleId: bundleTxDetails[0].bundle_id,
                            blockTime: txDetails.blockTime,
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing signature ${signatureInfo.signature}`);
                    return null;
                }
            });

            // Wait for all promises in the batch to resolve
            const batchResults = await Promise.all(batchPromises);

            // Filter out null results and add valid transactions
            bundledTransactions.push(...batchResults.filter(result => result !== null));

            // Add a small delay between batches to avoid rate limiting
            if (i + batchSize < signatures.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return res.status(200).json({
            status: 'success',
            contractAddress,
            transactionsScanned: signatures.length,
            totalBundles: bundledTransactions.length,
            bundledTransactions
        });
    } catch (error) {
        console.error('Error processing request:', error);
        return res.status(500).json({ error: 'Internal server error' });
    } finally {
        // Close MongoDB connection
        if (mongoClient) {
            await mongoClient.close();
        }
    }
}
