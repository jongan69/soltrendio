import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { PowerPoint } from '../../../models/PowerPoint';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '50mb'
    }
  },
}

// MongoDB connection
const connectDB = async () => {
  if (mongoose.connections[0].readyState) return;

  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  try {
    await connectDB();
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return res.status(500).json({ error: 'Database connection failed' });
  }

  if (req.method === 'POST') {
    try {
      console.log('Processing POST request');
      const { base64Data } = req.body;
      
      if (!base64Data) {
        console.error('No base64Data provided in request body');
        return res.status(400).json({ error: 'No base64Data provided' });
      }

      console.log('Creating new PowerPoint document, base64 length:', base64Data.length);
      
      // Create new PowerPoint document
      const powerPoint = await PowerPoint.create({ 
        base64Data,
        _id: new mongoose.Types.ObjectId() // Explicitly create a MongoDB ObjectId
      });
      
      console.log('PowerPoint document created with ID:', powerPoint._id.toString());
      return res.status(200).json({ id: powerPoint._id.toString() });
    } catch (error) {
      console.error('Error storing PowerPoint:', error);
      return res.status(500).json({ error: 'Failed to store PowerPoint' });
    }
  }
  
  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      console.log('Processing GET request for ID:', id);
      
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(id as string)) {
        console.error('Invalid ObjectId format:', id);
        return res.status(400).json({ error: 'Invalid ID format' });
      }

      console.log('Looking up PowerPoint document...');
      // Find PowerPoint document
      const powerPoint = await PowerPoint.findById(new mongoose.Types.ObjectId(id as string));
      
      if (!powerPoint) {
        console.error('PowerPoint document not found for ID:', id);
        return res.status(404).json({ error: 'PowerPoint not found' });
      }
      
      console.log('PowerPoint document found, base64 length:', powerPoint.base64Data.length);
      
      // Set headers for PowerPoint file
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', 'inline; filename="presentation.pptx"');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Log headers
      console.log('Response headers set:', res.getHeaders());
      
      // Convert base64 to buffer and send
      const buffer = Buffer.from(powerPoint.base64Data, 'base64');
      console.log('Buffer created, size:', buffer.length);

      // Log the first few bytes of the buffer to verify it's a valid PowerPoint file
      console.log('First 16 bytes:', buffer.slice(0, 16));
      
      console.log('Sending response...');
      return res.send(buffer);
    } catch (error) {
      console.error('Error serving PowerPoint:', error);
      return res.status(500).json({ error: 'Failed to serve PowerPoint' });
    }
  }
  
  console.log('Method not allowed:', req.method);
  return res.status(405).end();
}