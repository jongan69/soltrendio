import type { NextApiRequest, NextApiResponse } from 'next';
import { connectToDatabase } from '../db/connectDB';
import OpenAI from "openai";

// Initialize OpenAI
const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.DEEP_SEEK_API_KEY,
});

async function generateAnalytics(tokens: any[]) {
  const prompt = `Given these tokens ${JSON.stringify(tokens)}, provide a detailed crypto portfolio analysis in JSON format with:
  - volatilityScore (0-100)
  - riskRating (Low/Medium/High)
  - priceCorrelations (array of correlations between tokens)
  - performanceMetrics (including sharpeRatio, maxDrawdown, and projected dailyReturns for 30 days)
  Base your analysis on typical crypto market behavior and token characteristics.`;

  const completion = await openai.chat.completions.create({
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: "You are a crypto portfolio analysis expert. Provide analysis in JSON format only."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: "json_object" }
  });

  const response = completion.choices[0].message?.content || '';
  return JSON.parse(response);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, tokens } = req.body;
    
    // Check if the user has premium access
    const client = await connectToDatabase();
    const db = client.db('walletAnalyzer');
    const premiumUsersCollection = db.collection('wallets');
    const existingUser = await premiumUsersCollection.findOne({ address });
    
    if (!existingUser?.isPremium) {
      return res.status(403).json({ error: 'Premium access required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // Generate analytics using OpenAI
    const analytics = await generateAnalytics(tokens);
    // console.log("Analytics:", analytics);
    return res.status(200).json(analytics);
  } catch (error) {
    console.error('Premium analytics error:', error);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
} 