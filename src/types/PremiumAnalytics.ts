export interface PremiumAnalytics {
    volatilityScore: number;
    riskRating: string;
    priceCorrelations: Array<{token: string, correlation: number}>;
    performanceMetrics: {
      sharpeRatio: number;
      maxDrawdown: number;
      dailyReturns: number[];
    };
  }