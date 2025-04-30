import mongoose from 'mongoose';

const contestParticipationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    required: true
  },
  teams: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      required: true
    },
    teamName: {
      type: String,
      required: true
    },
    score: {
      type: Number,
      default: 0
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Drop the existing unique index if it exists
contestParticipationSchema.index({ userId: 1, contestId: 1 }, { unique: false });

export const ContestParticipation = mongoose.model('ContestParticipation', contestParticipationSchema); 