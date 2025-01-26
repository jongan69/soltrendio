import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const { contractAddress } = req.body;
    if (!contractAddress) {
        return res.status(400).json({ error: 'Contract address is required' });
    }
    try {
        // console.log("Contract address in get-best-pools:", contractAddress);
        // const requestBody = JSON.stringify({ contractAddress });
        // console.log("Request body being sent:", requestBody);
        
        const [dlmmData, orcaData, radiumData, m3Data] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes/get-dlmm-pools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contractAddress })
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes/get-orca-pools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contractAddress })
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes/get-raydium-pools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contractAddress })
            }).then(res => res.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/routes/get-m3-vault`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ contractAddress })
            }).then(res => res.json())
        ]);

        // console.log(dlmmData, orcaData, radiumData, m3Data);

        // Transform and combine all pool data
        const allPools = [
            // DLMM pools
            ...(dlmmData.pairs || []).map((pool: { name: any; address: any; apr: any; apy: any; liquidity: string; trade_volume_24h: any; fees_24h: any; }) => ({
                source: `DLMM`,
                name: pool.name,
                address: pool.address,
                apr: Number(pool.apr) || 0,
                apy: Number(pool.apy) || 0,
                tvl: parseFloat(pool.liquidity) || 0,
                volume24h: Number(pool.trade_volume_24h) || 0,
                fees24h: Number(pool.fees_24h) || 0
            })),
            // Raydium pools
            ...(radiumData.pools || []).map((pool: { type: any; mintA: { symbol: any; }; mintB: { symbol: any; }; id: any; day: { apr: any; feeApr: any; volume: any; volumeFee: any; }; tvl: any; }) => ({
                source: `Raydium`,
                type: pool.type,
                name: `${pool.mintA.symbol}-${pool.mintB.symbol}`,
                address: pool.id,
                apr: Number(pool.day?.apr || 0) + Number(pool.day?.feeApr || 0),
                apy: 0,
                tvl: Number(pool.tvl) || 0,
                volume24h: Number(pool.day?.volume) || 0,
                fees24h: Number(pool.day?.volumeFee) || 0
            })),
            // Orca pools
            ...(orcaData.pools || []).map((pool: {
                tokenB: any;
                tokenA: any; name: any; address: any; apr: any; apy: any; tvl: any; volume24h: any; fees24h: any; }) => ({
                source: `Orca`,
                name: pool.name || `${pool.tokenA.symbol}-${pool.tokenB.symbol}`,
                address: pool.address || '',
                tokenAMint: pool.tokenA.mint,
                tokenBMint: pool.tokenB.mint,
                apr: Number(pool.apr) || 0,
                apy: Number(pool.apy) || 0,
                tvl: Number(pool.tvl) || 0,
                volume24h: Number(pool.volume24h) || 0,
                fees24h: Number(pool.fees24h) || 0
            })),
            // M3 vaults
            ...(m3Data.vaults || []).map((vault: { token_a_symbol: any; token_b_symbol: any; vault_address: any; daily_reward_usd: number; total_staked_amount_usd: number; }) => {
                // Calculate APR: (Daily reward * 365 days * 100 for percentage)
                const dailyRewardUsd = Number(vault.daily_reward_usd) || 0;
                const annualRewardUsd = dailyRewardUsd * 365;
                const stakedAmountUsd = Number(vault.total_staked_amount_usd) || 1; // Prevent division by zero
                const calculatedApr = (annualRewardUsd / stakedAmountUsd) * 100;

                return {
                    source: 'M3',
                    name: `${vault.token_a_symbol}-${vault.token_b_symbol}`,
                    address: vault.vault_address,
                    apr: calculatedApr,
                    apy: 0,
                    tvl: Number(vault.total_staked_amount_usd) || 0,
                    // For M3, we'll use the annualized volume based on daily rewards
                    volume24h: dailyRewardUsd * 365,
                    fees24h: Number(vault.daily_reward_usd) || 0
                };
            })
        ];

        // Filter out pools with zero TVL and calculate scores
        const poolsWithScore = allPools
            .filter(pool => pool.tvl > 0)
            .map(pool => {
                const volumeScore = Math.log10(Math.max(pool.volume24h, 1));
                const aprScore = Number(pool.apr) || 0;
                
                // Adjust scoring to give more weight to APR
                return {
                    ...pool,
                    score: (0.8 * aprScore) + (0.2 * volumeScore * 100)  // Increased APR weight to 80%
                };
            });

        // Sort pools by combined score in descending order
        const sortedPools = poolsWithScore.sort((a, b) => b.score - a.score);

        return res.status(200).json({
            pools: sortedPools.map(pool => ({
                ...pool,
                apr: Number(pool.apr).toFixed(2),
                volume24h: Number(pool.volume24h).toFixed(2),
                tvl: Number(pool.tvl).toFixed(2),
                fees24h: Number(pool.fees24h).toFixed(4),
                score: Number(pool.score).toFixed(2)
            })),
            totalCount: sortedPools.length
        });

    } catch (error) {
        console.error('Error fetching Best Pools:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching Best Pools',
            errorMessage: error
        });
    }
}