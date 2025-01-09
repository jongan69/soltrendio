import { NextApiRequest, NextApiResponse } from 'next';
import { getTwitterCredentials } from '@utils/saveTwitterCredentials';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.body;
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const twitterCredentials = await getTwitterCredentials(wallet);
    
    res.status(200).json({
      isLinked: !!twitterCredentials,
      username: twitterCredentials?.screenName || null
    });
  } catch (error) {
    console.error('Error checking Twitter status:', error);
    res.status(500).json({ error: 'Failed to check Twitter status' });
  }
} 