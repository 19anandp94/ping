import express from 'express';
import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Contest } from '../models/Contest';
import { Short } from '../models/Short';
import EventStats from '../models/EventStats';
import { ContestParticipation } from '../models/ContestParticipation';
import { Team } from '../models/Team';
import { authenticate } from '../middleware/auth';
import { fetchVideosByCategory, getCategoryMapping, categoryMapping, getVideoStats } from '../services/youtubeService';

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

    res.status(200).json(participations);
  } catch (error) {
    console.error('Error joining contest:', error);
    res.status(500).json({ message: 'Error joining contest' });
  }
}) as express.RequestHandler);

// Create a new event
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { name, timeStart, description, imageUrl } = req.body;
    const userId = (req as any).user.userId;
    console.log('req.body',req.body);
    // Validate required fields
    console.log('current time',new Date().getTime());
    console.log('timeStart',new Date(timeStart).getTime());
    
    // Calculate time difference in milliseconds
    const timeDiff = new Date(timeStart).getTime() - new Date().getTime();
    
    // Convert to days, hours, minutes, seconds
    // const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    // const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    // const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    // const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    // Format timeLeft string
    // const timeLeft = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    let timeLeft = timeStart;
    if (!name || timeDiff <= 0) {
      console.log('name',name);
      res.status(400).json({ message: 'Name and valid future time are required fields' });
      return;
    }

    // Create new event
    const event = new Event({
      name,
      timeLeft,
      description,
      imageUrl,
      status: 'upcoming'
    });

    await event.save();

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ message: 'Error creating event' });
  }
});

// Create a new contest
router.post('/contests', authenticate, (async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      eventId,
      title,
      prize,
      description,
      entryFee,
      maxParticipants,
      status
    } = req.body;
    console.log('req.body',req.body);
    // Validate required fields
    if (!eventId || !title || !prize || !description || !entryFee || !maxParticipants) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // Validate event exists
    const event = await Event.findById(eventId);
    console.log('event',event);
    if (!event) {
      console.log('event not foundfffff');
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    // Create new contest
    const contest = new Contest({
      eventId,
      title,
      prize,
      description,
      entryFee: Number(entryFee),
      maxParticipants: Number(maxParticipants),
      currentParticipants: 0,
      status: status || 'open'
    });

    await contest.save();

    res.status(201).json(contest);
  } catch (error) {
    console.error('Error creating contest:', error);
    res.status(500).json({ message: 'Error creating contest' });
  }
}) as express.RequestHandler);

// Get videos by category and region and save to Short model
router.post('/videos/category/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { regionCode = 'IN' } = req.query;
    const { eventId } = req.body;

    if (!categoryId) {
      res.status(400).json({ message: 'Category ID is required' });
      return;
    }

    if (!eventId) {
      res.status(400).json({ message: 'Event ID is required' });
      return;
    }

    // Check if event exists
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({ message: 'Event not found' });
      return;
    }

    const videos = await fetchVideosByCategory(categoryId, regionCode as string);
    
    // Transform videos to match the Short model format
    const shortsToCreate = videos.map(video => {
      const categoryInfo = video.snippet?.categoryId 
        ? getCategoryMapping(video.snippet.categoryId) 
        : categoryMapping['default'];
      
      return {
        eventId,
        title: video.snippet?.title || 'Untitled Video',
        views: parseInt(video.statistics?.viewCount) || 0,
        emoji: categoryInfo.emoji,
        color: categoryInfo.color,
        videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        thumbnailUrl: video.snippet?.thumbnails?.high?.url || '',
        likes: parseInt(video.statistics?.likeCount) || 0,
        comments: parseInt(video.statistics?.commentCount) || 0
      };
    });

    // Save shorts to database
    const savedShorts = await Short.insertMany(shortsToCreate);

    res.json({
      message: 'Videos fetched and saved successfully',
      shorts: savedShorts
    });
  } catch (error) {
    console.error('Error fetching and saving videos:', error);
    res.status(500).json({ message: 'Error fetching and saving videos' });
  }
});

// Update event statistics
router.post('/update/eventstats', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.query;

    if (!eventId) {
      return res.status(400).json({ message: 'Event ID is required' });
    }

    // Get all shorts for the event
    const shorts = await Short.find({ eventId });

    if (!shorts || shorts.length === 0) {
      return res.status(404).json({ message: 'No shorts found for this event' });
    }

    // Process each short
    const results = await Promise.all(shorts.map(async (short) => {
      try {
        // Get YouTube stats
        const stats = await getVideoStats(short.videoUrl);
        
        if (!stats) {
          return {
            shortId: short._id,
            success: false,
            error: 'Failed to fetch YouTube stats'
          };
        }

        // Update short with new stats
        short.views = stats.views;
        short.likes = stats.likes;
        short.comments = stats.comments;
        await short.save();

        // Create or update EventStats entry
        const eventStats = await EventStats.findOneAndUpdate(
          { eventId, shortId: short._id },
          {
            eventId,
            shortId: short._id,
            videoUrl: short.videoUrl,
            views: stats.views,
            likes: stats.likes,
            comments: stats.comments,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );

        return {
          shortId: short._id,
          success: true,
          stats: {
            views: stats.views,
            likes: stats.likes,
            comments: stats.comments
          }
        };
      } catch (error) {
        console.error(`Error processing short ${short._id}:`, error);
        return {
          shortId: short._id,
          success: false,
          error: error.message
        };
      }
    }));

    res.json({
      message: 'Event stats updated successfully',
      results
    });
  } catch (error) {
    console.error('Error updating event stats:', error);
    res.status(500).json({ message: 'Error updating event stats' });
  }
});

export default router; 