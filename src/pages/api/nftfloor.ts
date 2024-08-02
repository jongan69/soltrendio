// nftfloor.ts
export default async function handler(req: { query: { ca: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { floorPrice: any; uiFormmatted: any; usdValue: any }): void; new(): any; }; }; }) {
    const { ca } = req.query;
    // console.log(`Retrieving Floor Price for contract address: ${cid}`);
    const url = `https://api.simplehash.com/api/v0/nfts/solana/${ca}/0`;
    const options = {
        method: 'GET',
        headers: { accept: 'application/json', 'X-API-KEY': process.env.SIMPLEHASH_API_KEY ?? "" },
    };

    try {
        const response = await fetch(url, options)
            .then(res => res.json())
        // console.log(response.collection)
        const floorPriceInSol = response.collection.floor_prices[0].value / 1_000_000_000;
        const usdValue = response.collection.floor_prices[0].value_usd_cents / 100
        res.status(200).json({ floorPrice: floorPriceInSol, usdValue, uiFormmatted: `${floorPriceInSol.toFixed(4)} Sol ($${usdValue.toFixed(2)})` });
        return
    } catch (error) {
        console.error(`Error fetching NFT Collection data: ${error}`);
        res.status(500).json({ floorPrice: "Error", usdValue: 0.00, uiFormmatted: "0.0000 Sol" });
        return
    }
}
