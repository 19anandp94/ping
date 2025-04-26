import cron from 'node-cron';
import { Event } from '../models/Event';

// Sample event data
const sampleEvents = [
  {
    name: 'Mega 1',
    timeLeft: '12:30:45',
    status: 'active',
    description: 'First mega event of the day',
    imageUrl: 'https://example.com/mega1.jpg'
  },
  {
    name: 'Mega 2',
    timeLeft: '08:15:20',
    status: 'upcoming',
    description: 'Second mega event of the day',
    imageUrl: 'https://example.com/mega2.jpg'
  },
  {
    name: 'Mega 3',
    timeLeft: '05:45:30',
    status: 'upcoming',
    description: 'Third mega event of the day',
    imageUrl: 'https://example.com/mega3.jpg'
  },
  {
    name: 'Mega 4',
    timeLeft: '02:20:15',
    status: 'upcoming',
    description: 'Fourth mega event of the day',
    imageUrl: 'https://example.com/mega4.jpg'
  }
];

// Function to update time left for all events
const updateEventTimes = async () => {
  try {
    const events = await Event.find({});
    
    for (const event of events) {
      const [hours, minutes, seconds] = event.timeLeft.split(':').map(Number);
      
      let newSeconds = seconds - 1;
      let newMinutes = minutes;
      let newHours = hours;
      
      if (newSeconds < 0) {
        newSeconds = 59;
        newMinutes -= 1;
      }
      
      if (newMinutes < 0) {
        newMinutes = 59;
        newHours -= 1;
      }
      
      if (newHours < 0) {
        newHours = 23; // Reset to 23 hours when it reaches 0
      }
      
      const newTimeLeft = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
      
      await Event.findByIdAndUpdate(event._id, { timeLeft: newTimeLeft });
    }
    
    // console.log('Event times updated successfully');
  } catch (error) {
    console.error('Error updating event times:', error);
  }
};

// Function to initialize events if they don't exist
const initializeEvents = async () => {
  try {
    const count = await Event.countDocuments();
    
    if (count === 0) {
      await Event.insertMany(sampleEvents);
      console.log('Events initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing events:', error);
  }
};

// Function to start the cron job
export const startEventCron = () => {
  // Initialize events on startup
  initializeEvents();
  
  // Update event times every second
  cron.schedule('* * * * * *', async () => {
    await updateEventTimes();
  });
  
  // Reset events daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await Event.deleteMany({});
      await initializeEvents();
      console.log('Events reset successfully');
    } catch (error) {
      console.error('Error resetting events:', error);
    }
  });
}; 