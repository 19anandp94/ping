import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { startYoutubeCron } from './services/youtubeService';
import { startEventCron } from './services/eventCronService';
import { startLatestStatsCron } from './services/latestStatsCronService';
import { startTeamScoreCron } from './services/teamScoreCronService';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', require('./routes/eventRoutes'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start cron jobs
    startYoutubeCron();
    startEventCron();
    startLatestStatsCron();
    startTeamScoreCron();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  }); 