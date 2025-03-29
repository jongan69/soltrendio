import axios from 'axios';

export async function fetchOptionRecomendations() {
    try {
        const response = await axios.get('https://investassist.app/api/options/recomendations');
        return response.data;
    } catch (error) {
        console.error('Error fetching option recomendations:', error);
        return null;
    }
}
