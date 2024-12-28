import { NextApiRequest, NextApiResponse } from 'next';
import PptxGenJS from 'pptxgenjs';

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

    // Set fun default styling
    pptx.defineLayout({ name: 'FUNKY', width: 10, height: 5.625 });
    pptx.layout = 'FUNKY';

    // Fun background colors for slides
    const bgColors = ['#FF69B4', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C', '#FF7F50', '#00CED1'];

    // Add a title slide with gradient
    const titleSlide = pptx.addSlide();
    titleSlide.background = { 
      color: '#FF69B4'
    };

    // Adjust title position and size
    titleSlide.addText('🚀 Investment Thesis 💰', {
      x: 0.5,
      y: 0.8,  // Moved down slightly
      w: 9,
      h: 0.8,  // Reduced height to prevent overlap
      fontSize: 44,
      bold: true,
      color: '#FFFFFF',
      align: 'center',
      glow: { size: 10, color: '#FF69B4', opacity: 0.5 }
    });

    // Split thesis into sentences for distribution
    const thesisSentences = thesis.split(/[.!?]+/).filter(Boolean).map((s: string) => s.trim());
    
    // Adjust thesis overview position and size
    titleSlide.addText(thesis, {
      x: 0.5,
      y: 2.2,  // Moved down to create more space from title
      w: 9,
      h: 2.5,  // Increased height for better text wrapping
      fontSize: 16,
      color: '#FFFFFF',
      align: 'center',
      italic: true,
      breakLine: true,  // Enable text wrapping
      lineSpacing: 20,  // Add space between lines
    });

    // Add token data slides with distributed thesis parts
    tokens.slice(0, 10).forEach((token: any, index: number) => {
      const slide = pptx.addSlide();
      
      // Rotate through background colors
      slide.background = { color: bgColors[index % bgColors.length] };

      // Add fun emoji based on token value trend
      const trendEmoji = token.usdValue > 100 ? '🤑' : token.usdValue > 50 ? '😊' : '🤔';
      
      // Adjust token name position
      slide.addText(`${trendEmoji} ${token.name || 'Unknown'} ${trendEmoji}`, {
        x: 0.5,
        y: 0.5,  // Moved slightly down
        w: 9,
        h: 0.8,  // Fixed height
        fontSize: 32,
        bold: true,
        color: '#FFFFFF',
        align: 'center',
        glow: { size: 5, color: '#FFFFFF', opacity: 0.5 }
      });

      // Adjust details box position and size
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5,
        y: 1.5,  // Moved down
        w: 9,
        h: 1.8,  // Increased height
        fill: { color: 'rgba(255,255,255,0.9)' },
        line: { color: '#FFFFFF', width: 2 },
      });

      // Adjust details text position
      slide.addText([
        { text: '💎 Symbol: ', options: { bold: true } },
        { text: token.symbol, options: { bold: false } },
        { text: '\n💰 USD Value: ', options: { bold: true } },
        { text: `$${token.usdValue.toFixed(2)}`, options: { bold: false } }
      ], {
        x: 1,
        y: 1.7,  // Adjusted to match shape
        w: 8,
        h: 1.4,  // Fixed height
        fontSize: 20,
        color: '#000000',
        lineSpacing: 30,  // Add space between lines
      });

      // Adjust thesis sentence position
      if (thesisSentences[index]) {
        slide.addText(`💡 ${thesisSentences[index]}`, {
          x: 0.5,
          y: 3.6,  // Moved down to avoid overlap
          w: 9,
          h: 1.5,  // Fixed height
          fontSize: 16,
          color: '#FFFFFF',
          align: 'center',
          italic: true,
          glow: { size: 3, color: '#FFFFFF', opacity: 0.3 },
          breakLine: true,  // Enable text wrapping
          lineSpacing: 20,  // Add space between lines
        });
      }
    });

    // Generate PowerPoint as a base64 string
    const pptxBase64 = await pptx.write({ outputType: 'base64' });

    res.status(200).json({ pptxBase64 });
  } catch (error) {
    console.error('Error generating PowerPoint:', error);
    res.status(500).json({ error: 'Failed to generate PowerPoint presentation' });
  }
}
