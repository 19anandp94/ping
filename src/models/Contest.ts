import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  prize: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  entryFee: {
    type: Number,
    required: true,
  },
  maxParticipants: {
    type: Number,
    required: true,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['open', 'full', 'closed'],
    default: 'open',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Contest = mongoose.model('Contest', contestSchema); 