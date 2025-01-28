import OpenAI from "openai";
import type { NextApiRequest, NextApiResponse } from 'next';

const openai = new OpenAI({
    // baseURL: 'https://api.deepseek.com',
    apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { prompt } = req.body;
        // console.log("Received prompt length:", prompt.length);

        const completion = await openai.chat.completions.create({
            // model: "deepseek-reasoner",
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a cryptocurrency expert. Analyze tokens and find similarities. Return ONLY valid JSON with similarCoins array containing exactly 5 similar tokens."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: "json_object" }
        });

        const response = completion.choices[0].message.content;
        // console.log("Raw AI response:", response);

        try {
            const parsedResponse = JSON.parse(response || '{"similarCoins":[]}');
            // console.log("Parsed response:", parsedResponse);
            const result = parsedResponse.similarCoins || [];
            // console.log("Final result:", result);
            return res.status(200).json(result);
        } catch (parseError: any) {
            console.error('Failed to parse GPT response:', response);
            return res.status(500).json({ error: 'Invalid response format from AI', details: parseError.message });
        }
    } catch (error: any) {
        console.error('Error in compare-tokens API:', error);
        return res.status(500).json({
            error: 'Failed to compare tokens',
            details: error.message,
            response: error.response?.data
        });
    }
} 