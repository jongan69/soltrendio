export const checkTwitterStatus = async (publicKey: string) => {
    if (!publicKey) return;

    try {
        const response = await fetch('/api/auth/twitter/status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                wallet: publicKey
            })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking Twitter status:', error);
    }
};

