import { connectToDatabase } from "@pages/api/db/connectDB";
import { MongoClient } from "mongodb";

interface WalletDocument {
    apiKey: string;
    isPremium: boolean;
}

export const checkApiKey = async (apiKey: string): Promise<boolean> => {
    let mongoClient: MongoClient | null = null;
    
    try {
        // Validate API key format
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        mongoClient = await connectToDatabase();
        const db = mongoClient.db("walletAnalyzer");
        
        // Check if API key exists and is valid
        const wallet = await db.collection<WalletDocument>('wallets').findOne({
            apiKey: apiKey,
            isPremium: true // Ensure the wallet has premium status
        });

        return !!wallet;
    } catch (error) {
        console.error('Error checking API key:', error);
        return false;
    } finally {
        // Always close the connection
        if (mongoClient) {
            await mongoClient.close();
        }
    }
}