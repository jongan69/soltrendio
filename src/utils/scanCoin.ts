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
    };
    priceChange: {
        h24: number;
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
    priceChange24h: string;
    holderCount: number;
    holderCountChange: {
        day1: number;
        day7: number;
        day30: number;
    };
    burnedTokens: string;
    isMintable: boolean;
    isFreezable: boolean;
    metrics: {
        isTrending: boolean;
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

        const holderCountChange = {
            day1: 0,
            day7: 0,
            day30: 0,
            // hourly: 0
        };

        if (holderHistory?.historicalHolderCount) {
            holderCountChange.day1 = getHolderCountChange(holderHistory.historicalHolderCount, 1);
            holderCountChange.day7 = getHolderCountChange(holderHistory.historicalHolderCount, 7);
            holderCountChange.day30 = getHolderCountChange(holderHistory.historicalHolderCount, 30);
        }

        // if (hourlyHolderHistory?.hourlyHolderCount) {
        //     holderCountChange.hourly = getHolderCountChange(hourlyHolderHistory.hourlyHolderCount, 1);
        // }

        return {
            symbol: validPair.baseToken.symbol,
            pairAddress: validPair.pairAddress,
            contractAddress: contractAddress,
            liquidityUSD: validPair.liquidity.usd,
            volume24h: validPair.volume.h24,
            priceChange24h: `${validPair.priceChange.h24}%`,
            burnedTokens: getBurnedAmount(pairDetails.ll.locks),
            isMintable: pairDetails.ta.solana.isMintable,
            isFreezable: pairDetails.ta.solana.isFreezable,
            metrics: analysis,
            holderCountChange: holderCountChange,
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
    if (!history?.length || history.length < days) return 0;

    // Sort once and cache the result
    if (!history[0].hasOwnProperty('timestamp')) {
        history.forEach(item => {
            (item as any).timestamp = new Date(item.day).getTime();
        });
        history.sort((a, b) => (b as any).timestamp - (a as any).timestamp);
    }

    return history[0].holder_num - history[Math.min(days - 1, history.length - 1)].holder_num;
}

function analyzeMetrics(
    pair: DexScreenerToken,
    trends: TrendData,
    holderHistory?: HistoricalHolderResponse
): {
    isTrending: boolean;
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
    console.log(trends.whaleActivity.bullish);
    return {
        isTrending: trends.topTweetedTickers.some(t => t.ticker.replace('$', '') === symbol),
        hasBullishWhaleActivity: trends.whaleActivity.bullish.some(t => t.symbol === symbol),
        volumeIncreasing: pair.volume.h24 > 0,
        holdersIncreasing,
        buyPressureIncreasing: pair.txns.buys > pair.txns.sells
    };
}
