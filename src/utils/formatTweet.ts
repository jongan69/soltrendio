import { formatNumber } from './formatNumber';
import { fetchJupiterSwap } from './fetchJupiterSwap';
import { DEFAULT_TOKEN_3, SOLANA_ADDRESS } from './globals';
import { fetchBitcoinPrice } from './bitcoinPrice';

export async function formatTrendsTweet(trends: any) {
    const {
        totalUniqueWallets,
        portfolioMetrics,
        last24Hours,
        topTokensByValue
    } = trends;
    const jupiterSwapResponse = await fetchJupiterSwap(DEFAULT_TOKEN_3);
    const jupiterSwapResponse2 = await fetchJupiterSwap(SOLANA_ADDRESS);
    // Format top tokens section with $ before each symbol
    const topTokens = topTokensByValue
        .slice(0, 3)
        .map((token: any) => `$${token.tokenSymbol}: $${formatNumber(token.totalUsdValue)}`)
        .join('\n');

    const jupiterSwapPrice = jupiterSwapResponse.data[DEFAULT_TOKEN_3].price;
    const solanaPrice = jupiterSwapResponse2.data[SOLANA_ADDRESS].price;
    const bitcoinPrice = await fetchBitcoinPrice();
    return `📊 Soltrendio Analytics Update

📈 $TREND Price: $${jupiterSwapPrice}
💻 Solana Price: $${solanaPrice}
🪙 Bitcoin Price: $${bitcoinPrice}

👥 Total Wallets: ${totalUniqueWallets}
💼 Active Wallets: ${portfolioMetrics.activeWallets}
💰 Total Portfolio Value: $${formatNumber(portfolioMetrics.totalPortfolioValue)}
🆕 New Wallets (24h): ${last24Hours.newWallets}

📈 Top Tokens:
${topTokens}

Track individual wallets at soltrendio.com`;
}