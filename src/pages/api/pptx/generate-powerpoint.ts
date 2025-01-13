import { NextApiRequest, NextApiResponse } from 'next';
import PptxGenJS from 'pptxgenjs';
import OpenAI from 'openai';
import { isSolanaAddress } from '../../../utils/isSolanaAddress';
import { PowerPoint } from 'src/models/PowerPoint';
import mongoose from 'mongoose';
import { connectDB } from '../../../utils/mongooseDb';




const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const config = {
    api: {
        responseLimit: false,
        bodyParser: {
            sizeLimit: '50mb'
        }
    }
}

async function generateThesisSummary(thesis: string): Promise<string> {
    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{
            role: "user",
            content: `Summarize this investment thesis in one clear, concise but very stupid sentence: "${thesis}"`
        }],
        max_tokens: 60,
        temperature: 0.7,
    });

    return response.choices[0].message.content || thesis;
}

function calculateFontSize(text: string, maxLength: number = 500): number {
    // Base font size is 15
    const baseSize = 15;
    const minSize = 11;

    if (text.length <= maxLength) {
        return baseSize;
    }

    // Gradually reduce font size based on text length
    const reduction = Math.floor((text.length - maxLength) / 100);
    return Math.max(baseSize - reduction, minSize);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    console.log('Request received:', {
        method: req.method,
        headers: req.headers,
        body: typeof req.body === 'string' ? 'String body detected' : 'Parsed body',
        contentType: req.headers['content-type']
    });

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        await connectDB();
        // Log raw request body if it's a string
        if (typeof req.body === 'string') {
            console.log('Raw request body (string):', req.body);
            try {
                req.body = JSON.parse(req.body);
                console.log('Successfully parsed body:', req.body);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.log('Failed to parse body. First 100 characters:', req.body.substring(0, 100));
                return res.status(400).json({ error: 'Invalid JSON in request body' });
            }
        }

        // Validate request body
        console.log('Request body type:', typeof req.body);
        console.log('Request body:', req.body);

        if (!req.body || typeof req.body !== 'object') {
            console.error('Invalid body structure:', req.body);
            throw new Error('Invalid request body');
        }

        const { tokens, thesis } = req.body;

        console.log('Extracted tokens:', tokens ? `Array of ${tokens.length} items` : 'undefined');
        console.log('Extracted thesis:', thesis ? 'Present' : 'undefined');

        if (!tokens || !Array.isArray(tokens)) {
            console.error('Invalid tokens structure:', {
                tokens,
                type: typeof tokens,
                isArray: Array.isArray(tokens)
            });
            throw new Error('Invalid tokens data');
        }

        if (!thesis || typeof thesis !== 'string') {
            console.error('Invalid thesis structure:', {
                thesis,
                type: typeof thesis
            });
            throw new Error('Invalid thesis data');
        }

        console.log('Full request body:', JSON.stringify(req.body, null, 2));

        console.log('Tokens:', tokens);
        console.log('Thesis:', thesis);


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

        const filteredTokens = tokens.filter((token: any) => !isSolanaAddress(token.name));

        // Separate NFTs and regular tokens
        const regularTokens = filteredTokens.filter((token: any) => !token.isNft);
        const nftTokens = filteredTokens.filter((token: any) => token.isNft);

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
                x: 0.2,
                y: 0.5,
                w: 9.6,
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
                x: 0.2,
                y: 2.5,
                w: 9.6,
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
            function getAndDistributeSentences(text: string, numSlides: number): string[][] {
                // Split and clean sentences
                const sentences = text.split('. ')
                    .filter(Boolean)
                    .map(s => s.trim())
                    .filter(s => s.length > 10 && /^[A-Z]/.test(s))
                    .map(s => s.endsWith('.') ? s : `${s}.`);

                // Distribute evenly
                const result: string[][] = new Array(numSlides).fill([]).map(() => [] as string[]);
                sentences.forEach((sentence, i) => {
                    result[i % numSlides].push(sentence);
                });

                // Ensure no empty slides
                return result.map(slideTexts =>
                    slideTexts.length ? slideTexts : [sentences[0] || '']);
            }

            // Split full thesis into complete sentences
            // const thesisParts = getCompleteSentences(thesis);
            const numSlides = Math.min(filteredTokens.length, 10);
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
            function formatSlideText(text: string, maxCharsPerLine: number = 120): string {  // Increased from 80
                const cleanText = text.replace(/\s+/g, ' ').trim();
                const words = cleanText.split(' ');
                let lines: string[] = [];
                let currentLine = '';

                words.forEach(word => {
                    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
                        currentLine += (currentLine ? ' ' : '') + word;
                    } else {
                        if (currentLine) {
                            lines.push(currentLine.trim());
                        }
                        currentLine = word;
                    }
                });

                if (currentLine) {
                    lines.push(currentLine.trim());
                }

                return lines
                    .filter(line => line.length > 0)
                    .join('\n');
            }

            // Filter out tokens with 0 USD value before creating slides
            const filteredTokensWithValue = filteredTokens
                .filter((token: any) => token.usdValue && token.usdValue > 0)
                .slice(0, 10);

            // Update the forEach loop to use filteredTokensWithValue
            filteredTokensWithValue.forEach((token: any, index: number) => {
                const slide = pptx.addSlide();

                // Randomize background color
                const randomColor = vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
                slide.background = {
                    color: randomColor
                };

                // Get emoji style based on value
                const emojiStyle = filteredTokens[index].usdValue > 100 ? 'high' : filteredTokens[index].usdValue > 50 ? 'medium' : 'low';
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

                // Add image with improved positioning and styling
                slide.addImage({
                    path: token.image,
                    x: 0.5,        // Start more to the left
                    y: .8,        // Position below the title
                    w: 1.5,        // Slightly smaller width
                    h: 1.5,        // Keep aspect ratio square
                    sizing: {      // Add sizing for better image control
                        type: 'contain',
                        w: 1.5,
                        h: 1.5
                    },
                    rounding: true,  // Make image circular
                    shadow: {        // Add subtle shadow
                        type: 'outer',
                        blur: 3,
                        offset: 2,
                        angle: 45,
                        opacity: 0.3
                    }
                });

                // Helper function to format market cap with fallback
                const formatMarketCap = (marketCap: number | undefined): string => {
                    if (!marketCap || isNaN(marketCap)) {
                        return 'N/A';
                    }
                    const capInMillions = marketCap / 1e6;
                    return isNaN(capInMillions) ? 'N/A' : `$${capInMillions.toFixed(2)}M`;
                };

                // Adjust details text position to account for new image position
                const textDetails = [
                    { text: `${trendEmoji} Symbol:`, options: { bold: true, color: '000000' } },
                    { text: token.symbol, options: { bold: false, color: '000000' } },
                    { text: `\n${trendEmoji} USD Value: $${(token.usdValue || 0).toFixed(2)}`, options: { bold: true, color: '000000' } },
                ];

                // Only add market cap if it's available and valid
                if (token.marketCap && !isNaN(token.marketCap)) {
                    textDetails.push({ text: `${trendEmoji} Market Cap: ${formatMarketCap(token.marketCap)}`, options: { bold: true, color: '000000' } });
                }

                slide.addText(textDetails, {
                    x: 2.5,
                    y: 1,
                    w: 7,
                    h: 1.5,
                    fontSize: 20,
                    lineSpacing: 25,
                    align: 'left',
                    breakLine: true,
                    shrinkText: true
                });

                // Update sparkles with more variety
                const sparkles = token.usdValue > 100 ? getRandomEmojis('high', 4) :
                    token.usdValue > 50 ? getRandomEmojis('medium', 3) :
                        getRandomEmojis('low', 2);

                const completeSentences = getAndDistributeSentences(thesis, numSlides);
                const slideSentences = completeSentences[index] || [];
                if (slideSentences.length > 0) {
                    const formattedText = slideSentences
                        .map((sentence: string) => {
                            const contextEmojis = findRelevantEmojis(sentence);
                            return contextEmojis ? `${contextEmojis} ${sentence}` : sentence;
                        })
                        .join(' ');

                    if (formattedText) {
                        const dynamicFontSize = calculateFontSize(formattedText);

                        slide.addText(`${sparkles} ${formatSlideText(formattedText)} ${sparkles}`, {
                            x: 0.2,
                            y: 2.3,
                            w: 9.6,
                            h: 3.2,
                            fontSize: dynamicFontSize,
                            color: '000000',
                            align: 'left',
                            bold: false,
                            breakLine: true,
                            lineSpacing: dynamicFontSize * 1.1,
                            autoFit: true,
                            shrinkText: true,
                            wrap: true,
                            margin: 0
                        });
                    }
                }

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
            });

            // Add regular tokens summary slide
            const tokenSummarySlide = pptx.addSlide();
            tokenSummarySlide.background = { color: 'FFFFFF' };

            // Add title for regular tokens
            tokenSummarySlide.addText('Token Portfolio Breakdown 📊', {
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

            // Calculate total value for regular tokens
            const totalTokenValue = regularTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

            // Prepare table data for regular tokens
            const tokenTableData = regularTokens
                .filter(token => token.usdValue > 1)
                .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
                .map(token => {
                    const percentage = ((token.usdValue / totalTokenValue) * 100).toFixed(2);
                    return [
                        { text: token.name || 'Unknown', options: { bold: true, color: '000000' } },
                        { text: token.symbol, options: { color: '000000' } },
                        { text: `$${token.usdValue.toFixed(2)}`, options: { color: '000000' } },
                        { text: `${percentage}%`, options: { color: '000000' } }
                    ];
                });

            // Add regular tokens table
            if (tokenTableData.length > 0) {
                tokenSummarySlide.addTable(
                    [
                        [
                            { text: 'Token Name', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'Symbol', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'USD Value', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'Portfolio %', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } }
                        ],
                        ...tokenTableData
                    ],
                    {
                        x: 0.5,
                        y: 0.9,
                        w: 9,
                        h: 3.0,
                        colW: [3.5, 1.5, 2, 2],
                        border: { type: 'solid', color: '000000', pt: 0.5 },
                        align: 'center',
                        valign: 'middle',
                        fontSize: 12,
                        rowH: 0.25,
                        margin: 0.05
                    }
                );

                tokenSummarySlide.addText(`Total Token Portfolio: $${totalTokenValue.toFixed(2)}`, {
                    x: 0.5,
                    y: 5.0,
                    w: 9,
                    h: 0.4,
                    fontSize: 18,
                    bold: true,
                    color: '000000',
                    align: 'center'
                });
            }

            // Before the if blocks, declare the variable
            let nftSummarySlide: any;

            // Add NFT summary slide if there are NFTs
            if (nftTokens.length > 0) {
                nftSummarySlide = pptx.addSlide();
                nftSummarySlide.background = { color: 'FFFFFF' };

                // Add title for NFTs
                nftSummarySlide.addText('NFT Portfolio Breakdown 🖼️', {
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

                // Calculate total value for NFTs
                const totalNftValue = nftTokens.reduce((sum, token) => sum + (token.usdValue || 0), 0);

                // Prepare table data for NFTs
                const nftTableData = nftTokens
                    .filter(token => token.usdValue > 0)
                    .sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
                    .map(token => {
                        const percentage = ((token.usdValue / totalNftValue) * 100).toFixed(2);
                        return [
                            { text: token.name || 'Unknown', options: { bold: true, color: '000000' } },
                            { text: token.symbol, options: { color: '000000' } },
                            { text: `$${token.usdValue.toFixed(2)}`, options: { color: '000000' } },
                            { text: `${percentage}%`, options: { color: '000000' } }
                        ];
                    });

                // Add NFT table
                nftSummarySlide.addTable(
                    [
                        [
                            { text: 'NFT Collection', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'Symbol', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'Floor Price', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } },
                            { text: 'Portfolio %', options: { bold: true, color: '000000', fill: { color: 'F5F5F5' } } }
                        ],
                        ...nftTableData
                    ],
                    {
                        x: 0.5,
                        y: 0.9,
                        w: 9,
                        h: 3.0,
                        colW: [3.5, 1.5, 2, 2],
                        border: { type: 'solid', color: '000000', pt: 0.5 },
                        align: 'center',
                        valign: 'middle',
                        fontSize: 12,
                        rowH: 0.25,
                        margin: 0.05
                    }
                );

                nftSummarySlide.addText(`Total NFT Portfolio: $${totalNftValue.toFixed(2)}`, {
                    x: 0.5,
                    y: 5.0,
                    w: 9,
                    h: 0.4,
                    fontSize: 18,
                    bold: true,
                    color: '000000',
                    align: 'center'
                });
            }

            // Add website text to both summary slides
            [tokenSummarySlide, nftSummarySlide].forEach(slide => {
                if (slide) {
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
                        shrinkText: false
                    });
                }
            });

            // Add logging before PowerPoint generation
            console.log('Starting PowerPoint generation with:', {
                tokenCount: filteredTokens.length,
                regularTokenCount: regularTokens.length,
                nftTokenCount: nftTokens.length
            });

            // Add logging for PowerPoint base64 generation
            console.log('Generating PowerPoint base64...');
            const pptxBase64 = await pptx.write({ outputType: 'base64' });
            console.log('PowerPoint base64 generated:', pptxBase64 ? 'Success' : 'Failed');

            if (!pptxBase64) {
                console.error('No base64 data received from PowerPoint generation');
                throw new Error('No base64 data received from API');
            }

            // Log before database save
            console.log('Attempting to save PowerPoint to database...');
            const powerPoint = await PowerPoint.create({
                pptxBase64,
                _id: new mongoose.Types.ObjectId()
            });
            console.log('PowerPoint saved successfully with ID:', powerPoint._id.toString());

            res.status(200).json({ id: powerPoint._id.toString() });
        } catch (error) {
            console.error('Error generating PowerPoint:', error);
            res.status(500).json({ error: 'Failed to generate PowerPoint presentation' });
        }
    } catch (error: any) {
        console.error('Detailed error information:', {
            error: error.message,
            stack: error.stack,
            name: error.name,
            code: error.code
        });

        return res.status(500).json({
            error: error.message || 'Failed to generate PowerPoint presentation',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
