import { Router } from 'express';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

router.get('/', (_req, res) => {
  const dead = store.getDeadCharacters();

  success(res, {
    data: {
      characters: dead.map((c) => ({
        name: c.name,
        role: c.role,
        backstory: c.backstory,
        causeOfDeath: c.causeOfDeath,
        diedAt: c.diedAt,
        reputation: c.reputation,
      })),
    },
  });
});

export default router;
