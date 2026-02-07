import { z } from 'zod';
import { ERROR_CODES, DAY_PHASES } from '../constants.js';

// Response metadata
export const MetaSchema = z.object({
  tick: z.number().int(),
  inGameTime: z.string(),
  dayPhase: z.enum(DAY_PHASES),
  timestamp: z.number(),
});

// Success response envelope
export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
    meta: MetaSchema,
  });

// Error response
export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.enum([
      ERROR_CODES.INVALID_ACTION,
      ERROR_CODES.INVALID_PARAMS,
      ERROR_CODES.UNAUTHORIZED,
      ERROR_CODES.ACTION_FORBIDDEN,
      ERROR_CODES.CHARACTER_DEAD,
      ERROR_CODES.TARGET_NOT_FOUND,
      ERROR_CODES.ALREADY_ACTING,
      ERROR_CODES.IN_DUEL,
      ERROR_CODES.RATE_LIMITED,
      ERROR_CODES.WORLD_PAUSED,
    ]),
    message: z.string(),
  }),
});

// Generic API response (success or error)
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiErrorSchema]);

// Health endpoint response
export const HealthResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  tick: z.number().int(),
  inGameTime: z.string(),
  dayPhase: z.enum(DAY_PHASES),
  agentCount: z.number().int(),
  npcCount: z.number().int(),
  uptime: z.number(),
  version: z.string(),
});

// Action response
export const ActionResponseSchema = z.object({
  narrative: z.string(),
  effects: z.array(
    z.object({
      type: z.string(),
      change: z.number().optional(),
      newValue: z.unknown().optional(),
      target: z.string().optional(),
    })
  ),
  tick: z.number().int(),
});

// Observe response
export const ObserveResponseSchema = z.object({
  room: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    timeOfDay: z.enum(DAY_PHASES),
    characters: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        activity: z.string().optional(),
      })
    ),
    items: z.array(z.string()),
    exits: z.array(z.string()),
    recentEvents: z.array(
      z.object({
        tick: z.number(),
        narrative: z.string(),
      })
    ),
  }),
  self: z.object({
    name: z.string(),
    health: z.number(),
    gold: z.number(),
    intoxication: z.number(),
    wantedLevel: z.number(),
    reputation: z.number(),
    inventory: z.array(z.string()),
    status: z.string(),
  }),
  worldState: z.object({
    currentTick: z.number(),
    inGameTime: z.string(),
    dayPhase: z.enum(DAY_PHASES),
  }),
});

export type Meta = z.infer<typeof MetaSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type ActionResponse = z.infer<typeof ActionResponseSchema>;
export type ObserveResponse = z.infer<typeof ObserveResponseSchema>;
