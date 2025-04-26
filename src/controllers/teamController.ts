import { Request, Response } from 'express';
import { Team } from '../models/Team';
import { Short } from '../models/Short';

interface ITeam {
  name: string;
  userId: any;
  eventId: any;
  shorts: any[];
  createdAt: Date;
  updatedAt: Date;
}

export const getUserTeams = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { eventId } = req.query;
    
    const query: any = { userId };
    if (eventId) {
      query.eventId = eventId;
    }

    const teams = await Team.find(query)
      .populate('eventId')
      .populate('shorts');
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ message: 'Error fetching teams' });
  }
};

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { eventId, shorts } = req.body;
    const userId = (req as any).user.userId;

    const validShorts = await Short.find({
      _id: { $in: shorts },
    });
    
    if (validShorts.length !== shorts.length) {
      console.log('Invalid shorts selection'); 
      res.status(400).json({ message: 'Invalid shorts selection' });
      return;
    }

    // Find existing teams to determine next team number
    const existingTeams = await Team.find({ userId, eventId });
    const teamNumbers = existingTeams
      .map(team => {
        const match = (team as unknown as ITeam).name.match(/^T(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));

    const nextTeamNumber = teamNumbers.length > 0 ? Math.max(...teamNumbers) + 1 : 1;
    const teamName = `T${nextTeamNumber}`;

    const team = new Team({
      userId,
      eventId,
      name: teamName,
      shorts
    });

    await team.save();

    res.status(201).json({
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Error creating team' });
  }
};

export const getTeams = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const teams = await Team.find({ userId })
      .populate('eventId')
      .populate('shorts');
    
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Error fetching teams' });
  }
};

export const getTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user.userId;

    const team = await Team.findOne({ _id: teamId, userId })
      .populate('eventId')
      .populate('shorts');
    
    if (!team) {
      res.status(404).json({ message: 'Team not found' });
      return;
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Error fetching team' });
  }
}; 