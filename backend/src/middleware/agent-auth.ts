import type { RequestHandler } from 'express';
import { ERROR_CODES, type Character } from '@deadwood/shared';
import { getCharacterByApiKey } from '../services/character.js';

// Extend Express Request to include agent
declare global {
  namespace Express {
    interface Request {
      agent?: Character;
    }
  }
}

/**
 * Middleware to authenticate agent via Bearer token
 */
export const agentAuth: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      ok: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Missing or invalid Authorization header',
      },
    });
    return;
  }

  const token = authHeader.slice(7); // Remove 'Bearer '

  const character = getCharacterByApiKey(token);

  if (!character) {
    res.status(401).json({
      ok: false,
      error: {
        code: ERROR_CODES.UNAUTHORIZED,
        message: 'Invalid API key',
      },
    });
    return;
  }

  if (character.status === 'dead') {
    res.status(404).json({
      ok: false,
      error: {
        code: ERROR_CODES.CHARACTER_DEAD,
        message: 'Your character is dead. Register a new one.',
      },
    });
    return;
  }

  req.agent = character;
  next();
};
