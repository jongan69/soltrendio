import { JUPITER } from "./endpoints";

export const fetchJupiterSwap = async (id: string | undefined) => {
  try {
    const response = await fetch(`${JUPITER}/price/v3?ids=${id}`);
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
    }
    const price = await response.json();
    return price;
  } catch (error) {
    console.error('Error fetching Jupiter swap price:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};
