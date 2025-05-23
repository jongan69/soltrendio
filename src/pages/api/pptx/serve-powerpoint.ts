import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { PowerPoint } from '../../../models/PowerPoint';
import { connectDB } from '../../../utils/mongooseDb';

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '50mb',
      responseLimit: false
    }
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  try {
    await connectDB();
    console.log('MongoDB connection established');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    return res.status(500).json({ error: 'Database connection failed' });
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