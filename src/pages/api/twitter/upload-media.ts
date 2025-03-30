import { NextApiRequest, NextApiResponse } from 'next';
import { TwitterApi } from 'twitter-api-v2';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

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
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Remove the data:image/png;base64, prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Twitter's media endpoint with correct MIME type
    const mediaId = await client.v2.uploadMedia(buffer, {
      media_type: 'image/png',
    });

    // Ensure media is processed before returning
    await client.v2.createMediaMetadata(mediaId, {
      alt_text: { text: 'BreadSheet portfolio snapshot showing token market caps and ATH comparisons' }
    });
    console.log('Media uploaded successfully:', mediaId);

   
    console.log('Media details:', mediaId);
    
    return res.status(200).json({ mediaId: mediaId.toString() });
  } catch (error) {
    console.error('Error uploading to Twitter:', error);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
} 