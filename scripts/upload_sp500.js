require('dotenv').config(); // Load environment variables from .env
console.log(process.env); // Debug: Check all loaded environment variables
const axios = require('axios');
const csvParser = require('csv-parser');
const { MongoClient } = require('mongodb');
const fs = require('fs');

// Environment variables
const MONGO_URI = process.env.MONGODB_URI;
const DB_NAME = 'stockData';
const COLLECTION_NAME = 'sp500Companies';
const CSV_URL = 'https://datahub.io/core/s-and-p-500-companies/r/constituents.csv';

console.log(MONGO_URI);
// Function to download CSV
const downloadCSV = async (url, filePath) => {
    const response = await axios.get(url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
};

// Function to parse CSV and upload to MongoDB
const uploadToMongoDB = async (filePath) => {
    const client = new MongoClient(MONGO_URI);

    try {
        // Connect to MongoDB
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        // Clear the existing collection
        await collection.deleteMany({});

        // Read and parse the CSV file
        const records = [];
        fs.createReadStream(filePath)
            .pipe(csvParser())
            .on('data', (row) => {
                records.push(row);
            })
            .on('end', async () => {
                // Insert parsed data into MongoDB
                await collection.insertMany(records);
                console.log('Data uploaded to MongoDB successfully.');
                client.close();
            });
    } catch (error) {
        console.error('Error uploading to MongoDB:', error);
        client.close();
    }
};

// Main function to automate the process
const main = async () => {
    const filePath = './sp500_companies.csv';
    console.log('Downloading S&P 500 data...');
    await downloadCSV(CSV_URL, filePath);

    console.log('Uploading data to MongoDB...');
    await uploadToMongoDB(filePath);

    console.log('Done!');
};

main().catch(console.error);
