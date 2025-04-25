import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  timeLeft: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'upcoming', 'completed'],
    default: 'upcoming',
  },
  description: String,
  imageUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Event = mongoose.model('Event', eventSchema); 