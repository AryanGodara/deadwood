import { z } from 'zod';
import { VISITOR_ROLES } from '../constants.js';
import { CharacterSchema } from './character.js';

export const RegisterRequestSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be at most 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  preferredRole: z.enum(VISITOR_ROLES).optional(),
  backstory: z.string().max(500, 'Backstory must be at most 500 characters').optional(),
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
    .optional(),
});

export const RegisterResponseSchema = z.object({
  agentId: z.string(),
  apiKey: z.string(),
  character: CharacterSchema,
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
