export default async function getHistoricalHolderCount(contractAddress: string) {
    try {   
        const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats/getHistoricalHolderCount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractAddress }),
        });
        const historicalHolderCount = await data.json();
        return historicalHolderCount;
    } catch (error) {
        console.error("Error fetching historical holder count:", error);
        return [];
    }
}