export const extractCidFromUrl = (url: string): string | null => {
    if (!url) {
      console.error("No IPFS URL provided");
      return "";
    }
  
    let cid = "";
    if (url.startsWith("https://cf-ipfs.com/ipfs/")) {
      cid = url.replace("https://cf-ipfs.com/ipfs/", "");
    } else if (url.startsWith("https://ipfs.io/ipfs/")) {
      cid = url.replace("https://ipfs.io/ipfs/", "");
    } else if (url.startsWith("ipfs://")) {
      cid = url.replace("ipfs://", "");
    } else {
      const urlParts = url.split("/");
      cid = urlParts.find((part) => part.length === 46 && part.startsWith("Qm")) ?? "";
    }
  
    return cid.toString();
  };
  