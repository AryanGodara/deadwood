import type { RequestHandler } from 'express';
import { ERROR_CODES } from '../shared/index.js';
import { store } from '../store/index.js';

/**
 * Middleware to enforce 1 action per tick per agent
 */
export const rateLimitAction: RequestHandler = (req, res, next) => {
  const agent = req.agent;

  if (!agent) {
    res.status(401).json({
      ok: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Not authenticated',
      },
    });
    return;
  }

  const currentTick = store.getTick();

  // Check if agent already acted this tick
  if (agent.lastActionTick === currentTick) {
    res.status(409).json({
      ok: false,
      error: {
        code: ERROR_CODES.ALREADY_ACTING,
        message: 'Already submitted an action this tick. Wait for the next tick.',
      },
    });
    return;
  }

  next();
};
