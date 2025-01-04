import getTrends from '@utils/getTrends';
import { postTweet } from '../twitter/tweet';
// import { NextResponse } from 'next/server';
import { formatTrendsTweet } from '@utils/formatTweet';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

export async function GET(request: Request) {
    try {
        // Get trends data
        const trends = await getTrends();

        // Format tweet message
        const tweetMessage = formatTrendsTweet(trends);

        // For testing: just log the tweet instead of posting
        console.log('Tweet message would be:', tweetMessage);
        await postTweet(tweetMessage);  // Comment this out during testing

        return new Response(JSON.stringify({
            message: 'Cron job completed successfully',
            tweetMessage // Include the message in response for testing
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    }
}