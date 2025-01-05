interface Token {
    symbol: string;
    name?: string;
    description?: string;
}

interface TokenComparison {
    newCoin: Token;
    similarityScore: number;
    reason: string;
}

interface TokenData {
    symbol: string;
    name: string;
    description?: string;
    chainId?: string;
    address?: string;
}

export const getSimilarCoins = async (userTokens: Token[]): Promise<TokenComparison[]> => {
    try {
        // Fetch data from all three endpoints
        const [latestTokenProfiles, latestTokenBoosts, topTokenBoosts] = await Promise.all([
            fetch('https://api.dexscreener.com/token-profiles/latest/v1').then(r => r.json()),
            fetch('https://api.dexscreener.com/token-boosts/latest/v1').then(r => r.json()),
            fetch('https://api.dexscreener.com/token-boosts/top/v1').then(r => r.json())
        ]);

        console.log("API Responses:", {
            profiles: latestTokenProfiles?.tokens?.length,
            boosts: latestTokenBoosts?.tokens?.length,
            top: topTokenBoosts?.tokens?.length
        });

        // Function to extract essential token data and remove duplicates
        const processTokens = (tokens: any[]): TokenData[] => {
            if (!Array.isArray(tokens)) {
                console.warn("Received non-array tokens:", tokens);
                return [];
            }
            const seen = new Set();
            return tokens
                .filter(token => {
                    if (!token?.symbol || seen.has(token.symbol)) return false;
                    seen.add(token.symbol);
                    return true;
                })
                .map(token => ({
                    symbol: token.symbol,
                    name: token.name || token.symbol,
                    description: token.description || `A token on ${token.chainId || 'blockchain'}`,
                    chainId: token.chainId,
                    address: token.address
                }));
        };

        // Process and combine tokens from all sources
        const combinedTokens = [
            ...processTokens(latestTokenProfiles?.tokens || []),
            ...processTokens(latestTokenBoosts?.tokens || []),
            ...processTokens(topTokenBoosts?.tokens || [])
        ].slice(0, 20);

        console.log("Combined tokens count:", combinedTokens.length);
        console.log("First few combined tokens:", combinedTokens.slice(0, 3));

        if (combinedTokens.length === 0) {
            console.error("No tokens found in any of the API responses");
            return [];
        }

        // Prepare a more concise prompt
        const prompt = `
            Analyze and compare these user tokens: ${JSON.stringify(userTokens.map(t => ({ symbol: t.symbol, name: t.name })))}
            with these new tokens: ${JSON.stringify(combinedTokens)}
            
            Find the 5 most similar tokens based on use case, market focus, and token utility.
            
            Respond with ONLY this JSON format:
            {
                "similarCoins": [
                    {
                        "newCoin": {"symbol": "TOKEN", "name": "Token Name"},
                        "similarityScore": 0.95,
                        "reason": "Brief explanation of similarity",
                        "link": "https://dexscreener.com/solana/TOKEN",
                        "website": "https://www.example.com",
                        "description": "Brief token description"
                    }
                ]
            }`;

        console.log("Sending prompt to AI");

        const aiResponse = await fetch('/api/analyze/compare-tokens', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text();
            console.error("AI API error:", errorText);
            throw new Error(`AI API returned ${aiResponse.status}: ${errorText}`);
        }

        const similarTokens = await aiResponse.json();
        console.log("AI Response:", similarTokens);
        
        const result = Array.isArray(similarTokens) ? similarTokens : similarTokens.similarCoins || [];
        console.log("Final result:", result);
        
        return result;
    } catch (error) {
        console.error('Error in getSimilarCoins:', error);
        return [];
    }
};
