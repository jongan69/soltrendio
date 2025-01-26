// pages/api/ipfs/ipfs-proxy.js
const DEFAULT_IMAGE_URL =
  process.env.UNKNOWN_IMAGE_URL ||
  "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

export default async function handler(req: { query: { cid: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error?: unknown; imageUrl?: any; }): void; new(): any; }; }; }) {
  const { cid } = req.query;
  // console.log(`Retrieving IPFS metadata for CID: ${cid}`);
  if (!cid) {
    console.error(`CID is required`);
    res.status(200).json({ imageUrl: DEFAULT_IMAGE_URL });
    return;
  }

  const ipfsUrl = `https://ipfs.io/ipfs/${cid}`;
  // console.log(`Retrieving IPFS metadata for CID: ${ipfsUrl}`);

  try {
    const response = await fetch(ipfsUrl, { mode: 'no-cors' });
    if (!response.ok) {
      console.error(`Error fetching IPFS data: ${JSON.stringify(response)}`);
      res.status(200).json({ imageUrl: DEFAULT_IMAGE_URL });
      return
    }
    const data = await response.json();
    // console.log(`Found IPFS data from: ${data.image}`);
    res.status(200).json({ imageUrl: data.image });
    return
  } catch (error) {
    console.error(`Error fetching IPFS data: ${error}`);
    res.status(200).json({ imageUrl: DEFAULT_IMAGE_URL });
    return
  }
}
