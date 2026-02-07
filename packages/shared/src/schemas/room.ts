import { z } from 'zod';
import { ROOMS, DAY_PHASES } from '../constants.js';
import { CharacterPublicSchema } from './character.js';

export const RoomSchema = z.object({
  id: z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL]),
  name: z.string(),
  description: z.string(),
  exits: z.array(z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL])),
  items: z.array(z.string()),
  isSafeZone: z.boolean(),
  characters: z.array(CharacterPublicSchema),
});

// Room state for observe endpoint with additional context
export const RoomStateSchema = z.object({
  id: z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL]),
  name: z.string(),
  description: z.string(),
  timeOfDay: z.enum(DAY_PHASES),
  characters: z.array(
    CharacterPublicSchema.extend({
      activity: z.string().optional(),
    })
  ),
  items: z.array(z.string()),
  exits: z.array(z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL])),
  recentEvents: z.array(
    z.object({
      tick: z.number(),
      narrative: z.string(),
    })
  ),
});

export type Room = z.infer<typeof RoomSchema>;
export type RoomState = z.infer<typeof RoomStateSchema>;
