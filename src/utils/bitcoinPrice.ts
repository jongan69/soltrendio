export const fetchBitcoinPrice = async () => {
    try {
        const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=XBTUSD`);
        const data = await response.json();
        const price = data.result.XXBTZUSD.c[0];
        return price;
    } catch (error) {
        console.error("Error fetching Bitcoin price:", error);
        return null;
    }
}