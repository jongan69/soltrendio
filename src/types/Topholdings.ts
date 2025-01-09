export interface TopHolding {
    symbol: string;
    contractAddress: string;
    balance: number;
    usdValue: number;
    isNft: boolean;
    price?: number;
    marketCap?: number;
  }