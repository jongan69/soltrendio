import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

interface CreatePortfolioRequest {
  portfolioName: string;
  mintAddresses: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { portfolioName, mintAddresses } = req.body as CreatePortfolioRequest;

    // Validate request body
    if (!portfolioName || !mintAddresses || !Array.isArray(mintAddresses)) {
      return res.status(400).json({ 
        error: 'Invalid request body. Required: portfolioName and mintAddresses array' 
      });
    }

    // Make request to CloudFront API
    const response = await fetch('https://d3q4fpkflgd1hz.cloudfront.net/portfolios/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CLOUDFRONT_API_KEY}`
      },
      body: JSON.stringify({
        portfolioName,
        mintAddresses,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    console.log('Portfolio creation response:', data);
    console.log('Portfolio ID:', data.id);
    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI as string);
    const db = client.db('walletAnalyzer');
    const portfoliosCollection = db.collection('portfolios');

    // Save portfolio to MongoDB
    const portfolio = await portfoliosCollection.insertOne({
      portfolioName,
      portfolioId: data.id,
      mintAddresses,
    });
    await client.close();

    console.log(portfolio);

    return res.status(200).json(data);

  } catch (error) {
    console.error('Portfolio creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while creating portfolio' 
    });
  }
}
