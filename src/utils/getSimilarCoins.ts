import { getTokenInfo } from "./getTokenInfo";

interface Token {
    symbol: string;
    name?: string;
    description?: string;
    price?: number;
    marketCap?: number;
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
        // First change - initial API calls
        const responses = await Promise.allSettled([
            fetch('https://api.dexscreener.com/token-profiles/latest/v1').then(r => r.json()),
            fetch('https://api.dexscreener.com/token-boosts/latest/v1').then(r => r.json()),
            fetch('https://api.dexscreener.com/token-boosts/top/v1').then(r => r.json())
        ]);

        // Extract values from fulfilled promises, use empty arrays for rejected ones
        const [latestTokenProfiles, latestTokenBoosts, topTokenBoosts] = responses.map(result => 
            result.status === 'fulfilled' ? result.value : []
        );

        // console.log("API Responses:", {
        //     profiles: latestTokenProfiles,
        //     boosts: latestTokenBoosts,
        //     top: topTokenBoosts
        // });

        // Function to extract essential token data and remove duplicates
        const processTokens = async (tokens: any[]): Promise<TokenData[]> => {
            if (!Array.isArray(tokens)) {
                console.warn("Received non-array tokens:", tokens);
                return [];
            }

            const seen = new Set();
            // First get token info for all tokens
            const tokenInfoResults = await Promise.allSettled(
                tokens.map(token => getTokenInfo(token.tokenAddress))
            );
            
            const tokenInfos = tokenInfoResults.map(result => 
                result.status === 'fulfilled' ? result.value : null
            );

            const filteredTokens = tokens.filter((token, index) => {
                if (!token || typeof token !== 'object') return false;
                const symbol = tokenInfos[index]?.symbol;
                if (!symbol || seen.has(symbol.toUpperCase())) return false;
                seen.add(symbol.toUpperCase());
                return true;
            });

            // Wait for all token processing to complete
            return Promise.all(filteredTokens.map(async (token, index) => {
                const tokenInfo = tokenInfos[index];
                const tokenName = tokenInfo?.name;
                // Handle both array and object formats for links
                let website = '';
                let docsLink = '';
                let dexscreenerLink = '';
                let twitterLink = '';
                let telegramLink = '';
                let discordLink = '';
                let githubLink = '';

                if (Array.isArray(token.links)) {
                    // Handle array format
                    website = token.links.find(
                        (link: any) => link.label === 'Website' || link.type === 'website'
                    )?.url || tokenInfo?.website;
                    dexscreenerLink = token.url || '';
                    docsLink = token.links.find(
                        (link: any) => link.type === 'docs' || link.type === 'documentation' || link.type === 'whitepaper' || link.type === 'Docs'
                    )?.url || '';
                    twitterLink = token.links.find(
                        (link: any) => link.type === 'twitter' || link.type === 'Twitter'
                    )?.url || '';
                    telegramLink = token.links.find(
                        (link: any) => link.type === 'telegram' || link.type === 'Telegram'
                    )?.url || '';
                    discordLink = token.links.find(
                        (link: any) => link.type === 'discord' || link.type === 'Discord'
                    )?.url || '';
                    githubLink = token.links.find(
                        (link: any) => link.type === 'github' || link.type === 'Github'
                    )?.url || '';
                } else if (token.links && typeof token.links === 'object') {
                    // Handle object format (existing code)
                    website = token.links.website || '';
                    dexscreenerLink = token.links.dexscreener || '';
                    twitterLink = token.links.twitter || '';
                    telegramLink = token.links.telegram || '';
                    discordLink = token.links.discord || '';
                    githubLink = token.links.github || '';
                }
              
                return {
                    symbol: tokenInfo?.symbol,
                    name: tokenName || token.description?.split('\n')[0] || token.symbol || '',
                    description: token.description || '',
                    marketCap: tokenInfo?.marketCap,
                    price: tokenInfo?.price,
                    chainId: token.chainId,
                    address: token.tokenAddress,
                    website,
                    link: dexscreenerLink,
                    docs: docsLink,
                    twitter: twitterLink,
                    telegram: telegramLink,
                    discord: discordLink,
                    github: githubLink
                };
            }));
        };

        // For the final combination of tokens
        const combinedTokensResults = await Promise.allSettled([
            processTokens(latestTokenProfiles || []),
            processTokens(latestTokenBoosts || []),
            processTokens(topTokenBoosts || [])
        ]);

        const combinedTokens = combinedTokensResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<TokenData[]>).value)
            .flat()
            .slice(0, 20);

        // console.log("Combined tokens count:", combinedTokens.length);
        // console.log("First few combined tokens:", combinedTokens.slice(0, 3));

        if (combinedTokens.length === 0) {
            console.error("No tokens found in any of the API responses");
            return [];
        }

        // Prepare a more concise prompt
        const prompt = `
            Analyze and compare these user tokens: ${JSON.stringify(userTokens.map(t => ({ symbol: t.symbol, name: t.name, price: t.price, marketCap: t.marketCap })))}
            with these new tokens: ${JSON.stringify(combinedTokens)}
            
            Find the 5 most similar tokens based on use case, market focus, token utility, and price.
            
            Respond with this JSON format using the token data provided:
            {
                "similarCoins": [
                    {
                        "newCoin": {"symbol": "TOKEN", "name": "Token Name"},
                        "similarityScore": 0.95,
                        "reason": "Brief explanation of similarity",
                        "description": "Brief token description",
                        "marketCap": 10M,
                        "price": $0.01,
                        "link": "https://dexscreener.com/solana/TOKEN",
                        "docs": "https://docs.example.com",
                        "website": "https://www.example.com",
                        "twitter": "https://twitter.com/TOKEN",
                        "telegram": "https://t.me/TOKEN",
                        "discord": "https://discord.gg/TOKEN",
                        "github": "https://github.com/TOKEN"
                    }
                ]
            }`;

        // console.log("Sending prompt to AI");

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
        // console.log("AI Response:", similarTokens);

        const result = Array.isArray(similarTokens) ? similarTokens : similarTokens.similarCoins || [];
        // console.log("Final result:", result);

        return result;
    } catch (error) {
        console.error('Error in getSimilarCoins:', error);
        return [];
    }
};
