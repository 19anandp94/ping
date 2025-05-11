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
  updatedView: {
    type: Number,
    default: 0
  },
  updatedLike: {
    type: Number,
    default: 0
  },
  updatedComment: {
    type: Number,
    default: 0
  },
  shortScore: {
    type: Number,
    default: 0
  },
  counter: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const EventStats = mongoose.model('EventStats', eventStatsSchema);

export default EventStats; 