import cron from 'node-cron';
import { Event } from '../models/Event';
import { Contest } from '../models/Contest';

// Sample contest data templates
const contestTemplates = [
  {
    title: 'Mega Contest',
    prize: '₹10,000',
    description: 'Join now!',
    entryFee: 100,
    maxParticipants: 100,
    currentParticipants: 0,
    status: 'open'
  },
  {
    title: 'Winner Takes All',
    prize: '₹5,000',
    description: 'Limited spots',
    entryFee: 50,
    maxParticipants: 50,
    currentParticipants: 0,
    status: 'open'
  },
  {
    title: 'Head to Head',
    prize: '₹1,000',
    description: '1v1 battle',
    entryFee: 20,
    maxParticipants: 2,
    currentParticipants: 0,
    status: 'open'
  },
  {
    title: 'Quick Win',
    prize: '₹2,000',
    description: 'Fast-paced contest',
    entryFee: 30,
    maxParticipants: 30,
    currentParticipants: 0,
    status: 'open'
  }
];

// Function to create contests for an event
const createContestsForEvent = async (eventId: string) => {
  try {
    // Check if contests already exist for this event
    const existingContests = await Contest.find({ eventId });
    
    if (existingContests.length === 0) {
      // Create contests for this event
      const contestsToCreate = contestTemplates.map(template => ({
        ...template,
        eventId
      }));
      
      await Contest.insertMany(contestsToCreate);
      console.log(`Contests created for event ${eventId}`);
    }
  } catch (error) {
    console.error(`Error creating contests for event ${eventId}:`, error);
  }
};

// Function to initialize contests for all events
const initializeContests = async () => {
  try {
    const events = await Event.find({});
    
    for (const event of events) {
      await createContestsForEvent(event._id.toString());
    }
    
    console.log('Contests initialized successfully');
  } catch (error) {
    console.error('Error initializing contests:', error);
  }
};

// Function to update contest status based on participants
const updateContestStatus = async () => {
  try {
    const contests = await Contest.find({ status: 'open' });
    
    for (const contest of contests) {
      if (contest.currentParticipants >= contest.maxParticipants) {
        await Contest.findByIdAndUpdate(contest._id, { status: 'full' });
      }
    }
    
    console.log('Contest statuses updated successfully');
  } catch (error) {
    console.error('Error updating contest statuses:', error);
  }
};

// Function to start the cron job
export const startContestCron = () => {
  // Initialize contests on startup
  initializeContests();
  
  // Update contest statuses every minute
  cron.schedule('* * * * *', async () => {
    await updateContestStatus();
  });
  
  // Reset contests daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      await Contest.deleteMany({});
      await initializeContests();
      console.log('Contests reset successfully');
    } catch (error) {
      console.error('Error resetting contests:', error);
    }
  });
}; 