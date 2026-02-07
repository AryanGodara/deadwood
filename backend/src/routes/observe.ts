import { Router } from 'express';
import { agentAuth } from '../middleware/agent-auth.js';
import { getRoomState } from '../services/room.js';
import { getInGameTime } from '../engine/time.js';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

router.get('/', agentAuth, (req, res) => {
  const agent = req.agent!;
  const tick = store.getTick();
  const { formatted, dayPhase } = getInGameTime(tick);

  const roomState = getRoomState(agent.currentRoom, dayPhase);

  success(res, {
    data: {
      room: roomState,
      self: {
        name: agent.name,
        health: agent.health,
        gold: agent.gold,
        intoxication: agent.intoxication,
        wantedLevel: agent.wantedLevel,
        reputation: agent.reputation,
        inventory: agent.inventory,
        status: agent.status,
      },
      worldState: {
        currentTick: tick,
        inGameTime: formatted,
        dayPhase,
      },
    },
  });
});

export default router;
