import { formatNumber } from './formatNumber';
import { fetchJupiterSwap } from './fetchJupiterSwap';
import { DEFAULT_TOKEN_3, SOLANA_ADDRESS } from './globals';
import { fetchBitcoinPrice } from './bitcoinPrice';
import { fetchSP500MarketCap } from './fetchSP500';
import { fetch6900 } from './fetch6900';

export async function formatTrendsTweet(trends: any) {
    const {
        totalUniqueWallets,
        totalAmountStaked,
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
    const sp500MarketCap = await fetchSP500MarketCap();
    const spx6900MarketCap = await fetch6900();
    const percentOfMissionCompleted = ((spx6900MarketCap / sp500MarketCap) * 100).toFixed(5);
    return `📊 Soltrendio Analytics Update

📈 $TREND Price: $${jupiterSwapPrice}
🔒 Staked in Vault: ${totalAmountStaked}
💻 Solana Price: $${Number(solanaPrice).toFixed(2)}
🪙 Bitcoin Price: $${bitcoinPrice}
🏠 S&P 500 Market Cap: $${formatNumber(sp500MarketCap)}
🎰 $SPX Market Cap: $${formatNumber(spx6900MarketCap)}

Percent of Flippeneing: ${percentOfMissionCompleted}%

👥 Total Wallets: ${totalUniqueWallets}
💼 Active Wallets: ${portfolioMetrics.activeWallets}
💰 Total Portfolio Value: $${formatNumber(portfolioMetrics.totalPortfolioValue)}
🎉 New Wallets (24h): ${last24Hours.newWallets}

📈 Top Tokens:
${topTokens}

Track individual wallets at soltrendio.com`;
}