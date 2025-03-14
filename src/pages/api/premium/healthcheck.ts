import { NextApiRequest, NextApiResponse } from 'next';
import { getEndpoint } from '@utils/getEndpoint';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const endpoint = await getEndpoint()
        console.log(endpoint)
        const response = await fetch(`${endpoint}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        console.log(response)
        const data = await response.json()
        console.log(data)
        return res.status(200).json(data)

    } catch (error) {
        console.error('Twitter fetch error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch healthcheck'
        });
    }
}