export const getM3Vault = async (vaultAddress: string) => {
    try {
        const response = await fetch(`https://m3m3.meteora.ag/fee-farm/vault/${vaultAddress}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching M3 Vault data:', error);
        return null;
    }
}