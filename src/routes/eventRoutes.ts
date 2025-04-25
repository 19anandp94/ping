import express, { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Contest } from '../models/Contest';
import { Short } from '../models/Short';

const router = express.Router();

// Get all events
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await Event.find({ status: { $in: ['active', 'upcoming'] } })
      .sort({ createdAt: -1 })
      .limit(4);
    
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// Get contests for a specific event
router.get('/:eventId/contests', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const contests = await Contest.find({ 
      eventId,
      status: 'open'
    })
    .sort({ createdAt: -1 })
    .limit(3);
    
    res.json(contests);
  } catch (error) {
    console.error('Error fetching contests:', error);
    res.status(500).json({ message: 'Error fetching contests' });
  }
});

// Get shorts for a specific event
router.get('/:eventId/shorts', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const shorts = await Short.find({ eventId })
      .sort({ views: -1 })
      .limit(20);
    
    res.json(shorts);
  } catch (error) {
    console.error('Error fetching shorts:', error);
    res.status(500).json({ message: 'Error fetching shorts' });
  }
});

export default router; 