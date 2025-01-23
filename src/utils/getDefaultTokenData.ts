import { getTokenInfo } from "./getTokenInfo";

const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

// Helper function to get default token metadata
export async function getDefaultTokenMetadata(mint: string) {
    const tokenInfo = await getTokenInfo(mint);
    return {
      name: tokenInfo?.name || mint,
      symbol: tokenInfo?.symbol || mint,
      logo: tokenInfo?.image || DEFAULT_IMAGE_URL,
      cid: null,
      collectionName: mint,
      collectionLogo: tokenInfo?.image || DEFAULT_IMAGE_URL,
      isNft: false
    };
  }