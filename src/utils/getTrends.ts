export default async function getTrends() {
    try {   
        const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats/getTrends`);
        const trends = await data.json();
        return trends;
    } catch (error) {
        console.error("Error fetching trends:", error);
        return [];
    }
}