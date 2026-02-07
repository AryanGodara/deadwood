import { Router } from 'express';
import { ActionSchema } from '@deadwood/shared';
import { agentAuth } from '../middleware/agent-auth.js';
import { rateLimitAction } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { processAction } from '../services/action.js';
import { store } from '../store/index.js';
import { success, error } from '../lib/response.js';

const router = Router();

router.post(
  '/',
  agentAuth,
  rateLimitAction,
  validate(ActionSchema),
  async (req, res, next) => {
    try {
      const agent = req.agent!;
      const { action, params } = req.body;
      const tick = store.getTick();

      const result = await processAction(agent, action, params || {}, tick);

      if (result.success) {
        success(res, {
          data: {
            narrative: result.narrative,
            effects: result.effects,
            tick,
          },
        });
      } else {
        error(res, {
          code: result.errorCode || 'ACTION_FAILED',
          message: result.narrative,
          status: result.errorCode === 'TARGET_NOT_FOUND' ? 404 : 400,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

export default router;
