export const checkPremiumStatus = async (publicKey: string) => {
    if (!publicKey) return;
    try {
      const response = await fetch('/api/premium/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: publicKey.toString() })
      });
      const data = await response.json();
      return data.isPremium;
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };