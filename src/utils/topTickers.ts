import { getSolanaTokenCA } from "./caFromTicker";

interface TwitterTrendingResponse {
    success: boolean;
    data: {
        ticker: string;
        count: number;
        tweets: Array<{
            text: string;
            username: string;
            createdAt: string;
        }>;
    }[];
}

interface TickerCount {
    ticker: string;
    count: number;
    ca: any;
}

export const getTopTickers = async (): Promise<TickerCount[] | null> => {
    const TIMEOUT_MS = 40000; // 40 seconds timeout
    const TOP_N = 25; // Number of top tickers to return
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/premium/twitter-trending-tickers`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'x-api-key': process.env.DEV_API_KEY as string
            },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json() as TwitterTrendingResponse;
        
        if (!data.success || !Array.isArray(data.data)) {
            throw new Error('Invalid response format');
        }

        // Pre-sort by count and take top N before CA lookup
        const topNTickers = data.data
            .sort((a, b) => b.count - a.count)
            .slice(0, TOP_N);

        // Perform CA lookups in parallel
        const tickersWithCA = await Promise.all(
            topNTickers.map(async item => {
                const ca = await getSolanaTokenCA(item.ticker);
                return {
                    ticker: item.ticker,
                    count: item.count,
                    ca
                };
            })
        );

        // Filter out any tickers that didn't get a CA
        return tickersWithCA.filter(item => item.ca);

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error fetching top tickers:', error.message);
        } else {
            console.error('Unknown error fetching top tickers:', error);
        }
        return null;
    }
}