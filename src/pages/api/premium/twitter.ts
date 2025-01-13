import { NextApiRequest, NextApiResponse } from 'next';
import { checkApiKey } from '@utils/checkApiKey';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!process.env.Local_Node_Api) {
        return res.status(500).json({ error: 'Local Node API is not set' });
    }

    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required' });
    }

    try {
        const isValid = await checkApiKey(apiKey as string);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
       const response = await fetch(process.env.Local_Node_Api as string)
       const data = await response.json()
       console.log(data)
       return res.status(200).json(data)
       
    } catch (error) {
        console.error('Twitter fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch tweets'
        });
    }
}