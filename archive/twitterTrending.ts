import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterClient } from '../../../../archive/twitterAuth';
import { Tweet } from 'agent-twitter-client';
import { TRACKED_ACCOUNTS } from '@utils/trackedAccounts';
import { checkApiKey } from '@utils/checkApiKey';

// Add error handling wrapper for client initialization
async function getTwitterClient() {
    try {
        // Skip WebRTC in production
        if (process.env.NODE_ENV === 'production') {
            console.warn('WebRTC functionality disabled in production environment');
            return {
                isReady: () => true,
                initialize: async () => {},
                getUserTweets: async (username: string) => []
            };
        }
        
        const client = TwitterClient.getInstance();
        if (!client.isReady()) {
            await client.initialize();
        }
        return client;
    } catch (error) {
        console.error('Failed to initialize Twitter client:', error);
        // Return mock client when real client fails
        return {
            isReady: () => true,
            initialize: async () => {},
            getUserTweets: async (username: string) => []
        };
    }
}

interface TickerMention {
    ticker: string;
    count: number;
    tweets: Array<{
        text: string;
        username: string;
        createdAt: Date;
        url?: string;
    }>;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        const isValid = await checkApiKey(apiKey as string);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }

        let client: any;
        try {
            client = await getTwitterClient();
        } catch (error: any) {
            return res.status(503).json({
                success: false,
                error: 'Twitter service temporarily unavailable',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }

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

        const allTweets = results
            .filter((result): result is PromiseFulfilledResult<{username: string, tweets: Tweet[]}> => 
                result.status === 'fulfilled'
            )
            .map(result => result.value);

        // Track mentioned tickers
        const tickerMentions: { [key: string]: TickerMention } = {};
        const seenTweets = new Set<string>(); // Track unique tweets by text + username

        // Process tweets to find ticker mentions
        allTweets.forEach(({ username, tweets }) => {
            tweets.forEach((tweet: Tweet) => {
                // Create unique key for tweet
                const tweetKey = `${username}:${tweet.text}`;
                if (seenTweets.has(tweetKey)) return; // Skip if we've seen this tweet
                seenTweets.add(tweetKey);

                const tickerMatches = tweet.text?.match(/\$([A-Za-z]{2,10})/g);
                
                if (tickerMatches) {
                    // Use Set to get unique tickers from this tweet
                    const uniqueTickers = new Set(tickerMatches);
                    uniqueTickers.forEach(match => {
                        const ticker = match.toUpperCase();
                        if (!tickerMentions[ticker]) {
                            tickerMentions[ticker] = {
                                ticker,
                                count: 0,
                                tweets: []
                            };
                        }
                        
                        tickerMentions[ticker].count++;
                        tickerMentions[ticker].tweets.push({
                            text: tweet.text ?? '',
                            username,
                            createdAt: new Date(),
                            url: tweet.urls?.[0] ?? undefined
                        });
                    });
                }
            });
        });

        // Convert to array and sort by mention count
        const sortedTickers = Object.values(tickerMentions)
            .sort((a, b) => b.count - a.count);

        return res.status(200).json({
            success: true,
            data: sortedTickers
        });

    } catch (error) {
        console.error('Twitter fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch tweets'
        });
    }
}