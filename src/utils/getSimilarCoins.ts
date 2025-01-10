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
            profiles: latestTokenProfiles,
            boosts: latestTokenBoosts,
            top: topTokenBoosts
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
                    if (!token || typeof token !== 'object') return false;
                    
                    // Extract symbol from tokenAddress or url
                    const symbol = token.tokenAddress?.split('.').pop() || 
                                 token.url?.split('/').pop() || '';
                    
                    if (!symbol || seen.has(symbol.toUpperCase())) return false;
                    seen.add(symbol.toUpperCase());
                    return true;
                })
                .map(token => {
                    // Handle both array and object formats for links
                    let website = '';
                    let dexscreenerLink = '';
                    let twitterLink = '';
                    let telegramLink = '';
                    let discordLink = '';
                    let githubLink = '';

                    if (Array.isArray(token.links)) {
                        // Handle array format
                        website = token.links.find(
                            (link: any) => link.label === 'Website' || link.type === 'website'
                        )?.url || '';
                        dexscreenerLink = token.links.find(
                            (link: any) => link.type === 'dexscreener'
                        )?.url || '';
                        twitterLink = token.links.find(
                            (link: any) => link.type === 'twitter'
                        )?.url || '';
                        telegramLink = token.links.find(
                            (link: any) => link.type === 'telegram'
                        )?.url || '';
                        discordLink = token.links.find(
                            (link: any) => link.type === 'discord'
                        )?.url || '';
                        githubLink = token.links.find(
                            (link: any) => link.type === 'github'
                        )?.url || '';
                    } else if (token.links && typeof token.links === 'object') {
                        // Handle object format (existing code)
                        website = token.links.website || '';
                        dexscreenerLink = token.links.dexscreener || '';
                        twitterLink = token.links.twitter || '';
                    }

                    return {
                        symbol: (token.tokenAddress?.split('.').pop() || 
                                token.url?.split('/').pop() || '').toUpperCase(),
                        name: token.description?.split('\n')[0] || token.symbol || '',
                        description: token.description || '',
                        chainId: token.chainId,
                        address: token.tokenAddress,
                        website,
                        link: dexscreenerLink || '',
                        twitter: twitterLink || '',
                        telegram: telegramLink || '',
                        discord: discordLink || '',
                        github: githubLink || ''
                    };
                });
        };

        // Process and combine tokens from all sources
        const combinedTokens = [
            ...processTokens(latestTokenProfiles || []),
            ...processTokens(latestTokenBoosts || []),
            ...processTokens(topTokenBoosts || [])
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
            
            Respond with this JSON format using the token data provided:
            {
                "similarCoins": [
                    {
                        "newCoin": {"symbol": "TOKEN", "name": "Token Name"},
                        "similarityScore": 0.95,
                        "reason": "Brief explanation of similarity",
                        "link": "https://dexscreener.com/solana/TOKEN",
                        "website": "https://www.example.com",
                        "description": "Brief token description",
                        "twitter": "https://twitter.com/TOKEN",
                        "telegram": "https://t.me/TOKEN",
                        "discord": "https://discord.gg/TOKEN",
                        "github": "https://github.com/TOKEN"
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
