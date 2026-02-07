import { Router } from 'express';
import { store } from '../store/index.js';
import { getInGameTime } from '../engine/time.js';
import { getAgentCount, getNpcCount } from '../services/character.js';

const router = Router();

router.get('/', (_req, res) => {
  const worldState = store.getWorldState();
  const tick = store.getTick();
  const { formatted, dayPhase } = getInGameTime(tick);

  res.json({
    ok: true,
    data: {
      status: worldState.isPaused ? 'degraded' : 'healthy',
      tick,
      inGameTime: formatted,
      dayPhase,
      agentCount: getAgentCount(),
      npcCount: getNpcCount(),
      uptime: Date.now() - worldState.startedAt,
      version: '1.0.0',
    },
  });
});

export default router;
