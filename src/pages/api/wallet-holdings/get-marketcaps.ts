import { NextApiRequest, NextApiResponse } from 'next';
// import tokensData from '../../../utils/tokens.json';

interface TokenData {
    id: string;
    platforms: {
        solana: string;
        [key: string]: string;
    };
}

// Rate limiting and retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds

const DEXSCREENER_TOKEN_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

// Fetch token data with retry logic
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
    try {
        const response = await fetch(url, options);
        
        // If we get a rate limit error and have retries left
        if (response.status === 429 && retries > 0) {
            // Get the reset time from headers if available
            const resetTime = response.headers.get('x-ratelimit-reset');
            let delay = INITIAL_RETRY_DELAY;
            
            if (resetTime) {
                const resetTimestamp = parseInt(resetTime) * 1000; // Convert to milliseconds
                const now = Date.now();
                delay = Math.max(resetTimestamp - now, INITIAL_RETRY_DELAY);
            } else {
                // Exponential backoff if no reset time available
                delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries), MAX_RETRY_DELAY);
            }
            
            console.log(`Rate limited. Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1);
        }
        
        return response;
    } catch (error) {
        if (retries > 0) {
            const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries), MAX_RETRY_DELAY);
            console.log(`Request failed. Retrying in ${delay/1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retries - 1);
        }
        throw error;
    }
}

// Fetch token data with rate limiting
const tokensData = await fetchWithRetry('https://api.coingecko.com/api/v3/coins/list?include_platform=true', {
    headers: {
        'x-cg-demo-api-key': COINGECKO_API_KEY!
    }
}).then(res => res.json());

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
  ) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { contractAddresses } = req.body;

    console.log(JSON.stringify(contractAddresses, null, 2));

    if (!contractAddresses || !Array.isArray(contractAddresses)) {
        return res.status(400).json({ error: 'Contract addresses are required' });
    }

    // Implement current marketcap fetching with proper error handling
    const marketcaps = await Promise.all(contractAddresses.map(async (address: string) => {
        try {
            const response = await fetch(`${DEXSCREENER_TOKEN_API_URL}/${address}`);
            const data = await response.json();
            
            // Check if pairs exist and is not empty
            if (!data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) {
                console.warn(`No pairs found for token ${address}`);
                return 0;
            }

            // Get the pair with the highest liquidity
            const highestLiquidityPair = data.pairs.reduce((max: any, current: any) => {
                const maxLiquidity = max.liquidity?.usd || 0;
                const currentLiquidity = current.liquidity?.usd || 0;
                return currentLiquidity > maxLiquidity ? current : max;
            }, data.pairs[0]);

            return highestLiquidityPair?.marketCap || 0;
        } catch (error) {
            console.error(`Error fetching market cap for ${address}:`, error);
            return 0;
        }
    }));

    // Implement all time high marketcap fetching with proper error handling and rate limiting
    const allTimeHighPrices = await Promise.all(contractAddresses.map(async (address: string) => {
        try {
            // Find token id in tokens data using contract address
            const token = (tokensData as TokenData[]).find(token => token.platforms.solana === address);
            if (!token) {
                console.warn(`No token found in token data for address ${address}`);
                return 0;
            }

            const response = await fetchWithRetry(`https://api.coingecko.com/api/v3/coins/${token.id}`, {
                headers: {
                    'accept': 'application/json',
                    'x-cg-demo-api-key': COINGECKO_API_KEY!
                }
            });

            if (!response.ok) {
                console.warn(`Failed to fetch history for token ${token.id}`);
                console.log(response);
                return 0;
            }

            const data = await response.json();
            return data.market_data?.ath?.usd || 0;
        } catch (error) {
            console.error(`Error fetching ATH price for ${address}:`, error);
            return 0;
        }
    }));

    return res.status(200).json({ marketcaps, allTimeHighPrices });
}
