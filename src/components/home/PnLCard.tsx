import { useEffect, useState } from 'react';
import { Circles } from 'react-loader-spinner';
import { toast } from 'react-hot-toast';

interface PnLCardProps {
  walletAddress: string;
}

interface Trade {
  tokenIn: {
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
  };
  tokenOut: {
    mint: string;
    symbol: string;
    amount: number;
    decimals: number;
  };
  timestamp: number;
}

interface ProcessedTrade {
  timestamp: number;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  amountIn: number;
  amountOut: number;
  priceAtTime: number;
  pnl: number;
}

interface PnLData {
  totalPnL: number;
  trades: ProcessedTrade[];
}

function formatNumber(n: number | null | undefined): string {
  // Return '0.000000' for null, undefined, or NaN values
  if (n === null || n === undefined || isNaN(n)) {
    return '0.000000';
  }

  // Convert to number if it's not already
  const num = Number(n);
  
  if (!isFinite(num)) {
    return '0.000000';
  }

  if (Math.abs(num) < 0.000001) {
    return num.toFixed(12);
  }
  return num.toFixed(6);
}

export function PnLCard({ walletAddress }: PnLCardProps) {
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculatePnL = async (trade: any) => {
    try {
      // Convert amounts using full decimal precision
      const amountIn = trade.tokenIn.amount / Math.pow(10, trade.tokenIn.decimals);
      const amountOut = trade.tokenOut.amount / Math.pow(10, trade.tokenOut.decimals);
      
      // Skip trades with zero amounts
      if (amountIn === 0 || amountOut === 0) {
        // console.log(`Skipping trade with zero amount: ${trade.tokenIn.symbol}/${trade.tokenOut.symbol}`);
        return null;
      }

      // Get historical price data
      const historicalResponse = await fetch(
        `/api/historical/getPriceData?address=${walletAddress}&tokenA=${trade.tokenIn.mint}&tokenB=${trade.tokenOut.mint}&timestamp=${trade.timestamp}`
      );

      if (!historicalResponse.ok) {
        throw new Error('Failed to fetch historical price data');
      }

      const { historicalPriceData } = await historicalResponse.json();
      
      // Calculate price at trade time from historical data if available
      const priceAtTrade = historicalPriceData?.length ? 
        historicalPriceData[0].price : 
        amountOut / amountIn;

      // Skip if we can't determine a valid price
      if (!isFinite(priceAtTrade) || isNaN(priceAtTrade)) {
        // console.log(`Skipping trade with invalid price: ${trade.tokenIn.symbol}/${trade.tokenOut.symbol}`);
        return null;
      }

      // Get current prices in SOL (use full precision)
      const inPriceInSol = trade.tokenIn.priceNative || 0;
      const outPriceInSol = trade.tokenOut.priceNative || 0;

      // Calculate values in SOL
      const valueInSolAtTrade = amountIn * inPriceInSol;
      const valueInSolNow = amountOut * outPriceInSol;
      
      // Skip if we can't determine valid SOL values
      if (!isFinite(valueInSolAtTrade) || !isFinite(valueInSolNow)) {
        // console.log(`Skipping trade with invalid SOL values: ${trade.tokenIn.symbol}/${trade.tokenOut.symbol}`);
        return null;
      }

      const tradePnL = valueInSolNow - valueInSolAtTrade;
      
      // console.log('PnL Calculation:', {
      //   pair: `${trade.tokenIn.symbol}/${trade.tokenOut.symbol}`,
      //   amountIn: formatNumber(amountIn),
      //   amountOut: formatNumber(amountOut),
      //   inPriceInSol: formatNumber(inPriceInSol),
      //   outPriceInSol: formatNumber(outPriceInSol),
      //   valueInSolAtTrade: formatNumber(valueInSolAtTrade),
      //   valueInSolNow: formatNumber(valueInSolNow),
      //   tradePnL: formatNumber(tradePnL)
      // });
      
      // console.log('Token prices:', {
      //   tokenIn: {
      //     symbol: trade.tokenIn.symbol,
      //     priceNative: trade.tokenIn.priceNative,
      //     rawPrice: trade.tokenIn.price
      //   },
      //   tokenOut: {
      //     symbol: trade.tokenOut.symbol,
      //     priceNative: trade.tokenOut.priceNative,
      //     rawPrice: trade.tokenOut.price
      //   }
      // });

      return {
        amountIn,
        amountOut,
        priceAtTrade,
        valueInSolAtTrade,
        valueInSolNow,
        tradePnL
      };
    } catch (error) {
      console.error('Error in PnL calculation:', error);
      return null;
    }
  };

  useEffect(() => {
    // console.log('PnLCard mounted/updated with wallet:', walletAddress);
    let mounted = true;

    const fetchData = async () => {
      if (!mounted) return;
      
      try {
        const tradeResponse = await fetch(
          `/api/historical/getTradeData`,
          {
            headers: { 'Cache-Control': 'no-cache' },
            method: 'POST',
            body: JSON.stringify({
              address: walletAddress,
              limit: 100,
              beforeTimestamp: Date.now()
            })
          }
        );

        if (!tradeResponse.ok) {
          throw new Error('Failed to fetch trade history');
        }

        const { tradeHistory } = await tradeResponse.json();
        console.log('Trade history loaded:', tradeHistory.length, 'trades');

        const BATCH_SIZE = 3;
        const processedTrades: ProcessedTrade[] = [];
        let totalPnL = 0;

        for (let i = 0; i < tradeHistory.length; i += BATCH_SIZE) {
          const batch = tradeHistory.slice(i, i + BATCH_SIZE);
          
          for (const trade of batch) {
            const pnlCalc = await calculatePnL(trade);
            
            if (pnlCalc) { // Only process valid trades
              totalPnL += pnlCalc.tradePnL;
              processedTrades.push({
                timestamp: trade.timestamp,
                tokenInSymbol: trade.tokenIn.symbol,
                tokenOutSymbol: trade.tokenOut.symbol,
                amountIn: pnlCalc.amountIn,
                amountOut: pnlCalc.amountOut,
                priceAtTime: pnlCalc.priceAtTrade,
                pnl: pnlCalc.tradePnL,
              });
            }
          }
          
          // Update loading progress
          const progress = Math.min(((i + BATCH_SIZE) / tradeHistory.length) * 100, 100);
          setLoadingProgress(Math.round(progress));
          
          if (i + BATCH_SIZE < tradeHistory.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }

        setPnlData({ totalPnL, trades: processedTrades });

      } catch (err) {
        console.error('Error in data fetch process:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        toast.error('Failed to fetch data');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-2">
        <Circles color="#00BFFF" height={40} width={40} />
        <p className="text-sm text-gray-600">Loading trades... {loadingProgress}%</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error/10 p-4 rounded-lg">
        <p className="text-error">{error}</p>
      </div>
    );
  }

  if (!pnlData || pnlData.trades.length === 0) {
    return (
      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50">
        <p className="text-gray-600">No trade history available</p>
      </div>
    );
  }

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-xl border border-purple-200/50">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Performance</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total PnL (SOL):</span>
          <span className={`font-bold ${pnlData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatNumber(pnlData.totalPnL)} SOL
          </span>
        </div>
        <div className="space-y-2">
          {pnlData.trades.map((trade, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <span>{trade.tokenInSymbol} → {trade.tokenOutSymbol}</span>
              <span className={trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                {formatNumber(trade.pnl)} SOL
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
