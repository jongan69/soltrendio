import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenInfo } from '../../../utils/getTokenInfo';
import { isSolanaAddress } from '../../../utils/isSolanaAddress';
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
  // console.log("Tokens:", tokens);

  // Process tokens and fetch missing information
  const processedTopTokens = (await Promise.all(
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
  )).filter((token): token is NonNullable<typeof token> => token !== null);

  const summarizedTokens = {
    totalTokens: tokens.totalTokens,
    totalValue: tokens.totalValue,
    topTokens: processedTopTokens
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000); // 50 second timeout

    // const requestBody = {
    //   model: "gpt-3.5-turbo", // Using a faster model
    //   messages: [
    //     {
    //       role: "system",
    //       content:
    //         "Generate an outrageously stupid funny investment thesis and investment strategy based on the following token data. Use $TICKER format when mentioning tokens. End with scores (0-100) for: racism, crudity, profanity, drug/alcohol, hate speech.",
    //     },
    //     {
    //       role: "user",
    //       content: JSON.stringify(summarizedTokens),
    //     },
    //   ],
    //   temperature: 1.2,
    //   max_tokens: 4000
    // };
    const requestBody = {
      model: "gpt-4-turbo", // Using a faster model because life’s short, and so are attention spans
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
      // humor_mode: "chaotic-neutral" // Hypothetical feature for future models
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
