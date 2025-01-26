import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatNumber } from '../../utils/formatNumber'; // We'll create this utility

type StatsData = {
  trendPrice: string;
  bitcoinPrice: string;
  solanaPrice: string;
  ethereumPrice: string;
  totalUniqueWallets: number;
  portfolioMetrics: {
    averagePortfolioValue: number;
    totalPortfolioValue: number;
    activeWallets: number;
  };
  topDomainsByValue: Array<{
    name: string;
    totalValue: number;
    addresses: string[];
  }>;
  topTokensByValue: Array<{
    tokenSymbol: string;
    totalUsdValue: number;
  }>;
  mostTweetedTicker: Array<{
    ticker: string;
    // Add other properties if they exist
  }>;
  whaleActivity: {
    bullish: Array<{
      symbol: string;
      bullishScore: number;
    }>;
  };
};

export const StatsTicker: React.FC = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats/getTrends');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stats) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % 5);
      }, 5000); // Rotate stats every 5 seconds
      return () => clearInterval(interval);
    }
  }, [stats]);

  if (!stats) return null;

  const statsItems = [
    {
      icon: "💎",
      label: "TREND Price",
      value: `$${stats.trendPrice}`,
    },
    {
      icon: "🔥",
      label: "SOL Price",
      value: `$${Number(stats.solanaPrice).toFixed(2)}`,
    },
    {
      icon: "😹",
      label: "ETH Price",
      value: `$${Number(stats.ethereumPrice).toFixed(2)}`,
    },
    {
      icon: "₿",
      label: "Bitcoin",
      value: `$${stats.bitcoinPrice}`,
    },
    {
      icon: "👥",
      label: "Total Wallets",
      value: `${stats.totalUniqueWallets} wallets`,
    },
    {
      icon: "💰",
      label: "Total Value",
      value: `$${formatNumber(stats?.portfolioMetrics?.totalPortfolioValue || 0)}`,
    },
    {
      icon: "🐋",
      label: "Whale Alert",
      value: stats.whaleActivity?.bullish[0]?.symbol || "N/A",
      subtext: stats.whaleActivity?.bullish[0] ? 
        `Score: ${stats.whaleActivity.bullish[0].bullishScore}` : "",
    },
    {
      icon: "🕊️",
      label: "Most Tweeted Ticker",
      value: Array.isArray(stats.mostTweetedTicker) && stats.mostTweetedTicker[0]?.ticker || "$TREND",
    },
  ];

  return (
    <div className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-1 rounded-lg shadow-lg">
      <div className="bg-base-100 rounded-md p-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center space-x-3"
          >
            <span className="text-2xl">{statsItems[currentIndex].icon}</span>
            <div className="text-center">
              <div className="text-sm opacity-70">{statsItems[currentIndex].label}</div>
              <div className="font-bold">{statsItems[currentIndex].value}</div>
              {statsItems[currentIndex].subtext && (
                <div className="text-xs opacity-70">{statsItems[currentIndex].subtext}</div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}; 