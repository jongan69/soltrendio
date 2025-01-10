export const getLargeHolders = async (tokenAddress: string) => {
    let page = 1;
    let filteredOwners: any[] = [];

    while (true) {
        const response = await fetch(process.env.NEXT_PUBLIC_HELIUS_RPC_ENDPOINT!, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "getTokenAccounts",
                id: "helius-test",
                params: {
                    page: page,
                    limit: 1000,
                    displayOptions: {},
                    mint: tokenAddress, // Replace with your token mint address
                },
            }),
        });

        const data = await response.json();

        if (!data.result || data.result.token_accounts.length === 0) {
            break;
        }
        data.result.token_accounts.forEach((account: any) => {
            const balanceInTokens = parseFloat(account.amount) / 1_000_000; // Convert from lamports to tokens (6 decimals)
            if (balanceInTokens > 1_000_000) { // Check for balances > 1M tokens
                filteredOwners.push({
                    owner: account.owner,
                    balance: balanceInTokens,
                });
            }
        });

        page++;
    }
    return filteredOwners.length;
}