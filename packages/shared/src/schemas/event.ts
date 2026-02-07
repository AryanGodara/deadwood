import { z } from 'zod';
import { EVENT_TYPES, ROOMS } from '../constants.js';

export const EventSchema = z.object({
  id: z.string(),
  type: z.enum(EVENT_TYPES),
  tick: z.number().int(),
  room: z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL]).optional(),
  actor: z.string().optional(),
  action: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  narrative: z.string(),
  timestamp: z.number(),
});

// Simplified event for recent events list
export const RecentEventSchema = z.object({
  tick: z.number(),
  narrative: z.string(),
});

export type GameEvent = z.infer<typeof EventSchema>;
export type RecentEvent = z.infer<typeof RecentEventSchema>;
