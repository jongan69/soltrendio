import OpenAI from "openai";

const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEP_SEEK_API_KEY,
});

export default async function handler(req: { method: string; body: { text: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; end: { (): any; new(): any; }; json: { (arg0: { thesis?: any; error?: string; }): void; new(): any; }; }; }) {
    if (req.method !== "POST") {
        return res.status(405).end();
    }

    const { text } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
    Analyze the following text for three specific sentiments: racism, hate speech, and drug use.
    Return only a JSON string in this exact format:
    {
      "racism": <score>,
      "hateSpeech": <score>,
      "drugUse": <score>,
      "crudity": <score>,
      "profanity": <score>
    }
    where scores are integers between 0 and 100, where 0 indicates no presence and 100 indicates very high presence.
    Text: "${text}"
    `,
                }
            ],
            // model: "deepseek-chat",
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 4096,
            response_format: { type: "json_object" }
        });

        if (!completion) {
            throw new Error("Network response was not ok");
        }

        const thesis = completion.choices[0].message.content;
        res.status(200).json({ thesis });
    } catch (error) {
        console.error("Error generating thesis:", error);
        res.status(500).json({ error: "An error occurred while generating the thesis." });
    }
}
