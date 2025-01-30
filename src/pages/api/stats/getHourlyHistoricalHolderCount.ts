import { DuneClient, QueryParameter } from "@duneanalytics/client-sdk";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    try {
        if (!process.env.DUNE_API_KEY) {
            return res.status(400).json({ error: 'Dune API key is required' });
        }
        const { contractAddress } = req.body;
        if (!contractAddress) {
            return res.status(400).json({ error: 'Contract address is required' });
        }
        const dune = new DuneClient(process.env.DUNE_API_KEY);
        const queryID = 4643142;
        const params = [
            QueryParameter.text("Contract Address", contractAddress)
        ];
          
          
        const query_result = await dune.runQuery({queryId: queryID, query_parameters: params});


        return res.status(200).json({
            hourlyHolderCount: query_result.result?.rows || []
        });

    } catch (error: any) {
        console.error('Error fetching hourly historical holder count:', error);
        return res.status(500).json({
            error: 'Internal server error while fetching hourly historical holder count',
            errorMessage: error.message.error
        });
    }
}