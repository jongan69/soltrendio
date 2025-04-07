import axios from "axios";

// Define the NFT interface based on the API response
export interface NFT {
    interface: string;
    id: string;
    content: {
        metadata: {
            name: string;
            symbol: string;
            description: string;
            attributes: Array<{
                trait_type: string;
                value: string;
            }>;
        };
        links: {
            image: string;
            external_url: string;
        };
    };
    grouping: Array<{
        group_key: string;
        group_value: string;
        collection_metadata: {
            name: string;
            symbol: string;
            image: string;
            description: string;
        };
    }>;
}

export const getNFTs = async (walletAddress: string): Promise<NFT[]> => {
    try {
        console.log("Fetching NFTs for address:", walletAddress);
        const url = `/api/nfts/proxy?address=${walletAddress}`;
        console.log("API URL:", url);

        // Use fetch with proper error handling and CORS headers
        const response = await axios.get(url);

        console.log("Response status:", response.status);

        if (response.status !== 200) {
            console.error(`API Error: Status ${response.status}`, response.data);
            throw new Error(`API responded with status: ${response.status}. ${response.data}`);
        }

        const data = response.data;
        console.log("API response data:", data);

        if (!Array.isArray(data)) {
            console.warn("API response is not an array:", data);
            return [];
        }

        return data;
    } catch (error) {
        console.error("Error in getNFTs:", error);
        // Log more details about the error
        if (error instanceof Error) {
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);
        }
        throw error; // Re-throw the error to be handled by the caller
    }
};