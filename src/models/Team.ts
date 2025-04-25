import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shorts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Short'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
teamSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Team = mongoose.model('Team', teamSchema); 