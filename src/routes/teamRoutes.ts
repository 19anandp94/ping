import express from 'express';
import { createTeam, getTeams, getTeam, getUserTeams } from '../controllers/teamController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get user's teams
router.get('/user', authenticate, getUserTeams);

// Create a new team
router.post('/', authenticate, createTeam);

// Get all teams for the authenticated user
router.get('/', authenticate, getTeams);

// Get a specific team
router.get('/:teamId', authenticate, getTeam);

export default router; 