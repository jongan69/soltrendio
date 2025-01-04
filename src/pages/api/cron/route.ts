import getTrends from '@utils/getTrends';
import { postTweet } from '../twitter/tweet';
import { NextResponse } from 'next/server';
import { formatTrendsTweet } from '@utils/formatTweet';

export async function GET() {
    try {
        // Get trends data
        const trends = await getTrends();

        // Format tweet message
        const tweetMessage = formatTrendsTweet(trends);

        // For testing: just log the tweet instead of posting
        console.log('Tweet message would be:', tweetMessage);
        await postTweet(tweetMessage);  // Comment this out during testing

        return NextResponse.json({
            message: 'Cron job completed successfully',
            tweetMessage // Include the message in response for testing
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}