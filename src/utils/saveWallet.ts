import axios from "axios";

export const saveWalletToDb = async (address: string) => {
    try {
      await axios.post('/api/save-wallet', { address });
      console.log('Wallet saved successfully');
    } catch (error) {
      console.error('Error saving wallet:', error);
    }
  };