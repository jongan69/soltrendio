export const getNftHolders = async (nftCollection: string): Promise<string[]> => {
    try {
        // Validate the API key
        const url = process.env.NEXT_PUBLIC_HELIUS_RPC_ENDPOINT;
        if (!url) {
            throw new Error("Missing API key in environment variables.");
        }

        const assetList: { NFTAddress: string; OwnerAddress: string }[] = [];
        let page = 1;

        while (page) {
            // Fetch data from the API
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    id: "soltrendio.com",
                    method: "getAssetsByGroup",
                    params: {
                        groupKey: "collection",
                        groupValue: nftCollection,
                        page,
                        limit: 1000,
                    },
                }),
            });

            // Check for valid response
            if (!response.ok) {
                throw new Error(`API request failed with status: ${response.status}`);
            }

            const { result } = await response.json();

            if (!result || !result.items) {
                console.warn("Received invalid response format from API:", result);
                break;
            }

            // Process items and add to the asset list
            assetList.push(
                ...result.items.map((item: any) => ({
                    NFTAddress: item.id,
                    OwnerAddress: item.ownership.owner,
                }))
            );

            // Exit loop if less than the maximum page limit is returned
            if (result.items.length < 1000) break;

            page++;
        }

        // Get unique holders by filtering out duplicates
        const uniqueHolders = [...new Set(assetList.map(item => item.OwnerAddress))];
        
        return uniqueHolders;
    } catch (error) {
        console.error("Error fetching NFT holders:", error);
        return [];
    }
};
