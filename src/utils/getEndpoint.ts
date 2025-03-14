// Cache storage
let cachedUrl: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const fetchWithRetry = async (retries = 3, backoff = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch('https://api.ngrok.com/tunnels', {
                headers: {
                    'Authorization': `Bearer ${process.env.NGROK_API_KEY}`,
                    'Ngrok-Version': '2'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            if (i === retries - 1) throw error;
            console.warn(`Attempt ${i + 1} failed, retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            backoff *= 2; // Exponential backoff
        }
    }
};

export const getEndpoint = async () => {
    // console.log(process.env.NGROK_API_KEY);

    // Check cache
    if (cachedUrl && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        console.log('Returning cached URL');
        return cachedUrl;
    }

    try {
        const data = await fetchWithRetry();
        console.log(data);
        const url = data.tunnels[0].public_url;
        
        // Update cache
        cachedUrl = url;
        cacheTimestamp = Date.now();
        
        return url;
    } catch (error) {
        console.error('Error fetching endpoint:', error);
        return null;
    }
}