import cron from 'node-cron';
import axios from 'axios';
import { Event } from '../models/Event';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Function to check and update event stats
const checkAndUpdateEventStats = async () => {
  try {
    const currentTime = new Date();
    // Convert to IST (UTC+5:30)
    const istTime = new Date(currentTime.getTime() + (5.5 * 60 * 60 * 1000));
    const formattedCurrentTime = istTime.toISOString().slice(0, 16).replace('T', ' ');
    
    console.log('Cron job running at:', istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Looking for events with timeLeft:', formattedCurrentTime);

    // Find events where timeLeft matches current time
    const events = await Event.find({ timeLeft: formattedCurrentTime });
    console.log('Found matching events:', events.length);

    // Update stats for each matching event
    for (const event of events) {
      try {
        console.log(`Processing event ${event._id} with timeLeft: ${event.timeLeft}`);
        const url = `${API_URL}/api/events/update/eventstats?eventId=${event._id}`;
        console.log('Calling API:', url);
        
        await axios.post(url);
        console.log(`Updated stats for event ${event._id}`);
      } catch (error) {
        console.error(`Error updating stats for event ${event._id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in checkAndUpdateEventStats:', error);
  }
};

// Function to start the cron job
export const startEventCron = () => {
  // Run every 3 minutes for testing
  cron.schedule('*/3 * * * *', async () => {
    console.log('Cron job triggered at:', new Date().toLocaleString());
    await checkAndUpdateEventStats();
  });
  
  console.log('Event stats cron job started - running every 3 minutes for testing');
}; 