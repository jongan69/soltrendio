export const fetchEthereumPrice = async () => {
    try {   
        const response = await fetch(`https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`);
        const data = await response.json();
        const price = data.result.ethusd;
        return price;
    } catch (error) {
        console.error("Error fetching Ethereum price:", error);
        return null;
    }
}