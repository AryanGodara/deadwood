import { Router } from 'express';
import { RegisterRequestSchema } from '@deadwood/shared';
import { validate } from '../middleware/validate.js';
import { registerCharacter } from '../services/character.js';
import { createEvent, broadcastGlobal } from '../services/event.js';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

router.post('/register', validate(RegisterRequestSchema), (req, res) => {
  const result = registerCharacter(req.body);

  // Broadcast world announcement
  const tick = store.getTick();
  const event = createEvent({
    type: 'world_announcement',
    tick,
    narrative: `A new stranger has arrived in Deadwood: ${result.character.name}.`,
  });
  broadcastGlobal(event);

  // Return character info (without internal fields)
  success(res, {
    status: 201,
    data: {
      agentId: result.agentId,
      apiKey: result.apiKey,
      character: {
        name: result.character.name,
        role: result.character.role,
        stats: result.character.stats,
        gold: result.character.gold,
        health: result.character.health,
        reputation: result.character.reputation,
        currentRoom: result.character.currentRoom,
        inventory: result.character.inventory,
      },
    },
  });
});

export default router;
