import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterClient } from './twitterAuth';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Start initialization
    const client = TwitterClient.getInstance();


    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!client.isReady()) {
            await client.initialize();
        }
        // Get query parameters
        const { query, limit = '100' } = req.body;

        // Validate required parameters
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        // Convert limit to number and validate
        const limitNum = parseInt(limit as string, 10);
        if (isNaN(limitNum) || limitNum < 1) {
            return res.status(400).json({ error: 'Invalid limit parameter' });
        }

        // Perform the search
        const tweets = await client.search(query);


        // Return the results
        return res.status(200).json({
            success: true,
            data: tweets
        });

    } catch (error) {
        console.error('Twitter search error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to search tweets'
        });
    }
}