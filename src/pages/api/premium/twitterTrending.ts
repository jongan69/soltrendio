import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterClient } from './twitterAuth';
import { Tweet } from 'agent-twitter-client';

// List of accounts to track
const TRACKED_ACCOUNTS = [
    '0xMert_',
    'blknoiz06',
    'DeeZe',
    'Loopifyyy',
    '0xMerp',
    'optimizoor',
    'DancingEddie_',
    'VitalikButerin',
    'notthreadguy',
    'aeyakovenko',
    'rajgokal',
    'zhusu',
    'vydamo_'
];

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Initialize scraper outside request handler to reuse connection
    const client = TwitterClient.getInstance();

    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!client.isReady()) {
            await client.initialize();
        }
        // Fetch tweets from all tracked accounts
        const allTweets = await Promise.all(
            TRACKED_ACCOUNTS.map(async (username) => {
                try {
                    const userTweets = await client.getUserTweets(username);
                    const tweets: Tweet[] = [];
                    for await (const tweet of userTweets) {
                        tweets.push(tweet);
                    }
                    return {
                        username,
                        tweets
                    };
                } catch (error) {
                    console.error(`Error fetching tweets for ${username}:`, error);
                    return {
                        username,
                        tweets: []
                    };
                }
            })
        );

        // Filter out empty results and sort by date
        const flattenedTweets = allTweets
            .flatMap(({ username, tweets }) => 
                tweets.map((tweet: Tweet) => ({
                    ...tweet,
                    username
                }))
            );

        // Return the results
        return res.status(200).json({
            success: true,
            data: flattenedTweets
        });

    } catch (error) {
        console.error('Twitter fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch tweets'
        });
    }
}