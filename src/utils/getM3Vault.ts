export const getM3Vault = async (vaultAddress: string) => {
    try {
        // const url = `https://m3m3.meteora.ag/fee-farm/vault/${vaultAddress}`;
        const url = `https://stake-for-fee-api.meteora.ag/vault/${vaultAddress}`;
        console.log(url);
        const response = await fetch(url);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching M3 Vault data:', error);
        return null;
    }
}