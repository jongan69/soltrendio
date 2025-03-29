import { formatNumber } from './formatNumber';
// import { fetchJupiterSwap } from './fetchJupiterSwap';
// import { DEFAULT_TOKEN_3, SOLANA_ADDRESS } from './globals';
// import { fetchSP500MarketCap } from './fetchSP500';
// import { fetch6900 } from './fetch6900';

export async function formatTrendsTweet(trends: any) {
    const {
        totalUniqueWallets,
        totalAmountStaked,
        portfolioMetrics,
        last24Hours,
        topTokensByValue,
        largeHoldersCount,
        topTweetedTickers,
        trendPrice,
        bitcoinPrice,
        ethereumPrice,
        solanaPrice,
        whaleActivity,
        optionRecommendations
    } = trends;
    // const jupiterSwapResponse = await fetchJupiterSwap(DEFAULT_TOKEN_3);
    // const jupiterSwapResponse2 = await fetchJupiterSwap(SOLANA_ADDRESS);
    // Format top tokens section with $ before each symbol
    const topTokens = topTokensByValue
        .slice(0, 3)
        .map((token: any) => `$${token.tokenSymbol}: $${formatNumber(token.totalUsdValue)}`)
        .join('\n');

    // console.log(topTweetedTickers);
    // Format top tweeted tickers with conditional plural
    const topTickers = topTweetedTickers?.length
        ? topTweetedTickers
            .map((item: any) => `${item.ticker}: ${item.count} ${item.count === 1 ? 'tweet' : 'tweets'}`)
            .join('\n')
        : '';

    const bullishWhaleActivity = whaleActivity.bullish.map((item: any) =>
        `${item.name} ( ${item.symbol.startsWith('$') ? item.symbol : '$' + item.symbol} ) Score: ${item.bullishScore}`
    ).join('\n');

    const bearishWhaleActivity = whaleActivity.bearish.map((item: any) =>
        `${item.name} ( ${item.symbol.startsWith('$') ? item.symbol : '$' + item.symbol} ) Score: ${item.bearishScore}`
    ).join('\n');

    // Format top option recommendation
    const topOptionRecommendation = optionRecommendations?.recommendations?.[0];
    const optionRecommendationText = topOptionRecommendation ? `
🎯 Top Option Play:
$${topOptionRecommendation.symbol} (${topOptionRecommendation.companyName})
Score: ${topOptionRecommendation.stockScore.toFixed(2)}
Current Price: $${topOptionRecommendation.currentPrice}
${topOptionRecommendation.options.shortTermCalls ? `📈 Call: $${topOptionRecommendation.options.shortTermCalls.entryPrice} (${topOptionRecommendation.options.shortTermCalls.strikePrice} Strike)` : ''}
${topOptionRecommendation.options.shortTermPuts ? `📉 Put: $${topOptionRecommendation.options.shortTermPuts.entryPrice} (${topOptionRecommendation.options.shortTermPuts.strikePrice} Strike)` : ''}` : '';

    // const jupiterSwapPrice = jupiterSwapResponse.data[DEFAULT_TOKEN_3].price;
    // const solanaPrice = jupiterSwapResponse2.data[SOLANA_ADDRESS].price;
    // const bitcoinPrice = await fetchBitcoinPrice();
    // const sp500MarketCap = await fetchSP500MarketCap();
    // const spx6900MarketCap = await fetch6900();
    // const percentOfMissionCompleted = ((spx6900MarketCap / sp500MarketCap) * 100).toFixed(5);
    return `📊 Soltrendio Analytics Update

📈 $TREND Price: $${trendPrice}
🐋 Large Holders (1M+ tokens): ${largeHoldersCount}
🔒 Staked in Vault: ${totalAmountStaked}
🪙 Bitcoin Price: $${bitcoinPrice}
💻 Solana Price: $${Number(solanaPrice).toFixed(2)}
😂 Ethereum Price: $${Number(ethereumPrice).toFixed(2)}

👥 Total Wallets: ${totalUniqueWallets}
💼 Active Wallets: ${portfolioMetrics.activeWallets}
💰 Total Portfolio Value: $${formatNumber(portfolioMetrics.totalPortfolioValue)}
🎉 New Wallets (24h): ${last24Hours.newWallets}

📈 Top Tokens:
${topTokens}

${topTweetedTickers?.length ? `🐦 Top Tweeted Tickers:
${topTickers}` : ''}

${optionRecommendationText}

🐋 Recent Bullish Whale Activity:
${bullishWhaleActivity}

🐋 Recent Bearish Whale Activity:
${bearishWhaleActivity}

View individual wallet holdings at soltrendio.com
View Market Trends at investassist.app
`;
}