import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import sharp from 'sharp';

async function createBackgroundMask(imageBuffer: Buffer): Promise<Buffer> {
    // Create a grayscale version for analysis with enhanced contrast   
    const grayscale = await sharp(imageBuffer)
        .grayscale()
        .normalize() // Normalize the contrast
        .modulate({
            brightness: 1.1, // Slightly increase brightness
            saturation: 1.2  // Increase saturation for better edge detection
        })
        .blur(1.5) // Slightly reduced blur for sharper edges
        .toBuffer();

    // Detect edges with more precise thresholding
    const edges = await sharp(grayscale)
        .threshold(140) // Adjusted threshold for better subject detection
        .toBuffer();

    // Create a mask (white for subject to be removed, black for background to keep)
    const mask = await sharp(edges)
        .extend({
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .resize(1024, 1024, { fit: 'contain' })
        .png()
        .toBuffer();

    return mask;
}

function processPrompt(prompt: string, nftName: string, attributes: any[], isCustomGeneration: boolean = false): string {
    // Replace the NAME placeholder with the NFT name
    let processedPrompt = prompt.replace(/NAME/g, nftName);
    
    if (!isCustomGeneration) {
        // For action figure transformation, use attributes as accessories
        const accessories = attributes
            .slice(0, 3)
            .map(attr => `${attr.trait_type}: ${attr.value}`);
        
        accessories.forEach((accessory, index) => {
            processedPrompt = processedPrompt.replace(
                new RegExp(`${index + 1}`),
                accessory
            );
        });
    } else {
        // For custom generation, include all attributes in the prompt
        const attributeDescriptions = attributes
            .map(attr => `${attr.trait_type}: ${attr.value}`)
            .join(', ');
        
        processedPrompt = `${processedPrompt} The character has the following attributes: ${attributeDescriptions}.`;
    }

    // Add a style guide to ensure high quality and consistency
    processedPrompt += " I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS.";
    
    return processedPrompt;
}

async function generateMaskImage(prompt: string): Promise<Buffer> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            response_format: 'url'
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
    }

    // Fetch the generated image and convert it to a buffer
    const imageResponse = await fetch(data.data[0].url);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Process the image to ensure it's a PNG and suitable for masking
    const processedBuffer = await sharp(Buffer.from(imageBuffer))
        .grayscale() // Convert to grayscale for better masking
        .normalize() // Normalize the contrast
        .threshold(128) // Create a binary mask
        .ensureAlpha() // Ensure RGBA format
        .png()
        .toBuffer();

    return processedBuffer;
}

async function editWithGeneratedMask(imageUrl: string, prompt: string): Promise<string> {
    // Fetch the original NFT image
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    
    // Process the original image
    let processedImageBuffer;
    try {
        processedImageBuffer = await sharp(Buffer.from(imageBuffer))
            .png()
            .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
            .toBuffer();
            
        if (processedImageBuffer.length > 4 * 1024 * 1024) {
            processedImageBuffer = await sharp(Buffer.from(processedImageBuffer))
                .png({ compressionLevel: 9 })
                .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
                .toBuffer();
        }
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error('Failed to process image. Please try a different image.');
    }
    
    // Create a mask to isolate the subject
    const subjectMask = await createBackgroundMask(Buffer.from(processedImageBuffer));
    
    // Extract just the subject using the mask and ensure RGBA format
    const subjectBuffer = await sharp(Buffer.from(processedImageBuffer))
        .composite([{
            input: subjectMask,
            blend: 'dest-in'
        }])
        .ensureAlpha() // Ensure RGBA format
        .png()
        .toBuffer();
    
    // Generate the reference mask image using DALL-E 3
    const referenceMask = await generateMaskImage(prompt);
    
    // Create FormData for the edit request
    const formData = new FormData();
    formData.append('model', 'dall-e-2');
    formData.append('image', new Blob([subjectBuffer], { type: 'image/png' }), 'nft.png');
    formData.append('mask', new Blob([referenceMask], { type: 'image/png' }), 'mask.png');
    formData.append('prompt', prompt);
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    
    // Make request to OpenAI API
    const response = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: formData
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
    }
    
    return data.data[0].url;
}

async function generateCustomImage(prompt: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'hd',
            response_format: 'url'
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    if (!data.data || data.data.length === 0) {
        throw new Error('No image generated');
    }

    return data.data[0].url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { imageUrl, prompt, nftName, attributes, isCustomGeneration } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Process the prompt with the NFT name and attributes
        const processedPrompt = processPrompt(
            prompt,
            nftName || 'NFT Character',
            attributes || [],
            isCustomGeneration
        );

        let result;
        if (isCustomGeneration) {
            // For custom generation, use DALL-E 3 to create a completely new image
            result = await generateCustomImage(processedPrompt);
        } else {
            // For action figure transformation, use the edit endpoint
            if (!imageUrl) {
                return res.status(400).json({ error: 'Image URL is required for action figure transformation' });
            }
            result = await editWithGeneratedMask(imageUrl, processedPrompt);
        }
        
        return res.status(200).json({ 
            imageUrl: result
        });
    } catch (error) {
        console.error('Error generating image:', error);
        return res.status(500).json({ error: 'Failed to generate image' });
    }
} 