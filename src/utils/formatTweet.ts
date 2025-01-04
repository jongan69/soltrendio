import { formatNumber } from './formatNumber';

export function formatTrendsTweet(trends: any) {
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