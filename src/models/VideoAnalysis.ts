import mongoose from 'mongoose';

const mainPointSchema = new mongoose.Schema({
  timestamp: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

const videoAnalysisSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
    unique: true,
  },
  summary: {
    type: String,
    required: true,
  },
  main_points: [mainPointSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
videoAnalysisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.VideoAnalysis || mongoose.model('VideoAnalysis', videoAnalysisSchema); 