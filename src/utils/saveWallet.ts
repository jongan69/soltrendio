export const saveWalletToDb = async (address: string, domain?: string) => {
  // console.log('Saving wallet to database:', address, domain);
  try {
    const response = await fetch('/api/db/save-wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        address,
        domain: domain || null
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save wallet');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving wallet:', error);
    throw error;
  }
};