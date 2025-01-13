import mongoose from 'mongoose';

const PowerPointSchema = new mongoose.Schema({
  base64Data: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expires: {
    type: Date,
    default: () => new Date(Date.now() + 7200000) // 2 hours from now
  }
});

export const PowerPoint = mongoose.models.PowerPoint || mongoose.model('PowerPoint', PowerPointSchema); 