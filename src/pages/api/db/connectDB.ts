import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('Please add your Mongo URI to .env.local');
}

export const connectToDatabase = async () => {
  const client = new MongoClient(uri as string);
  await client.connect();
  return client;
};