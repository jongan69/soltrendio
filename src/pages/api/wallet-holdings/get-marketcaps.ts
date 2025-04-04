import { NextApiRequest, NextApiResponse } from 'next';
// import tokensData from '../../../utils/tokens.json';

interface TokenData {
    id: string;
    platforms: {
        solana: string;
        [key: string]: string;
    };
}


const DEXSCREENER_TOKEN_API_URL = 'https://api.dexscreener.com/latest/dex/tokens';
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

const tokensData = await fetch('https://api.coingecko.com/api/v3/coins/list?include_platform=true', {
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

    // Implement all time high marketcap fetching with proper error handling
    const allTimeHighPrices = await Promise.all(contractAddresses.map(async (address: string) => {
        try {
            // Find token id in tokens.json using contract address
            const token = (tokensData as TokenData[]).find(token => token.platforms.solana === address);
            if (!token) {
                console.warn(`No token found in token data for address ${address}`);
                return 0;
            }

            const response = await fetch(`https://api.coingecko.com/api/v3/coins/${token.id}`, {
                headers: {
                    'accept': 'application/json',
                    'x-cg-demo-api-key': COINGECKO_API_KEY!
                }
            });

            if (!response.ok) {
                console.warn(`Failed to fetch history for token ${token.id}`);
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
