import { Router } from 'express';
import { getAllRooms } from '../services/room.js';
import { getInGameTime } from '../engine/time.js';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

// Get all rooms
router.get('/rooms', (_req, res) => {
  const rooms = getAllRooms();

  success(res, {
    data: {
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        exits: r.exits,
        isSafeZone: r.isSafeZone,
      })),
    },
  });
});

// Get current time
router.get('/time', (_req, res) => {
  const tick = store.getTick();
  const { hours, minutes, formatted, dayPhase } = getInGameTime(tick);

  success(res, {
    data: {
      tick,
      hours,
      minutes,
      inGameTime: formatted,
      dayPhase,
    },
  });
});

export default router;
