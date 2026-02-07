import { Router } from 'express';
import { getLivingCharacters, getCharacterByName, getCharacterPublicInfo } from '../services/character.js';
import { success, error } from '../lib/response.js';
import { ERROR_CODES } from '@deadwood/shared';

const router = Router();

// Get all living characters
router.get('/', (_req, res) => {
  const characters = getLivingCharacters();

  success(res, {
    data: {
      characters: characters.map((c) => ({
        name: c.name,
        role: c.role,
        health: c.health,
        reputation: c.reputation,
        wantedLevel: c.wantedLevel,
        status: c.status,
        currentRoom: c.currentRoom,
        isNpc: c.isNpc,
      })),
    },
  });
});

// Get single character by name
router.get('/:name', (req, res) => {
  const character = getCharacterByName(req.params.name);

  if (!character) {
    error(res, {
      code: ERROR_CODES.TARGET_NOT_FOUND,
      message: `Character "${req.params.name}" not found`,
      status: 404,
    });
    return;
  }

  const publicInfo = getCharacterPublicInfo(character);

  success(res, {
    data: {
      ...publicInfo,
      currentRoom: character.currentRoom,
      backstory: character.backstory,
      gold: character.gold,
      isNpc: character.isNpc,
      stats: character.isNpc ? undefined : character.stats,
    },
  });
});

export default router;
