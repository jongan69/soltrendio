import mongoose from 'mongoose';

const PowerPointSchema = new mongoose.Schema({
  base64Data: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600 // Documents will be automatically deleted after 1 hour
  }
});

export const PowerPoint = mongoose.models.PowerPoint || mongoose.model('PowerPoint', PowerPointSchema); 