import { z } from 'zod';
import { ROLES, CHARACTER_STATUSES, ROOMS } from '../constants.js';

export const StatsSchema = z.object({
  grit: z.number().int().min(1).max(10),
  charm: z.number().int().min(1).max(10),
  cunning: z.number().int().min(1).max(10),
  luck: z.number().int().min(1).max(10),
});

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
  stats: StatsSchema,
  gold: z.number().int().min(0),
  health: z.number().int().min(0).max(100),
  reputation: z.number().int().min(0).max(100),
  wantedLevel: z.number().int().min(0).max(5),
  intoxication: z.number().int().min(0).max(10),
  currentRoom: z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL]),
  inventory: z.array(z.string()),
  status: z.enum(CHARACTER_STATUSES),
  backstory: z.string().optional(),
  isNpc: z.boolean(),
  isProtected: z.boolean().optional(),
  lastActionTick: z.number().int().optional(),
  apiKeyHash: z.string().optional(),
  agentId: z.string().optional(),
  createdAt: z.number(),
  diedAt: z.number().optional(),
  causeOfDeath: z.string().optional(),
});

// Public character info visible to other characters
export const CharacterPublicSchema = z.object({
  name: z.string(),
  role: z.enum(ROLES),
  health: z.number().int().min(0).max(100),
  reputation: z.number().int().min(0).max(100),
  wantedLevel: z.number().int().min(0).max(5),
  intoxication: z.number().int().min(0).max(10),
  status: z.enum(CHARACTER_STATUSES),
  activity: z.string().optional(),
});

// Self info for observe endpoint
export const CharacterSelfSchema = z.object({
  name: z.string(),
  role: z.enum(ROLES),
  stats: StatsSchema,
  gold: z.number().int().min(0),
  health: z.number().int().min(0).max(100),
  reputation: z.number().int().min(0).max(100),
  wantedLevel: z.number().int().min(0).max(5),
  intoxication: z.number().int().min(0).max(10),
  inventory: z.array(z.string()),
  status: z.enum(CHARACTER_STATUSES),
  backstory: z.string().optional(),
});

export type Stats = z.infer<typeof StatsSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type CharacterPublic = z.infer<typeof CharacterPublicSchema>;
export type CharacterSelf = z.infer<typeof CharacterSelfSchema>;
