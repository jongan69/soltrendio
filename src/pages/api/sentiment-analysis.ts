import OpenAI from "openai";

const openai = new OpenAI();

export default async function handler(req: { method: string; body: { text: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; end: { (): any; new(): any; }; json: { (arg0: { thesis?: any; error?: string; }): void; new(): any; }; }; }) {
    if (req.method !== "POST") {
        return res.status(405).end(); // Method Not Allowed
    }

    const { text } = req.body;

    try {
        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `
    Analyze the following text for three specific sentiments: racism, hate speech, and drug use.
    Provide the analysis in the following json format:
    {
      "racism": <score>,
      "hateSpeech": <score>,
      "drugUse": <score>
    }
    Scores should be integers between 0 and 100, where 0 indicates no presence of the sentiment and 100 indicates a very high presence.
    Text: "${text}"
    `,
                }
            ],
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
        });


        if (!completion) {
            throw new Error("Network response was not ok");
        }
        console.log(completion.choices[0].message.content);
        const thesis = completion.choices[0].message.content;
        res.status(200).json({ thesis });
    } catch (error) {
        console.error("Error generating thesis:", error);
        res.status(500).json({ error: "An error occurred while generating the thesis." });
    }
}
