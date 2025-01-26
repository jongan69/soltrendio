import React from 'react';
import { useState } from 'react';

interface Pool {
    source: string;
    name: string;
    address: string;
    apr: string;
    apy: number;
    tvl: string;
    volume24h: string;
    fees24h: string;
    score: string;
    type?: string;
    tokenAMint?: string;
    tokenBMint?: string;
}

// Add new type for sort fields
type SortField = 'source' | 'name' | 'apr' | 'tvl' | 'volume24h' | 'fees24h';

interface BestPoolsDisplayProps {
    tokens: any[];
}

export const BestPoolsDisplay: React.FC<BestPoolsDisplayProps> = ({ tokens }) => {
    const [selectedToken, setSelectedToken] = useState<string>('');
    const [pools, setPools] = useState<Pool[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const fetchBestPools = async (contractAddress: string) => {
        setLoading(true);
        try {
            const response = await fetch('/api/routes/get-best-pools', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contractAddress }),
            });
            const data = await response.json();
            setPools(data.pools || []);
        } catch (error) {
            console.error('Error fetching best pools:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTokenSelect = (tokenAddress: string) => {
        setSelectedToken(tokenAddress);
        fetchBestPools(tokenAddress);
    };

    const handlePoolClick = (pool: Pool) => {
        // Open pool in new tab based on source
        let url = '';
        switch (pool.source.toLowerCase()) {
            case 'orca':
                url = `https://www.orca.so/pools?tokens=${pool.tokenAMint}&tokens=${pool.tokenBMint}`;
                break;
            case 'raydium':
                if (pool?.type === 'Standard') {
                    url = `https://raydium.io/liquidity/increase/?mode=add&pool_id=${pool.address}`;
                } else {
                    url = `https://raydium.io/clmm/create-position/?pool_id=${pool.address}`;
                }
                break;
            case 'dlmm':
                url = `https://app.meteora.ag/dlmm/${pool.address}`;
                break;
            case 'm3':
                url = `https://m3m3.meteora.ag/farms/${pool.address}`;
                break;  
            default:
                console.log('Unknown pool source');
                return;
        }
        window.open(url, '_blank');
    };

    // Add sort function
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // If clicking the same field, toggle direction
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // If clicking a new field, set it with ascending direction
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Add function to get sorted pools
    const getSortedPools = () => {
        if (!sortField) return pools;

        return [...pools].sort((a, b) => {
            let aValue: string | number = a[sortField];
            let bValue: string | number = b[sortField];

            // Remove special characters and convert to number for numeric fields
            if (['apr', 'tvl', 'volume24h', 'fees24h'].includes(sortField)) {
                aValue = parseFloat(String(aValue).replace(/[$,%]/g, ''));
                bValue = parseFloat(String(bValue).replace(/[$,%]/g, ''));
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    return (
        <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Best Liquidity Pools</h2>
            
            {/* Token Selection Dropdown */}
            <div className="mb-6">
                <select 
                    className="select select-bordered w-full"
                    value={selectedToken}
                    onChange={(e) => handleTokenSelect(e.target.value)}
                >
                    <option value="">Select a token</option>
                    {tokens.map((token, index) => (
                        <option key={index} value={token.mintAddress}>
                            {token.symbol || token.name || token.mintAddress}
                        </option>
                    ))}
                </select>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex justify-center items-center py-8">
                    <div className="loading loading-spinner loading-lg"></div>
                </div>
            )}

            {/* Pools Display */}
            {!loading && pools.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead>
                            <tr>
                                {[
                                    { field: 'source' as SortField, label: 'Source' },
                                    { field: 'name' as SortField, label: 'Pool' },
                                    { field: 'apr' as SortField, label: 'APR' },
                                    { field: 'tvl' as SortField, label: 'TVL' },
                                    { field: 'volume24h' as SortField, label: '24h Volume' },
                                    { field: 'fees24h' as SortField, label: '24h Fees' }
                                ].map(({ field, label }) => (
                                    <th 
                                        key={field}
                                        onClick={() => handleSort(field)}
                                        className="cursor-pointer hover:bg-gray-100"
                                    >
                                        <div className="flex items-center gap-1">
                                            {label}
                                            {sortField === field && (
                                                <span className="text-xs">
                                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {getSortedPools().map((pool, index) => (
                                <tr 
                                    key={index} 
                                    className="hover cursor-pointer transition-colors duration-200"
                                    onClick={() => handlePoolClick(pool)}
                                >
                                    <td>
                                        <span className="badge badge-ghost">{pool.source}</span>
                                    </td>
                                    <td>{pool.name}</td>
                                    <td>{pool.apr}%</td>
                                    <td>${pool.tvl}</td>
                                    <td>${pool.volume24h}</td>
                                    <td>${pool.fees24h}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* No Pools State */}
            {!loading && selectedToken && pools.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    No liquidity pools found for this token
                </div>
            )}
        </div>
    );
}; 