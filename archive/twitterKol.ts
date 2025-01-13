import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterClient } from '../../../../archive/twitterAuth';
import { Tweet } from 'agent-twitter-client';
import { TRACKED_ACCOUNTS } from '@utils/trackedAccounts';
import { checkApiKey } from '@utils/checkApiKey';

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

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        if (!client.isReady()) {
            await client.initialize();
        }

        const isValid = await checkApiKey(apiKey as string);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        // Fetch tweets from all tracked accounts
        const results = await Promise.allSettled(
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

        // Filter out rejected promises and get fulfilled values
        const allTweets = results
            .filter((result): result is PromiseFulfilledResult<{username: string, tweets: Tweet[]}> => 
                result.status === 'fulfilled'
            )
            .map(result => result.value);

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