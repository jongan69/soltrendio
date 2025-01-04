import getTrends from '@utils/getTrends';
import { formatTrendsTweet } from '@utils/formatTweet';
import Twitter from 'twitter-api-v2';

export const dynamic = 'force-dynamic'; // static by default, unless reading the request

const client = new Twitter({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

export async function postTweet(message: string) {
    try {
        await client.v2.tweet(message);
        console.log('Successfully tweeted:', message);
    } catch (error) {
        console.error('Error posting tweet:', error);
        console.log(error);
    }
}

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