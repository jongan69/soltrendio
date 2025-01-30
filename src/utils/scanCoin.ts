import { getSolanaTokenCA } from "./caFromTicker";
import getTrends from "./getTrends";
import getHistoricalHolderCount from "./getHolders";
import { isSolanaAddress } from "./isSolanaAddress";
import getHourlyHistoricalHolderCount from "./getHourlyHolders";

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

interface PairDetails {
    holders: number;
    ll: {
        locks: Array<{
            tag: string;
            amount: string;
        }>;
    };
    ta: {
        solana: {
            isMintable: boolean;
            isFreezable: boolean;
        };
    };
}

interface TrendData {
    topTweetedTickers: Array<{
        ticker: string;
        count: number;
    }>;
    whaleActivity: Array<{
        contractAddress: string;
        buys: number;
        sells: number;
        timestamp: number;
    }>;
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
        // Determine if input is contract address or ticker
        const isAddress = isSolanaAddress(input); // Simple check, can be made more robust
        const contractAddress = isAddress ? input : await getSolanaTokenCA(input);

        // 1. Get DexScreener Latest Data
        const dexScreenerData = await getDexScreenerData(contractAddress);
        if (!dexScreenerData) return null;

        // Filter for SOL or USDC pairs with sufficient liquidity
        const validPair = dexScreenerData.pairs.find(
            (pair: DexScreenerToken) =>
                (pair.quoteToken.address === 'So11111111111111111111111111111111111111112' ||
                    pair.quoteToken.address === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') &&
                pair.liquidity.usd > 5000
        );

        if (!validPair) return null;

        // 2. Get Pair Details
        const pairDetails = await getPairDetails(validPair.pairAddress);

        // 3. Get Trends Data
        const trendsData = await getTrends();

        // 4. Get Historical Holder Data
        const holderHistory = await getHistoricalHolderCount(contractAddress);

        // 5. Get Hourly Historical Holder Data 
        const hourlyHolderHistory = await getHourlyHistoricalHolderCount(contractAddress);

        // 6. Analyze Metrics
        const analysis = analyzeMetrics(validPair, pairDetails, trendsData, holderHistory);

        const holderCountChange = {
            day1: 0,
            day7: 0,
            day30: 0,
            hourly: 0
        };

        if (holderHistory?.historicalHolderCount) {
            holderCountChange.day1 = getHolderCountChange(holderHistory.historicalHolderCount, 1);
            holderCountChange.day7 = getHolderCountChange(holderHistory.historicalHolderCount, 7);
            holderCountChange.day30 = getHolderCountChange(holderHistory.historicalHolderCount, 30);
        }

        if (hourlyHolderHistory?.hourlyHolderCount) {
            holderCountChange.hourly = getHolderCountChange(hourlyHolderHistory.hourlyHolderCount, 1);
        }

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
    if (history.length < days) return 0;
    const sortedHistory = history
        .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());
    return sortedHistory[0].holder_num - sortedHistory[Math.min(days - 1, sortedHistory.length - 1)].holder_num;
}

function analyzeMetrics(
    pair: DexScreenerToken,
    details: PairDetails,
    trends: TrendData,
    holderHistory?: HistoricalHolderResponse
): {
    isTrending: boolean;
    volumeIncreasing: boolean;
    holdersIncreasing: boolean;
    buyPressureIncreasing: boolean;
} {
    const symbol = pair.baseToken.symbol.replace('$', '');

    // Calculate if holders are increasing based on historical data
    let holdersIncreasing = false;
    if (holderHistory && holderHistory.historicalHolderCount?.length >= 2) {
        const sortedHistory = holderHistory.historicalHolderCount
            .sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime())
            .slice(0, 7); // Get last 7 days

        // Calculate if trend is increasing
        let increasingDays = 0;
        for (let i = 0; i < sortedHistory.length - 1; i++) {
            if (sortedHistory[i].holder_num > sortedHistory[i + 1].holder_num) {
                increasingDays++;
            }
        }

        // Consider trend increasing if majority of days show increase
        holdersIncreasing = increasingDays > (sortedHistory.length - 1) / 2;
    }

    return {
        isTrending: trends.topTweetedTickers.some(t => t.ticker.replace('$', '') === symbol),
        volumeIncreasing: pair.volume.h24 > 0,
        holdersIncreasing,
        buyPressureIncreasing: pair.txns.buys > pair.txns.sells
    };
}
