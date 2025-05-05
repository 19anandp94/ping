import mongoose from 'mongoose';

const eventStatsSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  shortId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short',
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const EventStats = mongoose.model('EventStats', eventStatsSchema);

export default EventStats; 