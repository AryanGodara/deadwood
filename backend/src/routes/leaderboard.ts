import { Router } from 'express';
import { getLivingCharacters } from '../services/character.js';
import { success } from '../lib/response.js';

const router = Router();

router.get('/', (req, res) => {
  const sortBy = (req.query.sort as string) || 'reputation';
  const characters = getLivingCharacters().filter((c) => !c.isNpc);

  let sorted: typeof characters;

  switch (sortBy) {
    case 'gold':
      sorted = [...characters].sort((a, b) => b.gold - a.gold);
      break;
    case 'wanted':
      sorted = [...characters].sort((a, b) => b.wantedLevel - a.wantedLevel);
      break;
    case 'reputation':
    default:
      sorted = [...characters].sort((a, b) => b.reputation - a.reputation);
      break;
  }

  success(res, {
    data: {
      sortedBy: sortBy,
      leaderboard: sorted.slice(0, 20).map((c, i) => ({
        rank: i + 1,
        name: c.name,
        role: c.role,
        reputation: c.reputation,
        gold: c.gold,
        wantedLevel: c.wantedLevel,
      })),
    },
  });
});

export default router;
