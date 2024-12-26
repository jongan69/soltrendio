import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API key is not configured." });
  }

  const { tokens } = req.body;
  
  // Summarize the token data to reduce token count
  const summarizedTokens = {
    totalTokens: tokens.totalTokens,
    totalValue: tokens.totalValue,
    // Take only top 10 tokens by value
    topTokens: tokens.summary
      .sort((a: any, b: any) => b.usdValue - a.usdValue)
      .slice(0, 10)
      .map((token: any) => ({
        symbol: token.symbol,
        amount: token.amount,
        usdValue: token.usdValue,
      }))
  };

  console.log("Summarized tokens data:", summarizedTokens);

  try {
    const requestBody = {
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "Generate an outrageously funny investment thesis and investment strategy based on the following token data. Use $TICKER format when mentioning tokens. End with scores (0-100) for: racism, crudity, profanity, drug/alcohol, hate speech.",
        },
        {
          role: "user",
          content: JSON.stringify(summarizedTokens),
        },
      ],
      temperature: 0.7,
      max_tokens: 1000
    };

    console.log("Sending request to OpenAI with body:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("OpenAI API response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenAI API error response:", errorData);
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("OpenAI API response data:", data);

    if (!data.choices || !data.choices[0]?.message?.content) {
      console.error("Invalid response structure:", data);
      throw new Error("Invalid response structure from OpenAI API");
    }

    const thesis = data.choices[0].message.content;
    console.log("Generated thesis:", thesis);
    res.status(200).json({ thesis });
  } catch (error) {
    console.error("Error generating thesis:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
    }
    res.status(500).json({ error: "An error occurred while generating the thesis." });
  }
}
