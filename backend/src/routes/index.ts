import { Router } from 'express';
import healthRouter from './health.js';
import skillsRouter from './skills.js';
import agentsRouter from './agents.js';
import observeRouter from './observe.js';
import actRouter from './act.js';
import worldRouter from './world.js';
import charactersRouter from './characters.js';
import bountiesRouter from './bounties.js';
import graveyardRouter from './graveyard.js';
import leaderboardRouter from './leaderboard.js';
import historyRouter from './history.js';

const router = Router();

// Health check
router.use('/api/health', healthRouter);
router.use('/health', healthRouter);

// Skills.md (agent onboarding)
router.use('/skills.md', skillsRouter);

// Agent API
router.use('/api/agents', agentsRouter);
router.use('/api/observe', observeRouter);
router.use('/api/act', actRouter);

// World API
router.use('/api/world', worldRouter);
router.use('/api/characters', charactersRouter);
router.use('/api/bounties', bountiesRouter);
router.use('/api/graveyard', graveyardRouter);
router.use('/api/leaderboard', leaderboardRouter);
router.use('/api/history', historyRouter);

export default router;
