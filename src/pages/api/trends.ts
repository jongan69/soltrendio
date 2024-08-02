import googleTrends from 'google-trends-api';

export default async function handler(req: { method: string; body: { keywords: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; json: { (arg0: { error: string; }): void; new(): any; }; }; }) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { keywords } = req.body;

  console.log("Looking for keywords:", keywords);
  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: 'Keywords must be a non-empty array' });
    return;
  }

  try {
    const results = await googleTrends.interestOverTime({ keyword: keywords });
    res.status(200).json(JSON.parse(results));
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Error fetching trends data' });
  }
}