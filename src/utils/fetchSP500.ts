import { MongoClient } from 'mongodb';
import yahooFinance from 'yahoo-finance2';

// MongoDB configuration
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'stockData';
const COLLECTION_NAME = 'sp500Companies';

/**
 * Fetch and save market caps for S&P 500 companies
 */
export const fetchSP500MarketCap = async (): Promise<number> => {
  const client = new MongoClient(MONGO_URI as string);

  try {
    // Connect to MongoDB
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Fetch S&P 500 tickers
    const companies = await collection.find({}, { projection: { Symbol: 1, marketCap: 1, _id: 0 } }).toArray();
    const tickers = companies.map((company) => company.Symbol);

    // Calculate total market cap
    let totalMarketCap = 0;

    await Promise.all(
      tickers.map(async (ticker) => {
        try {
          // Fetch market cap from Yahoo Finance
          const quote: any = await yahooFinance.quote(ticker);

          if (quote.marketCap) {
            // Add to total market cap
            totalMarketCap += quote.marketCap;

            // Update MongoDB with the new market cap
            await collection.updateOne(
              { Symbol: ticker },
              { $set: { marketCap: quote.marketCap, lastUpdated: new Date() } },
              { upsert: true } // Insert if it doesn't exist
            );
          } else {
            console.warn(`Market cap missing for ${ticker}, skipping...`);
          }
        } catch (error: any) {
          console.error(`Error fetching data for ${ticker}:`, error.message);

          // Fallback to the last saved market cap in MongoDB
          const fallbackCompany = await collection.findOne({ Symbol: ticker }, { projection: { marketCap: 1 } });

          if (fallbackCompany?.marketCap) {
            console.warn(`Using last saved market cap for ${ticker}: ${fallbackCompany.marketCap}`);
            totalMarketCap += fallbackCompany.marketCap;
          } else {
            console.warn(`No saved market cap found for ${ticker}, skipping...`);
          }
        }
      })
    );

    return totalMarketCap;
  } catch (error: any) {
    console.error('Error fetching data from MongoDB or Yahoo Finance:', error.message);
    return 0;
  } finally {
    await client.close();
  }
};
