import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI!;

// Create a single client instance that can be reused
let client: MongoClient | null = null;

async function getMongoClient() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client;
}

interface TwitterCredentials {
  accessToken: string;
  accessTokenSecret: string;
  userId: string;
  screenName: string;
}

export async function saveTwitterCredentials(walletAddress: string, credentials: TwitterCredentials) {
  try {
    const mongoClient = await getMongoClient();
    const database = mongoClient.db('walletAnalyzer'); 
    const wallets = database.collection('wallets');

    // Update the wallet document with Twitter credentials
    await wallets.updateOne(
      { address: walletAddress },
      {
        $set: {
          twitter: {
            accessToken: credentials.accessToken,
            accessTokenSecret: credentials.accessTokenSecret,
            userId: credentials.userId,
            screenName: credentials.screenName,
            linkedAt: new Date()
          }
        }
      },
      { upsert: true }
    );

  } catch (error) {
    console.error('Error saving Twitter credentials:', error);
    throw error;
  }
}

export async function getTwitterCredentials(walletAddress: string) {
  try {
    const mongoClient = await getMongoClient();
    const database = mongoClient.db('walletAnalyzer');
    const wallets = database.collection('wallets');

    const wallet = await wallets.findOne({ address: walletAddress });
    return wallet?.twitter || null;

  } catch (error) {
    console.error('Error getting Twitter credentials:', error);
    throw error;
  }
}

// Optional: Add a cleanup function to close the connection when the app shuts down
export async function closeMongoConnection() {
  if (client) {
    await client.close();
    client = null;
  }
} 