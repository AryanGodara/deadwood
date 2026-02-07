import { Router } from 'express';
import type { RoomId } from '@deadwood/shared';
import { store } from '../store/index.js';
import { success } from '../lib/response.js';

const router = Router();

router.get('/', (req, res) => {
  const room = req.query.room as RoomId | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  let events;

  if (room) {
    events = store.getEventsByRoom(room, Math.min(limit, 100));
  } else {
    events = store.getAllEvents(Math.min(limit, 100));
  }

  success(res, {
    data: {
      room: room || 'all',
      events: events.map((e) => ({
        id: e.id,
        type: e.type,
        tick: e.tick,
        room: e.room,
        actor: e.actor,
        action: e.action,
        narrative: e.narrative,
        timestamp: e.timestamp,
      })),
    },
  });
});

export default router;
