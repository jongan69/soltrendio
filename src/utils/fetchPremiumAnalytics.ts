export const fetchPremiumAnalytics = async (address: string, tokens: any[]) => {
    try {
        const response = await fetch(`/api/premium/analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, tokens })
        });
        return response.json();
    } catch (error) {
        console.error('Error fetching premium analytics:', error);
        return null;
    }
}