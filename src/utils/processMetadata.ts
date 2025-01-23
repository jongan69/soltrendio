import { getTokenInfo } from "./getTokenInfo";

const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// Helper function to process token metadata
export async function processTokenMetadata(token: any, logo: string, cid: string, mint: string) {
    console.log(`Token metadata: ${JSON.stringify(token, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )}`);
    let tokenName = mint;
    let symbol = mint;
    if(logo.length > 0) {
      logo = logo;
    } else {
      const tokenInfo = await getTokenInfo(mint);
      tokenName = tokenInfo?.name ?? mint;
      symbol = tokenInfo?.symbol ?? mint;
      logo = tokenInfo?.image ?? DEFAULT_IMAGE_URL;
    }
    let metadata = {
      name: token?.metadata?.name || tokenName,
      symbol: token?.metadata?.symbol || symbol,
      logo: logo,
      cid: cid,
      collectionName: token?.metadata?.name || tokenName,
      collectionLogo: logo ?? DEFAULT_IMAGE_URL,
      isNft: false
    };
    return metadata;
  }