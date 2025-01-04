import getTrends from '@utils/getTrends';
import { formatTrendsTweet } from '@utils/formatTweet';
import Twitter from 'twitter-api-v2';
import type { NextApiRequest, NextApiResponse } from 'next';

const client = new Twitter({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

async function postTweet(message: string) {
    try {
        await client.v2.tweet(message);
        console.log('Successfully tweeted:', message);
    } catch (error: any) {
        // Log detailed Twitter API error information
        console.error('Twitter API Error:', {
            code: error.code,
            message: error.message,
            data: error.data,
            rateLimit: error.rateLimit
        });
        throw error;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const trends = await getTrends();
        const tweetMessage = await formatTrendsTweet(trends);
        console.log(tweetMessage);
        await postTweet(tweetMessage);
        return res.status(200).json({
            message: 'Cron job completed successfully',
            tweetMessage
        });

    } catch (error: any) {
        console.error('Cron job failed:', error);
        return res.status(error.code).json({
            error: error.message,
            details: `${error.data.title} Error: ${error.data.detail}`,
            twitterRateLimit: error?.rateLimit
        });
    }
}