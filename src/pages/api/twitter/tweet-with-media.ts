import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterApi } from 'twitter-api-v2';

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY || '',
  appSecret: process.env.TWITTER_API_SECRET || '',
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, mediaId } = req.body;
    
    if (!text || !mediaId) {
      return res.status(400).json({ error: 'Text and mediaId are required' });
    }

    // Create tweet with media
    const tweet = await client.v2.tweet(text, {
      media: { media_ids: [mediaId] }
    });

    console.log('Tweet posted successfully:', tweet);
    
    return res.status(200).json({ tweet });
  } catch (error) {
    console.error('Error posting tweet:', error);
    return res.status(500).json({ error: 'Failed to post tweet' });
  }
} 