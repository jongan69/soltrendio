export default async function getTrends() {
    const data = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/stats/getTrends`);
    const trends = await data.json();
    return trends;
}