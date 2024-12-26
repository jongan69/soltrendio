import { NextApiRequest, NextApiResponse } from 'next';
import googleTrends from 'google-trends-api';

type TrendsResponse = {
  default?: { timelineData: any[] };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TrendsResponse>
) {
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { keywords } = req.body;
  console.log("Received keywords:", keywords);

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    console.log("Invalid keywords format:", keywords);
    res.status(400).json({ error: 'Keywords must be a non-empty array' });
    return;
  }

  // Filter out long token addresses and clean keywords
  const cleanedKeywords = keywords
    .filter((kw: string) => kw.length < 30) // Filter out long addresses
    .map((kw: string) => kw.replace(/[^a-zA-Z0-9]/g, '')) // Remove special characters
    .filter((kw: string) => {
      // Keep only uppercase alphanumeric strings (tickers)
      const isUpperCase = kw === kw.toUpperCase();
      const hasLetters = /[A-Z]/.test(kw);
      return isUpperCase && hasLetters && kw.length >= 2;
    });

  // If no valid keywords after cleaning, return empty data
  if (cleanedKeywords.length === 0) {
    console.log("No valid tickers after cleaning");
    return res.status(200).json({ 
      default: { 
        timelineData: [] 
      } 
    });
  }

  console.log("Cleaned keywords for Google Trends:", cleanedKeywords);

  try {
    // Use only first 5 keywords (Google Trends limit)
    const keywordsToUse = cleanedKeywords.slice(0, 5);
    
    console.log("Calling Google Trends API with options:", {
      keyword: keywordsToUse,
      startTime: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)), // Last 7 days
      endTime: new Date(),
      geo: 'US' // Add geo restriction to improve results
    });

    const results = await googleTrends.interestOverTime({
      keyword: keywordsToUse,
      startTime: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)), // Last 7 days
      endTime: new Date(),
      geo: 'US'
    });

    console.log("Raw Google Trends response type:", typeof results);
    console.log("Raw Google Trends response length:", results.length);

    try {
      const parsedResults = JSON.parse(results);
      console.log("Successfully parsed results");
      res.status(200).json(parsedResults);
    } catch (parseError) {
      console.error("Error parsing Google Trends response:", parseError);
      console.error("First 200 chars of response:", results.substring(0, 200));
      res.status(500).json({ error: 'Failed to parse Google Trends response' });
    }
  } catch (error) {
    console.error('Error fetching trends:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    res.status(500).json({ error: 'Error fetching trends data' });
  }
}