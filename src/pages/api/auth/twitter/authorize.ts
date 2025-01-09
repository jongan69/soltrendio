import { NextApiRequest, NextApiResponse } from 'next';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const CALLBACK_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/auth/twitter/callback`;

const oauth = new OAuth({
  consumer: {
    key: TWITTER_API_KEY,
    secret: TWITTER_API_SECRET
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, origin } = req.body;
    if (!wallet) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Generate OAuth nonce and timestamp
    const oauth_nonce = crypto.randomBytes(16).toString('base64');
    const oauth_timestamp = Math.floor(Date.now() / 1000).toString();
    console.log(oauth_nonce, oauth_timestamp);
    console.log(CALLBACK_URL);
    const requestData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: { 
        oauth_callback: `${CALLBACK_URL}?wallet=${wallet}&origin=${origin}`,
        oauth_nonce,
        oauth_timestamp,
        oauth_version: '1.0'
      },
    };

    const headers = oauth.toHeader(oauth.authorize(requestData));
    const requestToken = await fetch(requestData.url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!requestToken.ok) {
      const errorText = await requestToken.text();
      console.error('Twitter API error:', errorText);
      throw new Error(`Twitter API error: ${errorText}`);
    }

    const response = await requestToken.text();
    const oauthToken = new URLSearchParams(response).get('oauth_token');

    if (!oauthToken) {
      throw new Error('Failed to get oauth_token from Twitter');
    }

    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;
    
    res.status(200).json({ url: authUrl });
  } catch (error) {
    console.error('Twitter auth error:', error);
    res.status(500).json({ error: 'Failed to initiate Twitter authentication' });
  }
} 