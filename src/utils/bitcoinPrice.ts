export const fetchBitcoinPrice = async () => {
    const response = await fetch(`https://api.coindesk.com/v1/bpi/currentprice.json`);
    const data = await response.json();
    const price = data.bpi.USD.rate;
    return price;
}