import { NextApiRequest, NextApiResponse } from 'next';
import getTrends from '@utils/getTrends';
import { postTweet } from './twitter/tweet';
import { formatNumber } from '@utils/formatNumber';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Get trends data
        const trends = await getTrends();

        // Format tweet message
        const tweetMessage = formatTrendsTweet(trends);

        // For testing: just log the tweet instead of posting
        console.log('Tweet message would be:', tweetMessage);
        await postTweet(tweetMessage);  // Comment this out during testing

        res.status(200).json({
            message: 'Cron job completed successfully',
            tweetMessage // Include the message in response for testing
        });
    } catch (error) {
        console.error('Cron job failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

function formatTrendsTweet(trends: any) {
    const {
        totalUniqueWallets,
        portfolioMetrics,
        last24Hours,
        topTokensByValue
    } = trends;

    // Format top tokens section with $ before each symbol
    const topTokens = topTokensByValue
        .slice(0, 3)
        .map((token: any) => `$${token.tokenSymbol}: $${formatNumber(token.totalUsdValue)}`)
        .join('\n');

    return `📊 Soltrendio Analytics Update

👥 Total Wallets: ${totalUniqueWallets}
💼 Active Wallets: ${portfolioMetrics.activeWallets}
💰 Total Portfolio Value: $${formatNumber(portfolioMetrics.totalPortfolioValue)}
🆕 New Wallets (24h): ${last24Hours.newWallets}

📈 Top Tokens:
${topTokens}

Track individual wallets at soltrendio.com`;
}