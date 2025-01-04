import getTrends from '@utils/getTrends';
import { formatTrendsTweet } from '@utils/formatTweet';
import Twitter from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

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
        throw error;
    }
}

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Unauthorized cron job attempt');
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const trends = await getTrends();

        const tweetMessage = formatTrendsTweet(trends);

        await postTweet(tweetMessage);

        return new Response(JSON.stringify({
            message: 'Cron job completed successfully',
            tweetMessage
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        return new Response(JSON.stringify({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }), { status: 500 });
    }
}