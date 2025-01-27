import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenInfo } from '../../../utils/getTokenInfo';
import { isSolanaAddress } from '../../../utils/isSolanaAddress';
import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEP_SEEK_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set a longer timeout for the API route
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60'); // 60 seconds timeout

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { tokens } = req.body;
  // console.log("Tokens:", tokens);

  // Process tokens and fetch missing information
  const processedTopTokensSettled = await Promise.allSettled(
    (tokens.summary?.slice(0, 10) || []).map(async (token: any) => {
      let name = token.name;
      let symbol = token.symbol;

      // If symbol looks like a Solana address, try to fetch token info
      if (isSolanaAddress(symbol)) {
        const tokenInfo = await getTokenInfo(symbol);
        if (tokenInfo) {
          name = tokenInfo.name;
          symbol = tokenInfo.symbol;
        }
      }

      // Only return tokens where we have both name and symbol
      if (name && symbol) {
        return {
          name,
          symbol,
          usdValue: token.usdValue,
        };
      }
      return null;
    })
  )

  const processedTopTokens = processedTopTokensSettled
    .filter((result): result is PromiseFulfilledResult<typeof tokens> =>
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);


  const summarizedTokens = {
    totalTokens: tokens.totalTokens,
    totalValue: tokens.totalValue,
    topTokens: processedTopTokens
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000); // 50 second timeout

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "Generate an absolutely unhinged and hilariously absurd investment thesis and strategy based on the following token data. Use $TICKER format when mentioning tokens. Overexplain the most ridiculous parts as if they're groundbreaking financial insights and general likelihood of starting a cult. End with scores (0-100) for: racism, crudity, profanity, drug/alcohol, and hate speech"
        },
        {
          role: "user",
          content: JSON.stringify(summarizedTokens),
        },
      ],
      temperature: 1, // Crank up the heat to make the model even wilder
      max_tokens: 4096, // Give it room to fully embrace the chaos
    });

    clearTimeout(timeout);

    const thesis = completion.choices?.[0]?.message?.content;
    
    if (!thesis) {
      throw new Error("Invalid response structure from OpenAI API");
    }

    res.status(200).json({ thesis });
  } catch (error) {
    console.error("Error generating thesis:", error);
    if (error instanceof Error) {
      const errorMessage = error.name === 'AbortError' 
        ? "Request timed out. Please try again."
        : "An error occurred while generating the thesis.";
      res.status(500).json({ error: errorMessage });
    }
  }
}
