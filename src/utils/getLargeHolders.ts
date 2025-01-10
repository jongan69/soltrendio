export const getLargeHolders = async (tokenAddress: string): Promise<number> => {
    try {
        const filteredOwners = new Set<string>(); // Use Set to avoid duplicates
        let page = 1;

        while (true) {
            const response = await fetch(process.env.NEXT_PUBLIC_HELIUS_RPC_ENDPOINT!, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "getTokenAccounts",
                    id: "soltrendio.com",
                    params: {
                        page,
                        limit: 1000,
                        displayOptions: {},
                        mint: tokenAddress,
                    },
                }),
            });

            if (!response.ok) {
                console.error(`Failed to fetch page ${page}: ${response.statusText}`);
                break;
            }

            const data = await response.json();

            if (!data.result || data.result.token_accounts.length === 0) {
                break; // Exit if no more results
            }

            for (const account of data.result.token_accounts) {
                const balanceInTokens = parseFloat(account.amount) / 1_000_000; // Handle 6 decimal places
                if (balanceInTokens > 1_000_000) {
                    filteredOwners.add(account.owner); // Add to Set to avoid duplicates
                }
            }

            page++; // Proceed to the next page
        }

        return filteredOwners.size; // Return the number of unique owners with > 1M tokens
    } catch (error) {
        console.error('Error fetching large holders:', error);
        return 0;
    }
};
