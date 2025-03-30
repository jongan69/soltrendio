import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';
import { toast } from 'react-hot-toast';
import { saveWalletToDb } from '@utils/saveWallet';
import { getPublicKeyFromSolDomain } from '@utils/getPublicKeyFromDomain';
import { Connection } from '@solana/web3.js';
import { NETWORK } from '@utils/endpoints';
import { isSolanaAddress } from '@utils/isSolanaAddress';

interface TokenPriceInfo {
  price_per_token: number;
  total_price: number;
  currency: string;
  market_cap?: number;
  all_time_high_market_cap?: number;
}

interface TokenInfo {
  balance: number;
  decimals: number;
  symbol?: string;
  supply: number;
  price_info?: TokenPriceInfo;
  token_accounts?: Array<{
    address: string;
    balance: number;
  }>;
  token_program: string;
  associated_token_address: string;
}

interface TokenContent {
  metadata: {
    name: string;
    symbol: string;
    description?: string;
    attributes?: any[];
  };
  links?: {
    image?: string;
  };
  files?: Array<{
    uri: string;
    cdn_uri: string;
    mime: string;
  }>;
}

interface Token {
  id: string;
  interface: string;
  content: TokenContent;
  token_info: TokenInfo;
  ownership: {
    owner: string;
    frozen: boolean;
    delegated: boolean;
    delegate: string | null;
    ownership_model: string;
  };
  authorities: Array<{
    address: string;
    scopes: string[];
  }>;
  burnt: boolean;
  mutable: boolean;
  supply?: number;
}

interface NativeBalance {
  lamports: number;
  price_per_sol: number;
  total_price: number;
}

interface WalletHoldingsTableProps {
  address: string;
}

interface WalletHoldingsResponse {
  jsonrpc: string;
  result: {
    total: number;
    limit: number;
    page: number;
    items: Token[];
    nativeBalance: NativeBalance;
  };
  id: string;
}

interface NativeHolding {
  id: string;
  isNativeSol: true;
  totalValue: number;
  balance: number;
  decimals: number;
  pricePerToken: number;
}

interface TokenHolding {
  id: string;
  isNativeSol: false;
  totalValue: number;
  token: Token;
}

type Holding = NativeHolding | TokenHolding;

interface MarketData {
  [key: string]: {
    marketCap: number;
    allTimeHighPrice: number;
    supply: number;
  };
}

export default function WalletHoldingsTable({ address }: WalletHoldingsTableProps) {
  const connection = new Connection(NETWORK);
  const [holdings, setHoldings] = useState<{
    total: number;
    limit: number;
    page: number;
    items: Token[];
    nativeBalance: NativeBalance;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketData, setMarketData] = useState<MarketData>({});
  const [uploading, setUploading] = useState(false);
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState('');
  const [handleError, setHandleError] = useState('');
  const [resolvedDomain, setResolvedDomain] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('Loading...');
  const tableRef = useRef<HTMLDivElement>(null);

  const validateTwitterHandle = (handle: string): boolean => {
    // Remove @ if present and trim whitespace
    const cleanHandle = handle.trim().replace(/^@/, '');
    
    // Twitter handle rules: 4-15 characters, alphanumeric and underscores only
    const isValid = /^[A-Za-z0-9_]{4,15}$/.test(cleanHandle);
    
    return isValid || cleanHandle === '';
  };

  const handleTwitterHandleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Remove @ if present and trim whitespace
    const cleanHandle = value.trim().replace(/^@/, '');
    setTwitterHandle(cleanHandle);
    
    // Only set error if there's a value and it's invalid
    if (cleanHandle !== '' && !validateTwitterHandle(cleanHandle)) {
      setHandleError('Handle must be 4-15 characters long and can only contain letters, numbers, and underscores');
    } else {
      setHandleError('');
    }
  };

  const handleTwitterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (twitterHandle && !validateTwitterHandle(twitterHandle)) {
      return;
    }
    
    setShowTwitterModal(false);
    
    if (!tableRef.current) return;
    
    try {
      setUploading(true);
      const dataUrl = await toPng(tableRef.current, {
        quality: 1.0,
        backgroundColor: 'white',
      });
      
      const uploadResponse = await fetch('/api/twitter/upload-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: dataUrl })
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { mediaId } = await uploadResponse.json();
      
      const tweetText = twitterHandle 
        ? `BreadSheet created by @${twitterHandle}! 🍞📊`
        : "Latest BreadSheet! 🍞📊";
      
      const tweetResponse = await fetch('/api/twitter/tweet-with-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: tweetText,
          mediaId
        })
      });
      
      if (!tweetResponse.ok) {
        throw new Error('Failed to post tweet');
      }

      toast.success('Successfully shared to Twitter!');
    } catch (err) {
      console.error('Error sharing to Twitter:', err);
      toast.error('Failed to share to Twitter');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async () => {
    if (!tableRef.current) return;
    
    try {
      const dataUrl = await toPng(tableRef.current, {
        quality: 1.0,
        backgroundColor: 'white',
      });
      
      const link = document.createElement('a');
      link.download = 'breadsheet.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating screenshot:', err);
    }
  };

  const handleTweet = () => {
    setShowTwitterModal(true);
  };

  const calculateAthMarketCap = (holding: Holding): number => {
    if (holding.isNativeSol) return 0;
    
    const data = marketData[holding.token.id];
    if (!data?.allTimeHighPrice || !data?.supply) return 0;
    
    // Adjust supply by token decimals
    const adjustedSupply = data.supply / Math.pow(10, holding.token.token_info.decimals);
    return data.allTimeHighPrice * adjustedSupply;
  };

  useEffect(() => {
    const fetchHoldings = async () => {
      // Reset states when address changes
      setError(null);
      setHoldings(null);
      setMarketData({});
      setResolvedDomain(null);
      
      if (!address) {
        setError('Please enter a wallet address or .sol domain');
        return;
      }

      // Check if it's a .sol domain
      let resolvedAddress = address;
      if (address.toLowerCase().endsWith('.sol')) {
        setLoading(true);
        setLoadingMessage('Resolving .sol domain...');
        try {
          resolvedAddress = await getPublicKeyFromSolDomain(address, connection);
          setResolvedDomain(address); // Store original domain
          if (!isSolanaAddress(resolvedAddress)) {
            throw new Error('Domain resolved to an invalid address');
          }
        } catch (error) {
          setError('Could not resolve .sol domain. Please check if the domain exists and try again.');
          setLoading(false);
          return;
        }
      }

      if (!isSolanaAddress(resolvedAddress)) {
        setError('Please enter a valid Solana wallet address or .sol domain');
        return;
      }

      setLoading(true);
      setLoadingMessage('Fetching wallet data...');
      
      try {
        await saveWalletToDb(resolvedAddress, resolvedDomain || undefined);
        const response = await fetch(`/api/wallet-holdings/get-assets?address=${resolvedAddress}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch wallet holdings');
        }

        const data: WalletHoldingsResponse = await response.json();
        
        if (!data.result || !data.result.items) {
          throw new Error('No wallet data found');
        }

        setHoldings(data.result);

        // Get contract addresses for tokens
        const contractAddresses = data.result.items
          .filter(token => token.interface === "FungibleToken")
          .map(token => token.id);

        // Fetch market data for tokens
        if (contractAddresses.length > 0) {
          const marketResponse = await fetch('/api/wallet-holdings/get-marketcaps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractAddresses }),
          });

          if (!marketResponse.ok) {
            throw new Error('Failed to fetch market data');
          }

          const { marketcaps, allTimeHighPrices } = await marketResponse.json();
          const newMarketData: MarketData = {};
          
          contractAddresses.forEach((address, index) => {
            // Get the token from holdings to access supply
            const token = data.result.items.find(t => t.id === address);
            const supply = token?.token_info.supply || 0;
            
            newMarketData[address] = {
              marketCap: marketcaps[index] || 0,
              allTimeHighPrice: allTimeHighPrices[index] || 0,
              supply: supply
            };
          });
          
          setMarketData(newMarketData);
        }
      } catch (err) {
        console.error('Error fetching holdings:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while fetching wallet data');
        setHoldings(null);
        setMarketData({});
      } finally {
        setLoading(false);
      }
    };

    fetchHoldings();
  }, [address]);

  const formatBalance = (balance: number, decimals: number) => {
    return (balance / Math.pow(10, decimals)).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatMarketCap = (value: number): string => {
    if (value === 0) return '-';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const calculateMultiplier = (holding: Holding): { value: string; text: string } | null => {
    if (holding.isNativeSol) return null;
    
    const data = marketData[holding.token.id];
    if (!data?.marketCap || data.marketCap === 0) return null;
    
    const athMarketCap = calculateAthMarketCap(holding);
    if (athMarketCap === 0) return null;
    
    const multiplier = athMarketCap / data.marketCap;
    return {
      value: multiplier.toFixed(1),
      text: 'x from Current Market Cap'
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">{loadingMessage}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-medium text-red-800">Error</h3>
        </div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
        <div className="mt-3 text-sm text-gray-600">
          {error.includes('.sol domain') 
            ? 'Make sure the domain is correctly spelled and exists on the Solana network.'
            : 'Please check the wallet address and try again.'}
        </div>
      </div>
    );
  }

  if (!holdings || !holdings.items) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 my-4">
        <div className="flex items-center">
          <svg className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h3 className="text-sm font-medium text-yellow-800">No Holdings Found</h3>
        </div>
        <div className="mt-2 text-sm text-yellow-700">
          No token holdings were found for this wallet address.
        </div>
      </div>
    );
  }

  // First get all tokens with holdings
  const tokensWithHoldings = [
    // Add SOL as a special entry if it exists and has balance
    ...(holdings.nativeBalance && holdings.nativeBalance.lamports > 0 ? [{
      id: 'sol-native',
      isNativeSol: true as const,
      totalValue: holdings.nativeBalance.total_price,
      balance: holdings.nativeBalance.lamports,
      decimals: 9,
      pricePerToken: holdings.nativeBalance.price_per_sol
    }] : []),
    // Add other tokens with balance
    ...holdings.items
      .filter(token => {
        if (token.interface !== "FungibleToken") return false;
        if (token.token_info.balance <= 0) return false;
        // Only include tokens where we have both market caps
        const data = marketData[token.id];
        return data?.marketCap > 0 && data?.allTimeHighPrice > 0;
      })
      .map(token => ({
        id: token.id,
        isNativeSol: false as const,
        totalValue: token.token_info.price_info?.total_price || 0,
        token
      }))
  ];

  // Take top 10 by holdings value
  const topHoldings = tokensWithHoldings
    .sort((a, b) => (b.totalValue || 0) - (a.totalValue || 0))
    .slice(0, 10);

  // Sort the selected tokens by market cap for display
  const allHoldings: Holding[] = topHoldings.sort((a, b) => {
    const aMarketCap = a.isNativeSol ? a.totalValue : (marketData[a.id]?.marketCap || 0);
    const bMarketCap = b.isNativeSol ? b.totalValue : (marketData[b.id]?.marketCap || 0);
    return bMarketCap - aMarketCap;
  });

  return (
    <div>
      {showTwitterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Share to Twitter</h2>
            <form onSubmit={handleTwitterSubmit}>
              <div className="mb-4">
                <label htmlFor="twitter-handle" className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter Handle (optional)
                </label>
                <input
                  type="text"
                  id="twitter-handle"
                  placeholder="username (without @)"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    handleError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  value={twitterHandle}
                  onChange={handleTwitterHandleChange}
                />
                {handleError && (
                  <p className="mt-1 text-sm text-red-500">{handleError}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTwitterModal(false);
                    setTwitterHandle('');
                    setHandleError('');
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading || (twitterHandle !== '' && !validateTwitterHandle(twitterHandle))}
                >
                  {uploading ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">BreadSheet</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 101.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Download Your BreadSheet
          </button>
          <button
            onClick={handleTweet}
            className="px-4 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
            </svg>
            {uploading ? 'Uploading...' : 'Share Your BreadSheet'}
          </button>
        </div>
      </div>

      {/* Add domain display if resolved */}
      {resolvedDomain && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-purple-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-purple-700">
              Viewing wallet for domain: <span className="font-medium">{resolvedDomain}</span>
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto bg-white p-8 rounded-lg shadow" ref={tableRef}>
        <h1 className="text-3xl font-bold mb-8">BreadSheet</h1>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Token
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Market Cap
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                ATH Market Cap
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allHoldings.map((holding) => (
              <tr key={holding.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {holding.isNativeSol ? (
                      <>
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">SOL</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">Solana</div>
                          <div className="text-sm text-gray-500">Native Token</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-shrink-0 h-10 w-10">
                          {holding.token.content.links?.image ? (
                            <Image
                              src={holding.token.content.links.image}
                              alt={holding.token.content.metadata.name || holding.token.id}
                              width={40}
                              height={40}
                              className="object-cover rounded-lg"
                              unoptimized
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 flex items-center justify-center rounded-lg">
                              <span className="text-gray-500 text-xs">
                                {holding.token.content.metadata.symbol || 'Token'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {holding.token.content.metadata.name || holding.token.id}
                          </div>
                          <div className="text-sm text-gray-500">
                            {holding.token.token_info.symbol || holding.token.content.metadata.symbol}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {holding.isNativeSol ? (
                    formatPrice(holding.pricePerToken * (holding.balance / Math.pow(10, holding.decimals)))
                  ) : (
                    marketData[holding.token.id]?.marketCap ? 
                    formatMarketCap(marketData[holding.token.id].marketCap) : 
                    '-'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                  {holding.isNativeSol ? (
                    '-'
                  ) : (
                    calculateAthMarketCap(holding) > 0 ?
                    `${formatMarketCap(calculateAthMarketCap(holding))}` :
                    '-'
                  )}
                  <br />
                  <span className="text-sm italic text-gray-600">
                    {calculateMultiplier(holding) && (
                      <>
                        (<span className="font-bold">{calculateMultiplier(holding)?.value}</span>
                        {calculateMultiplier(holding)?.text})
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 