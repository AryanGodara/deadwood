import { Router } from 'express';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

router.get('/', (_req, res) => {
  const bounties = store.getActiveBounties();

  success(res, {
    data: {
      bounties: bounties.map((b) => ({
        id: b.id,
        target: b.targetName,
        amount: b.amount,
        reason: b.reason,
        postedBy: b.postedBy,
        postedAt: b.postedAt,
      })),
    },
  });
});

export default router;
