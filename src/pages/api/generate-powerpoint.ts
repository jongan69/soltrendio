import { NextApiRequest, NextApiResponse } from 'next';
import PptxGenJS from 'pptxgenjs';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateThesisSummary(thesis: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
            role: "user",
            content: `Summarize this investment thesis in one clear, concise sentence: "${thesis}"`
        }],
        max_tokens: 60,
        temperature: 0.7,
    });

    return response.choices[0].message.content || thesis;
}

// async function generateSlideImages(tokens: any[], thesis: string): Promise<string[]> {
//   try {
//     const response = await openai.images.generate({
//       model: "dall-e-3",
//       prompt: `Create a professional, abstract business visualization representing cryptocurrency trading. Style: minimalist, corporate, using cool tones. Context: ${thesis.slice(0, 100)}`,
//       size: "1024x1024",
//       quality: "standard",
//       n: Math.min(tokens.length, 10)  // Generate up to 10 images at once
//     });

//     return response.data.map(image => image.url || '');
//   } catch (error) {
//     console.error('Error generating images:', error);
//     return [];
//   }
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    console.log('Full request body:', JSON.stringify(req.body, null, 2));

    const { tokens, thesis } = req.body;
    console.log('Tokens type:', typeof tokens);
    console.log('Tokens value:', tokens);
    console.log('Thesis value:', thesis);

    // Add validation logging
    if (!tokens) {
        console.log('Tokens is missing or null');
        return res.status(400).json({ error: 'Tokens data is missing' });
    }

    if (!Array.isArray(tokens)) {
        console.log('Invalid tokens structure:', tokens);
        console.log('tokens type:', typeof tokens);
        return res.status(400).json({ error: 'tokens is not an array' });
    }

    console.log('Number of tokens:', tokens.length);

    try {
        const pptx = new PptxGenJS();

        // Add metadata
        pptx.title = 'Investment Portfolio Analysis';
        pptx.subject = 'Token Analysis';
        pptx.company = 'Crypto Analytics';
        pptx.revision = '1';

        // Set 16:9 layout for modern screens
        pptx.layout = 'LAYOUT_16x9';

        // Set theme and fonts
        pptx.theme = {
            headFontFace: "Helvetica",
            bodyFontFace: "Helvetica"
        };

        // Add more slide transitions and animations
        pptx.defineLayout({
            name: 'FUNKY',
            width: 10,
            height: 5.625,
        });

        // Add footer with slide numbers
        pptx.defineSlideMaster({
            title: 'MASTER_SLIDE',
            background: { color: pptx.SchemeColor.background2 },
            objects: [
                {
                    'line': {
                        'x': 0,
                        'y': 5.0,
                        'w': '100%',
                        'line': {
                            'color': pptx.SchemeColor.accent1,
                            'width': 1,
                            'dashType': 'dash'
                        }
                    }
                }
            ]
        });

        // Vibrant background colors
        const vibrantColors = [
            'FF1493', // Deep Pink
            '00FF00', // Lime
            'FF4500', // Orange Red
            '1E90FF', // Dodger Blue
            'FFD700', // Gold
            '8A2BE2', // Blue Violet
            'FF69B4', // Hot Pink
            '32CD32', // Lime Green
            '00FFFF', // Cyan
            'FF00FF'  // Magenta
        ];

        // Fun emoji combinations
        const trendEmojis = {
            high: ['🤑', '💸', '🚀', '💎', '🔥'],
            medium: ['😊', '💫', '⭐', '✨', '💰'],
            low: ['🤔', '📈', '💡', '🎯', '💪']
        };

        // Helper function to get random emojis
        function getRandomEmojis(type: 'high' | 'medium' | 'low', count: number = 3): string {
            const emojis = trendEmojis[type];
            let result = '';
            for (let i = 0; i < count; i++) {
                result += emojis[Math.floor(Math.random() * emojis.length)];
            }
            return result;
        }

        // Title slide with scheme colors
        const titleSlide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
        titleSlide.background = {
            color: pptx.SchemeColor.background2
        };

        // Add a decorative background image to title slide
        // titleSlide.addImage({
        //   path: 'https://cryptoicons.org/api/icon/eth/200',  // Example crypto icon
        //   x: 7.5,
        //   y: 0.5,
        //   w: 2,
        //   h: 2,
        //   transparency: 85,  // Make it very subtle
        //   rotate: 15
        // });

        // Get concise summary for title slide
        const thesisSummary = await generateThesisSummary(thesis);

        // Title slide with concise summary
        titleSlide.addText('🚀 Investment Thesis 💰', {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 0.6,
            fontSize: 48,
            bold: true,
            color: '000000',
            align: 'center',
            breakLine: false,
            shrinkText: false
        });

        // Add concise summary
        titleSlide.addText(thesisSummary, {
            x: 0.5,
            y: 2.5,
            w: 9,
            h: 1.5,
            fontSize: 30,
            color: '000000',
            align: 'center',
            bold: true,
            breakLine: false,
            shrinkText: false
        });

        // Add website text to title slide
        titleSlide.addText('soltrendio.com', {
            x: 8.0,
            y: 0.2,
            w: 1.7,
            h: 0.3,
            fontSize: 12,
            color: '000000',
            fontFace: 'Helvetica',
            bold: true,
            align: 'right',
            breakLine: false,
            shrinkText: true
        });

        // Helper function to ensure complete sentences
        function getCompleteSentences(text: string): string[] {
            // Split only on period followed by space to preserve symbols like "e.g." or "U.S.A"
            const sentences = text.split('. ').filter(Boolean);
            
            return sentences
                .map(s => s.trim())
                .filter(s => 
                    s.length > 10 && // Minimum length
                    s.split(' ').length > 3 && // Minimum words
                    /^[A-Z]/.test(s) // Starts with capital letter
                )
                .map(s => s.endsWith('.') ? s : `${s}.`); // Ensure period at end
        }

        // Improved sentence distribution
        function distributeCompleteSentences(sentences: string[], numSlides: number): string[][] {
            const result: string[][] = new Array(numSlides).fill(null).map(() => []);
            
            // Distribute valid sentences evenly
            sentences.forEach((sentence, index) => {
                const slideIndex = index % numSlides;
                result[slideIndex].push(sentence);
            });
            
            return result;
        }

        // Split full thesis into complete sentences
        // const thesisParts = getCompleteSentences(thesis);
        const numSlides = Math.min(tokens.length, 10);
        // const partsPerSlide = Math.ceil(thesisParts.length / numSlides);

        // Generate all images at once
        // const images = await generateSlideImages(tokens.slice(0, 10), thesis);

        // Add keyword to emoji mapping
        const keywordEmojis: { [key: string]: string[] } = {
            // Market terms
            'bull': ['🐂', '📈', '💪'],
            'bear': ['🐻', '📉', '🔻'],
            'market': ['📊', '💹', '📈'],
            // Growth terms
            'grow': ['🌱', '📈', '⬆️'],
            'increase': ['⬆️', '📈', '🔺'],
            'rise': ['🚀', '📈', '⬆️'],
            // Risk terms
            'risk': ['⚠️', '🎲', '⚡'],
            'volatile': ['🎢', '📊', '💨'],
            // Value terms
            'value': ['💎', '💰', '💵'],
            'price': ['💲', '💰', '💵'],
            // Technology terms
            'blockchain': ['⛓️', '🔗', '📱'],
            'crypto': ['₿', '🔐', '💻'],
            'token': ['🪙', '🎫', '🔓'],
            'defi': ['🏦', '💱', '🔄'],
            // Positive sentiment
            'good': ['✨', '🌟', '💫'],
            'great': ['🔥', '⭐', '✨'],
            'best': ['🏆', '🥇', '💫'],
            // Negative sentiment
            'bad': ['⚠️', '❌', '⛔'],
            'poor': ['👎', '📉', '❌'],
            // Innovation terms
            'new': ['✨', '🆕', '🎯'],
            'innovation': ['💡', '🔮', '🎯'],
            'future': ['🔮', '🎯', '🚀']
        };

        // Helper function to find relevant emojis from text
        function findRelevantEmojis(text: string, maxEmojis: number = 3): string {
            const words = text.toLowerCase().split(/\W+/);
            const foundEmojis = new Set<string>();

            words.forEach(word => {
                Object.entries(keywordEmojis).forEach(([keyword, emojis]) => {
                    if (word.includes(keyword)) {
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        foundEmojis.add(randomEmoji);
                    }
                });
            });

            return Array.from(foundEmojis).slice(0, maxEmojis).join('');
        }

        // Helper function to ensure proper text wrapping and layout with minimal empty space
        function formatSlideText(text: string, maxCharsPerLine: number = 80): string {  // Increased max chars
            // Remove extra spaces and normalize whitespace
            const cleanText = text.replace(/\s+/g, ' ').trim();
            const words = cleanText.split(' ');
            let lines: string[] = [];
            let currentLine = '';

            words.forEach(word => {
                // If adding this word doesn't exceed max length, add it to current line
                if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
                    currentLine += (currentLine ? ' ' : '') + word;
                } else {
                    // If current line isn't empty, push it and start new line
                    if (currentLine) {
                        lines.push(currentLine.trim());
                    }
                    // Start new line with current word
                    currentLine = word;
                }
            });

            // Add the last line if it exists
            if (currentLine) {
                lines.push(currentLine.trim());
            }

            // Filter out empty lines and join with minimal spacing
            return lines
                .filter(line => line.length > 0)
                .join('\n');
        }

        // Add token data slides with distributed thesis parts
        tokens.slice(0, 10).forEach((token: any, index: number) => {
            const slide = pptx.addSlide();

            // Randomize background color
            const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
            slide.background = {
                color: randomColor
            };

            // Get emoji style based on value
            const emojiStyle = token.usdValue > 100 ? 'high' : token.usdValue > 50 ? 'medium' : 'low';
            const trendEmoji = getRandomEmojis(emojiStyle);

            // Add website text
            slide.addText('soltrendio.com', {
                x: 8.0,
                y: 0.2,
                w: 1.7,
                h: 0.3,
                fontSize: 12,
                color: '000000',
                fontFace: 'Helvetica',
                bold: true,
                align: 'right',
                breakLine: false,
                shrinkText: true
            });

            // Adjust token name position
            slide.addText(`${trendEmoji} ${token.name || 'Unknown'} ${trendEmoji}`, {
                x: 1.5,
                y: 0.5,
                w: 7,
                h: 0.6,
                fontSize: 30,
                bold: true,
                color: '000000',
                align: 'center',
                breakLine: false,
                shrinkText: false,
                autoFit: true
            });

            // Adjust details text position
            slide.addText([
                { text: `${trendEmoji} Symbol:`, options: { bold: true, color: '000000' } },
                { text: token.symbol, options: { bold: false, color: '000000' } },
                { text: `\n${trendEmoji} USD Value: `, options: { bold: true, color: '000000' } },
                { text: `$${token.usdValue.toFixed(2)}`, options: { bold: false, color: '000000' } }
            ], {
                x: 1.5,
                y: 2,
                w: 7,
                h: 0.8,
                fontSize: 20,
                lineSpacing: 25,
                align: 'center',
                breakLine: false,
                shrinkText: false,
                autoFit: true
            });

            // // Update the details text styling for better contrast
            // slide.addText([
            //     { text: '💎 Symbol: ', options: { bold: true, color: '000000' } },
            //     { text: token.symbol, options: { bold: false, color: '000000' } },
            //     { text: '\n💰 USD Value: ', options: { bold: true, color: '000000' } },
            //     { text: `$${token.usdValue.toFixed(2)}`, options: { bold: false, color: '000000' } }
            // ], {
            //     x: 1.5,
            //     y: 0.9,
            //     w: 7,
            //     h: 0.8,
            //     fontSize: 22,
            //     lineSpacing: 25,
            //     align: 'center',
            //     breakLine: false,
            //     shrinkText: false
            // });

            // Get thesis parts for this slide
            //   const startIdx = index * partsPerSlide;

            // Update sparkles with more variety
            const sparkles = token.usdValue > 100 ? getRandomEmojis('high', 4) :
                token.usdValue > 50 ? getRandomEmojis('medium', 3) :
                    getRandomEmojis('low', 2);

            const completeSentences = getCompleteSentences(thesis);
            const distributedSentences = distributeCompleteSentences(completeSentences, numSlides);

            const slideSentences = distributedSentences[index] || [];
            if (slideSentences.length > 0) {
                const formattedText = slideSentences
                    .map((sentence: string) => {
                        const contextEmojis = findRelevantEmojis(sentence);
                        return contextEmojis ? `${contextEmojis} ${sentence}` : sentence;
                    })
                    .join(' ');  // Join with space instead of newline

                if (formattedText) {
                    slide.addText(`${sparkles} ${formatSlideText(formattedText)} ${sparkles}`, {
                        x: 0.5,
                        y: 2.5,
                        w: 9,
                        h: 3.2,  // Increased height to use more space
                        fontSize: 15,
                        color: '000000',
                        align: 'center',
                        bold: false,
                        breakLine: true,
                        lineSpacing: 20,  // Reduced line spacing
                        autoFit: true  // Enable auto-fitting
                    });
                }
            }

            // Add progress bar
            slide.addShape(pptx.ShapeType.rect, {
                x: 0,
                y: 0,
                w: `${((index + 1) / Math.min(tokens.length, 10)) * 100}%`,
                h: 0.1,
                fill: { color: '000000', transparency: 50 }
            });

            // Add subtle grid pattern
            for (let i = 0; i < 10; i++) {
                slide.addShape(pptx.ShapeType.line, {
                    x: i,
                    y: 0,
                    w: 0,
                    h: 5.625,
                    line: { color: '000000', width: 0.25, transparency: 90 }
                });
            }

            // Add token market cap or other relevant data
            if (token.marketCap) {
                slide.addText(`Market Cap: $${(token.marketCap / 1e6).toFixed(2)}M`, {
                    x: 1.5,
                    y: 1.6,  // Moved up from 2.0
                    w: 7,
                    h: 0.4,
                    fontSize: 16,
                    color: '000000',
                    align: 'center'
                });
            }
        });

        // After the token slides loop, add summary slide
        const summarySlide = pptx.addSlide();
        summarySlide.background = { color: 'FFFFFF' };  // White background for readability

        // Add title
        summarySlide.addText('Portfolio Breakdown 📊', {
            x: 0.5,
            y: 0.2,
            w: 9,
            h: 0.6,
            fontSize: 32,
            bold: true,
            color: '000000',
            align: 'center',
            breakLine: false,
            shrinkText: false
        });

        // Calculate total value
        const totalValue = tokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

        // Prepare table data and sort by value
        const tableData = tokens.slice(0, 10)
          .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))  // Sort descending
          .map(token => {
            const percentage = ((token.usdValue / totalValue) * 100).toFixed(2);
            return [
              { text: token.name || 'Unknown', options: { bold: true, color: '000000' } },
              { text: token.symbol, options: { color: '000000' } },
              { text: `$${token.usdValue.toFixed(2)}`, options: { color: '000000' } },
              { text: `${percentage}%`, options: { color: '000000' } }
            ];
          });

        // Add table
        summarySlide.addTable(
          [
            [
              { text: 'Token Name', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
              { text: 'Symbol', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
              { text: 'USD Value', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
              { text: 'Portfolio %', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } }
            ],
            ...tableData
          ],
          {
            x: 0.5,
            y: 1.5,
            w: 9,
            h: 3,
            colW: [3, 2, 2, 2],
            border: { type: 'solid', color: '000000', pt: 1 },
            align: 'center',
            valign: 'middle',
            fontSize: 16,
            rowH: 0.4
          }
        );

        // Add total value
        summarySlide.addText(`Total Portfolio Value: $${totalValue.toFixed(2)}`, {
          x: 0.5,
          y: 4.5,
          w: 9,
          h: 0.5,
          fontSize: 20,
          bold: true,
          color: '000000',
          align: 'center'
        });

        // Add website text to summary slide
        summarySlide.addText('soltrendio.com', {
            x: 8.0,
            y: 0.2,
            w: 1.7,
            h: 0.3,
            fontSize: 12,
            color: '000000',
            fontFace: 'Helvetica',
            bold: true,
            align: 'right',
            breakLine: false,
            shrinkText: false
        });

        // Generate PowerPoint as a base64 string
        const pptxBase64 = await pptx.write({ outputType: 'base64' });

        res.status(200).json({ pptxBase64 });
    } catch (error) {
        console.error('Error generating PowerPoint:', error);
        res.status(500).json({ error: 'Failed to generate PowerPoint presentation' });
    }
}
