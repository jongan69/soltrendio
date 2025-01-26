import { NextApiRequest, NextApiResponse } from 'next';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { saveTwitterCredentials } from '@utils/saveTwitterCredentials';

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;

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
  const { oauth_token, oauth_verifier, wallet, origin } = req.query;

  if (!oauth_token || !oauth_verifier || !wallet) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    // Exchange request token for access token
    const requestData = {
      url: 'https://api.twitter.com/oauth/access_token',
      method: 'POST',
      data: { 
        oauth_token,
        oauth_verifier 
      },
    };

    const response = await fetch(requestData.url, {
      method: 'POST',
      headers: {
        ...oauth.toHeader(oauth.authorize(requestData)),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = await response.text();
    const params = new URLSearchParams(data);
    
    const accessToken = params.get('oauth_token');
    const accessTokenSecret = params.get('oauth_token_secret');
    const userId = params.get('user_id');
    const screenName = params.get('screen_name');

    if (!accessToken || !accessTokenSecret || !userId || !screenName) {
      throw new Error('Missing Twitter credentials');
    }

    // Save Twitter credentials to MongoDB
    await saveTwitterCredentials(wallet as string, {
      accessToken,
      accessTokenSecret,
      userId,
      screenName
    });

    // console.log('origin', origin);
    // Close the popup and notify the parent window
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage({ 
              type: 'TWITTER_AUTH_SUCCESS', 
              screenName: '${screenName}',
              userId: '${userId}'
            }, '${origin || '*'}');
            window.close();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Twitter callback error:', error);
    res.status(500).json({ error: 'Failed to complete Twitter authentication' });
  }
} 