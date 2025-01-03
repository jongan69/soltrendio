import Twitter from 'twitter-api-v2';

const client = new Twitter({
  appKey: process.env.TWITTER_API_KEY!,
  appSecret: process.env.TWITTER_API_SECRET!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
});

console.log(process.env.TWITTER_API_KEY);
console.log(process.env.TWITTER_API_SECRET);
console.log(process.env.TWITTER_ACCESS_TOKEN);
console.log(process.env.TWITTER_ACCESS_TOKEN_SECRET); 

export async function postTweet(message: string) {
  try {
    await client.v2.tweet(message);
    console.log('Successfully tweeted:', message);
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw error;
  }
} 