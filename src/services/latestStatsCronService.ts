import cron from 'node-cron';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000';

// Function to update latest stats
const updateLatestStats = async () => {
  try {
    console.log('Latest stats cron job running at:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    
    const response = await axios.post(`${API_URL}/api/events/update/latest-stats`);
    console.log('Latest stats update response:', response.data);
  } catch (error) {
    console.error('Error in updateLatestStats:', error);
  }
};

// Function to start the cron job
export const startLatestStatsCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await updateLatestStats();
  });
  
  console.log('Latest stats cron job started - running every 5 minutes');
}; 