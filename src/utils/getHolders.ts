export default async function getHistoricalHolderCount(contractAddress: string) {
    try {
        // Create an AbortController instance
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

        const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats/getHistoricalHolderCount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contractAddress }),
            signal: controller.signal, // Add the abort signal to the fetch request
        });

        clearTimeout(timeoutId); // Clear the timeout if the request completes successfully
        const historicalHolderCount = await data.json();
        return historicalHolderCount;
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            console.error("Request timed out after 30 seconds");
        } else {
            console.error("Error fetching historical holder count:", error);
        }
        return [];
    }
}