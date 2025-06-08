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

const transcriptEntrySchema = new mongoose.Schema({
  timestamp: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
});

const topicMentionSchema = new mongoose.Schema({
  timestamp: {
    type: String,
    required: true,
  },
  context: {
    type: String,
    required: true,
  },
});

const topicSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  mentions: [topicMentionSchema],
});

const videoAnalysisSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
    unique: true,
  },
  summary: {
    type: String,
    required: false,
  },
  main_points: [mainPointSchema],
  transcript: [transcriptEntrySchema],
  topics: [topicSchema],
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