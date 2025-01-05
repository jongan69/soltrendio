const DEFAULT_IMAGE_URL = process.env.UNKNOWN_IMAGE_URL || "https://s3.coinmarketcap.com/static-gravity/image/5cc0b99a8dd84fbfa4e150d84b5531f2.png";

export const fetchIpfsMetadata = async (cid: string) => {
  try {
    if (!cid) {
      // console.log(`No IPFS CID provided: ${cid}`);
      return { imageUrl: DEFAULT_IMAGE_URL };
    }
    try {
      const response = await fetch(`/api/ipfs/ipfs-proxy?cid=${cid}`);
      if (!response.ok) return { imageUrl: DEFAULT_IMAGE_URL };
      return await response.json();
    } catch (error) {
      console.error("Error Fetching IPFS Data Using Default:", DEFAULT_IMAGE_URL);
      return { imageUrl: DEFAULT_IMAGE_URL };
    }
  } catch (error) {
    console.error("Error Fetching IPFS Data:", error);
    return { imageUrl: DEFAULT_IMAGE_URL };
  }
};
