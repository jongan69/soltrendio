export default async function handler(req: { method: string; body: { tokens: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; end: { (): any; new(): any; }; json: { (arg0: { thesis?: any; error?: string; }): void; new(): any; }; }; }) {
    if (req.method !== "POST") {
      return res.status(405).end(); // Method Not Allowed
    }
  
    const { tokens } = req.body;
  
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: "Generate an outrageously funny investment thesis and inesvtment strategy to find similar investments based on the following summarized token data using the $Tickers in the sentences of the thesis. Please end the thesis with: \nracism score, crudity score, profanity score, drug and alcohol score, hate speech and discrimination score.",
            },
            {
              role: "user",
              content: JSON.stringify(tokens),
            },
          ],
        }),
      });
  
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
  
      const data = await response.json();
      const thesis = data.choices[0].message.content;
      res.status(200).json({ thesis });
    } catch (error) {
      console.error("Error generating thesis:", error);
      res.status(500).json({ error: "An error occurred while generating the thesis." });
    }
  }
  