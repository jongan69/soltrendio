export const fetch6900 = async () => {
    try {
        const url = 'https://api.coingecko.com/api/v3/simple/price?ids=spx6900&vs_currencies=usd&include_market_cap=true';
        const options = {method: 'GET', headers: {accept: 'application/json', 'x-cg-api-key': 'CG-sPK8Q7SmhaM8CqiFuJ7sKaEc'}};
        const response = await fetch(url, options);
        const data = await response.json();
        console.log(data);
        return data.spx6900.usd_market_cap;
    } catch (error) {
        console.error('Error fetching 6900 market cap:', error);
        return 0;
    }
};