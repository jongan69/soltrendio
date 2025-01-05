export const fetchBitcoinPrice = async () => {
    try {
        const response = await fetch(`https://api.coindesk.com/v1/bpi/currentprice.json`);
        const data = await response.json();
        const price = data.bpi.USD.rate;
        return price;
    } catch (error) {
        console.error("Error fetching Bitcoin price:", error);
        return null;
    }
}