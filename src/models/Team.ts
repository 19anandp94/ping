import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
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

// Drop old index and create new compound index
// const initIndexes = async () => {
//   try {
//     await mongoose.connection.db.collection('teams').dropIndex('userId_1');
//   } catch (error) {
//     // Index might not exist, which is fine
//   }
//   teamSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// };

// // Call initIndexes when the model is first used
// initIndexes();

// Update the updatedAt field before saving
teamSchema.pre('save', async function(next) {
  this.updatedAt = new Date();
  
  // Check if this is a new team
  if (this.isNew) {
    const MAX_TEAMS_PER_EVENT = 5; // Maximum number of teams allowed per event
    const existingTeams = await mongoose.model('Team').countDocuments({
      userId: this.userId,
      eventId: this.eventId
    });

    if (existingTeams >= MAX_TEAMS_PER_EVENT) {
      const error = new Error(`Maximum of ${MAX_TEAMS_PER_EVENT} teams allowed per event`);
      return next(error);
    }
  }
  
  next();
});

export const Team = mongoose.model('Team', teamSchema); 