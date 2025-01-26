const MAX_TOKEN_FETCH_RETRIES = 3;
const TOKEN_FETCH_RETRY_DELAY = 1000;

// Add a retry wrapper function
export const withTokenRetry = async <T>(
    operation: () => Promise<T>,
    tokenIdentifier: string
  ): Promise<T | null> => {
    let attempts = 0;
    while (attempts < MAX_TOKEN_FETCH_RETRIES) {
      try {
        return await operation();
      } catch (error) {
        attempts++;
        console.error(`Attempt ${attempts} failed for token ${tokenIdentifier}:`, error);
        if (attempts < MAX_TOKEN_FETCH_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, TOKEN_FETCH_RETRY_DELAY));
          continue;
        }
        // console.log(`Skipping token ${tokenIdentifier} after ${attempts} failed attempts`);
        return null;
      }
    }
    return null;
  };


// Add retry wrapper function
export const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        if (error.toString().includes('rate limit') || error.toString().includes('429')) {
          // console.log(`Rate limit hit, attempt ${i + 1}/${maxRetries}, waiting ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1))); // Exponential backoff
          continue;
        }
        throw error; // Throw non-rate-limit errors immediately
      }
    }
    throw lastError;
  };