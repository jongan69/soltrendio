export const fetchJupiterSwap = async (id: string | undefined) => {
    const response = await fetch(`https://price.jup.ag/v6/price?ids=${id}`);
    const price = await response.json();
    return price;
  };
  