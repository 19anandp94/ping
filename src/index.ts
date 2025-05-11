import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import eventRoutes from './routes/eventRoutes';
import teamRoutes from './routes/teamRoutes';
import referralRoutes from './routes/referralRoutes';
import { startContestCron } from './services/contestService';
import { startYoutubeCron } from './services/youtubeService';
import { startEventCron } from './services/eventCronService';
import { startLatestStatsCron } from './services/latestStatsCronService';
import { startTeamScoreCron } from './services/teamScoreCronService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ping';

// Middleware
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/referral', referralRoutes);

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start the event cron job after successful database connection
    // startEventCron();
    // Start the contest cron job after successful database connection
    // startContestCron();
    // Start the YouTube cron job after successful database connection
    // startYoutubeCron();
    startEventCron();
    startLatestStatsCron();
    startTeamScoreCron();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

app.get('/', (req: Request, res: Response) => {
  res.send('Hello TypeScript + Node.js!');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
