// Cache storage
let cachedUrl: string | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const FALLBACK_API_URL = process.env.FALLBACK_API_URL;
interface HealthCheckResponse {
    status: string;
    timestamp: string;
    uptime: number;
    requestId: string;
}

const validateEndpoint = async (url: string): Promise<boolean> => {
    try {
        const response = await fetch(`${url}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) return false;

        const health: HealthCheckResponse = await response.json();
        return health.status === 'healthy';
    } catch (error) {
        console.warn('Health check failed:', error);
        return false;
    }
};

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
    // Check cache and validate endpoint
    if (cachedUrl && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
        console.log('Validating cached URL...');
        const isValid = await validateEndpoint(cachedUrl);
        if (isValid) {
            console.log('Cached URL is valid');
            return cachedUrl;
        } else {
            console.log('Cached URL is invalid, fetching new endpoint');
            cachedUrl = null;
            cacheTimestamp = null;
        }
    }

    try {
        const data = await fetchWithRetry();
        const url = data.tunnels[0].public_url;
        
        // Validate new endpoint before caching
        const isValid = await validateEndpoint(url);
        if (!isValid) {
            throw new Error('New endpoint failed health check');
        }
        
        // Update cache
        cachedUrl = url;
        cacheTimestamp = Date.now();
        
        return url;
    } catch (error) {
        console.error('Error fetching endpoint:', error);
        
        // Try fallback URL as last resort
        if (FALLBACK_API_URL) {
            console.log('Attempting to use fallback URL...');
            const isValidFallback = await validateEndpoint(FALLBACK_API_URL);
            if (isValidFallback) {
                console.log('Fallback URL is valid');
                return FALLBACK_API_URL;
            }
            console.error('Fallback URL failed health check');
        }
        
        return null;
    }
}