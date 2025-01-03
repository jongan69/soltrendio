export const saveWalletToDb = async (
  address: string, 
  totalValue?: number,
  topHoldings?: Array<{
    symbol: string,
    balance: number,
    usdValue: number
  }>
) => {
  try {
    const response = await fetch('/api/db/save-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        address,
        totalValue: totalValue || 0,
        topHoldings: topHoldings || [],
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to save wallet data');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving wallet to database:', error);
  }
};