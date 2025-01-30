import { getSolanaTokenCA } from "./caFromTicker";
import getHistoricalHolderCount from "./getHolders";
import { isSolanaAddress } from "./isSolanaAddress";
// import getHourlyHistoricalHolderCount from "./getHourlyHolders";
import { getTopTickers } from "./topTickers";
import { getLatestWhaleActivity } from "./getAssetDashWhaleWatch";

interface DexScreenerToken {
    baseToken: {
        symbol: string;
        address: string;
    };
    quoteToken: {
        address: string;
    };
    pairAddress: string;
    txns: {
        buys: number;
        sells: number;
    };
    volume: {
        h24: number;
        h6: number;
        h1: number;
        m5: number;
    };
    priceChange: {
        h24: number;
        h6: number;
        h1: number;
        m5: number;
    };
    liquidity: {
        usd: number;
    };
}

interface TrendData {
    topTweetedTickers: Array<{
        ticker: string;
        count: number;
        ca?: string;
    }>;
    whaleActivity: {
        bullish: Array<{ symbol: string }>;
        bearish: Array<{ symbol: string }>;
    };
}

interface CoinAnalysis {
    symbol: string;
    contractAddress: string;
    pairAddress: string;
    liquidityUSD: number;
    volume24h: number;
    volume6h: number;
    volume1h: number;
    volume5m: number;
    priceChange24h: string;
    priceChange6h: string;
    priceChange1h: string;
    priceChange5m: string;
    holderCount: number;
    holderCountChange?: {
        day1: number;
        day7: number;
        day30: number;
    };
    burnedTokens: string;
    isMintable: boolean;
    isFreezable: boolean;
    metrics: {
        isTwitterTrending: boolean;
        volumeIncreasing: boolean;
        hasBullishWhaleActivity: boolean;
        holdersIncreasing: boolean;
        buyPressureIncreasing: boolean;
    };
}

interface HistoricalHolderResponse {
    historicalHolderCount: Array<{
        day: string;
        holder_num: number;
    }>;
}

export async function scanCoin(input: string): Promise<CoinAnalysis | null> {
    try {
        const isAddress = isSolanaAddress(input);
        const contractAddress = isAddress ? input : await getSolanaTokenCA(input);

        // Parallelize API calls
        const [
            dexScreenerData,
            trendsData,
            whaleActivity,
            holderHistory,
            // hourlyHolderHistory
        ] = await Promise.all([
            getDexScreenerData(contractAddress),
            getTopTickers(),
            getLatestWhaleActivity(),
            getHistoricalHolderCount(contractAddress),
            // getHourlyHistoricalHolderCount(contractAddress)
        ]);

        if (!dexScreenerData) return null;
        // console.log(holderHistory);
        const validPair = dexScreenerData.pairs.find(
            (pair: DexScreenerToken) =>
                (pair.quoteToken.address === 'So11111111111111111111111111111111111111112' ||
                    pair.quoteToken.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') &&
                pair.liquidity.usd > 5000
        );

        if (!validPair) return null;

        // Get pair details after finding valid pair
        const pairDetails = await getPairDetails(validPair.pairAddress);

        // 6. Analyze Metrics
        const analysis = analyzeMetrics(validPair, {
            topTweetedTickers: trendsData || [],
            whaleActivity: whaleActivity || []
        }, holderHistory);

        // Initialize holderCountChange only if we have valid holder history
        const holderCountChangeData = holderHistory?.historicalHolderCount ? {
            day1: getHolderCountChange(holderHistory.historicalHolderCount, 1),
            day7: getHolderCountChange(holderHistory.historicalHolderCount, 7),
            day30: getHolderCountChange(holderHistory.historicalHolderCount, 30),
        } : undefined;

        return {
            symbol: validPair.baseToken.symbol,
            pairAddress: validPair.pairAddress,
            contractAddress: contractAddress,
            liquidityUSD: validPair.liquidity.usd,
            volume24h: validPair.volume.h24,
            volume6h: validPair.volume.h6,
            volume1h: validPair.volume.h1,
            volume5m: validPair.volume.m5,
            priceChange24h: `${validPair.priceChange.h24}%`,
            priceChange6h: `${validPair.priceChange.h6}%`,
            priceChange1h: `${validPair.priceChange.h1}%`,
            priceChange5m: `${validPair.priceChange.m5}%`,
            burnedTokens: getBurnedAmount(pairDetails.ll.locks),
            isMintable: pairDetails.ta.solana.isMintable,
            isFreezable: pairDetails.ta.solana.isFreezable,
            metrics: analysis,
            ...(holderCountChangeData && { holderCountChange: holderCountChangeData }),
            holderCount: pairDetails.holders,
        };

    } catch (error) {
        console.error('Error scanning coin:', error);
        return null;
    }
}

async function getDexScreenerData(contractAddress: string) {
    const response = await fetch(
        `https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`
    );
    if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
    }
    return response.json();
}

async function getPairDetails(pairAddress: string) {
    const response = await fetch(
        `https://io.dexscreener.com/dex/pair-details/v3/solana/${pairAddress}`
    );
    if (!response.ok) {
        throw new Error(`DexScreener pair details API error: ${response.status}`);
    }
    return response.json();
}

function getBurnedAmount(locks: Array<{ tag: string; amount: string }>): string {
    const burnedLock = locks.find(lock => lock.tag === 'Burned');
    return burnedLock ? burnedLock.amount : '0';
}

function getHolderCountChange(history: Array<{ day: string; holder_num: number }>, days: number): number {
    if (!history?.length) return 0;
    
    // Filter out future dates and sort by date descending
    const validHistory = history
        .filter(item => new Date(item.day) <= new Date())
        .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());

    console.log('Valid history:', validHistory);
    
    if (validHistory.length < 2) {
        // Use the raw history if no valid dates (temporary fix for date issue)
        const sortedHistory = [...history].sort((a, b) => 
            new Date(b.day).getTime() - new Date(a.day).getTime()
        );
        const compareIndex = Math.min(days - 1, sortedHistory.length - 1);
        return sortedHistory[0].holder_num - sortedHistory[compareIndex].holder_num;
    }

    const compareIndex = Math.min(days - 1, validHistory.length - 1);
    return validHistory[0].holder_num - validHistory[compareIndex].holder_num;
}

function analyzeMetrics(
    pair: DexScreenerToken,
    trends: TrendData,
    holderHistory?: HistoricalHolderResponse
): {
    isTwitterTrending: boolean;
    volumeIncreasing: boolean;
    hasBullishWhaleActivity: boolean;
    holdersIncreasing: boolean;
    buyPressureIncreasing: boolean;
} {
    const symbol = pair.baseToken.symbol.replace('$', '');

    // Calculate if holders are increasing based on historical data
    let holdersIncreasing = false;
    const historicalHolders = holderHistory?.historicalHolderCount;
    if (historicalHolders && historicalHolders.length >= 2) {
        const sortedHistory = historicalHolders
            .slice(0, 7)
            .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());

        // Count increasing days using reduce
        const increasingDays = sortedHistory.slice(1).reduce((count, curr, index) => {
            return count + (curr.holder_num < sortedHistory[index].holder_num ? 1 : 0);
        }, 0);

        holdersIncreasing = increasingDays > (sortedHistory.length - 1) / 2;
    }
    // console.log(trends.whaleActivity.bullish);
    return {
        isTwitterTrending: trends.topTweetedTickers.some(t => t.ticker.replace('$', '') === symbol),
        hasBullishWhaleActivity: trends.whaleActivity.bullish.some(t => t.symbol === symbol),
        volumeIncreasing: pair.volume.h24 > 0,
        holdersIncreasing,
        buyPressureIncreasing: pair.txns.buys > pair.txns.sells
    };
}
