export const fetchFloorPrice = async (ca: string | undefined) => {
    const response = await fetch(`/api/nftfloor?ca=${ca}`);
    const price = await response.json();
    return price;
  };
  