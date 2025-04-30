import express from 'express';
import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Contest } from '../models/Contest';
import { Short } from '../models/Short';
import { ContestParticipation } from '../models/ContestParticipation';
import { Team } from '../models/Team';
import { authenticate } from '../middleware/auth';

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

// Get detailed event information
router.get('/:eventId', (async (req: Request, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Get contests for this event
    const contests = await Contest.find({ 
      eventId,
      status: 'open'
    }).sort({ createdAt: -1 });

    // Get shorts for this event
    const shorts = await Short.find({ eventId })
      .sort({ views: -1 });

    res.json({
      event,
      contests,
      shorts
    });
  } catch (error) {
    console.error('Error fetching event details:', error);
    res.status(500).json({ message: 'Error fetching event details' });
  }
}) as express.RequestHandler);

// Get contests for a specific event
router.get('/:eventId/contests', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const contests = await Contest.find({ 
      eventId,
      status: 'open'
    })
    .sort({ createdAt: -1 })
    .limit(4);
    
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

// Get user's joined contests for an event
router.get('/contests/participations/:eventId', authenticate, (async (req: Request, res: Response): Promise<void> => {
  console.log('req.params',req.params);
  try {
    const { eventId } = req.params;
    const userId = (req as any).user.userId;

    if (!eventId) {
      res.status(400).json({ message: 'Event ID is required' });
      return;
    }

    // Find all contest participations for the user in this event
    const participations = await ContestParticipation.find({ userId })
      .populate({
        path: 'contestId',
        match: { eventId },
        select: 'title prize description status'
      })
      .populate('teams.teamId', 'name');

    // Filter out participations where contestId is null and group by contest
    const groupedParticipations = participations
      .filter(p => p.contestId)
      .reduce<Record<string, { contest: any; teams: any[] }>>((acc, participation) => {
        const contestId = participation.contestId._id.toString();
        if (!acc[contestId]) {
          acc[contestId] = {
            contest: participation.contestId,
            teams: []
          };
        }
        acc[contestId].teams.push(...participation.teams);
        return acc;
      }, {});

    // Convert to array
    const result = Object.values(groupedParticipations);

    res.json(result);
  } catch (error) {
    console.error('Error fetching user contests:', error);
    res.status(500).json({ message: 'Error fetching user contests' });
  }
}) as express.RequestHandler);

// Get contest details
router.get('/contests/:contestId', async (req: Request, res: Response) => {
  try {
    const { contestId } = req.params;
    console.log('contestId',contestId);
    const contest = await Contest.findById(contestId);
    
    console.log('contest',contest);
    if (!contest) {
      res.status(404).json({ message: 'Contest not found' });
      return;
    }

    res.json(contest);
  } catch (error) {
    console.error('Error fetching contest details:', error);
    res.status(500).json({ message: 'Error fetching contest details' });
  }
});

// Save contest participation
router.post('/contests/:contestId/join', authenticate, (async (req: Request, res: Response) => {
  console.log('req.body',req.body);
  try {
    const { contestId } = req.params;
    const { teamIds, eventId } = req.body;
    const userId = (req as any).user.userId;

    console.log('userId',userId);
    // Validate required fields
    if (!userId || !teamIds || !Array.isArray(teamIds) || teamIds.length === 0 || !eventId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if contest exists and is open
    const contest = await Contest.findById(contestId);
    console.log('contest',contest);
    if (!contest) {
      return res.status(404).json({ message: 'Contest not found' });
    }
    if (contest.status !== 'open') {
      return res.status(400).json({ message: 'Contest is not open for participation' });
    }

    // Get team details
    const teams = await Team.find({ _id: { $in: teamIds }, userId, eventId });
    if (teams.length !== teamIds.length) {
      return res.status(400).json({ message: 'Invalid team selection' });
    }

    console.log('teams',teams);
    // Create new contest participation for each team
    const participations = await Promise.all(teams.map(async (team) => {
      const participation = new ContestParticipation({
        userId,
        contestId,
        teams: [{
          teamId: team._id,
          teamName: team.name,
          score: 0
        }]
      });
      await participation.save();
      return participation;
    }));

    // Update contest's current participants count
    contest.currentParticipants += teams.length;
    if (contest.currentParticipants >= contest.maxParticipants) {
      contest.status = 'full';
    }
    await contest.save();

    res.status(201).json(participations);
  } catch (error) {
    console.error('Error joining contest:', error);
    res.status(500).json({ message: 'Error joining contest' });
  }
}) as express.RequestHandler);

export default router; 