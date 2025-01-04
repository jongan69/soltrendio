import { NextApiRequest, NextApiResponse } from 'next';
import cronHandler from './cron/route';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Forbidden in production' });
  }

  await cronHandler(req, res);
} 