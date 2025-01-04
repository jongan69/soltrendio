import { formatNumber } from './formatNumber';
import { fetchJupiterSwap } from './fetchJupiterSwap';
import { DEFAULT_TOKEN_3 } from './globals';

export async function formatTrendsTweet(trends: any) {
    const {
        totalUniqueWallets,
        portfolioMetrics,
        last24Hours,
        topTokensByValue
    } = trends;
    const jupiterSwapResponse = await fetchJupiterSwap(DEFAULT_TOKEN_3);
    // Format top tokens section with $ before each symbol
    const topTokens = topTokensByValue
        .slice(0, 3)
        .map((token: any) => `$${token.tokenSymbol}: $${formatNumber(token.totalUsdValue)}`)
        .join('\n');

    const jupiterSwapPrice = jupiterSwapResponse.data[DEFAULT_TOKEN_3].price;

    return `📊 Soltrendio Analytics Update
📈 $TREND Price: $${jupiterSwapPrice}
👥 Total Wallets: ${totalUniqueWallets}
💼 Active Wallets: ${portfolioMetrics.activeWallets}
💰 Total Portfolio Value: $${formatNumber(portfolioMetrics.totalPortfolioValue)}
🆕 New Wallets (24h): ${last24Hours.newWallets}

📈 Top Tokens:
${topTokens}

Track individual wallets at soltrendio.com`;
}