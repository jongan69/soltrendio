export const updateWalletToDb = async (
  address: string, 
  totalValue: number,
  topHoldings: Array<{
    symbol: string,
    balance: number,
    usdValue: number
  }>,
  domain: string | null
) => {
  // console.log('Updating wallet in database:', address, totalValue, topHoldings, domain);
  try {
    const response = await fetch('/api/db/update-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        address,
        totalValue,
        topHoldings,
        domain,
        timestamp: new Date().toISOString()
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update wallet data');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error updating wallet in database:', error);
    throw error; // Re-throw to handle in the calling code
  }
};