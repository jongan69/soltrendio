import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenInfo } from '../../utils/getTokenInfo';
import { isSolanaAddress } from './isSolanaAddress';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set a longer timeout for the API route
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=60'); // 60 seconds timeout

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured." });
  }

  const { tokens } = req.body;
  console.log("Tokens:", tokens);

  // Process tokens and fetch missing information
  const processedTopTokens = await Promise.all(
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

      return {
        name: name || symbol, // Fallback to symbol if name is still missing
        symbol: symbol,
        usdValue: token.usdValue,
      };
    })
  );

  const summarizedTokens = {
    totalTokens: tokens.totalTokens,
    totalValue: tokens.totalValue,
    topTokens: processedTopTokens
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000); // 50 second timeout

    const requestBody = {
      model: "gpt-3.5-turbo", // Using a faster model
      messages: [
        {
          role: "system",
          content:
            "Generate an outrageously funny investment thesis and investment strategy based on the following token data. Use $TICKER format when mentioning tokens. End with scores (0-100) for: racism, crudity, profanity, drug/alcohol, hate speech. Keep response concise.",
        },
        {
          role: "user",
          content: JSON.stringify(summarizedTokens),
        },
      ],
      temperature: 0.7,
      max_tokens: 500 // Reduced max tokens for faster response
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const thesis = data.choices?.[0]?.message?.content;
    
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
