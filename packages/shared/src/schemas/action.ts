import { z } from 'zod';
import { ROOMS } from '../constants.js';

// Social actions
const SayActionSchema = z.object({
  action: z.literal('say'),
  params: z.object({
    text: z.string().min(1).max(500),
  }),
});

const WhisperActionSchema = z.object({
  action: z.literal('whisper'),
  params: z.object({
    target: z.string().min(1),
    text: z.string().min(1).max(500),
  }),
});

const EmoteActionSchema = z.object({
  action: z.literal('emote'),
  params: z.object({
    text: z.string().min(1).max(200),
  }),
});

const LookActionSchema = z.object({
  action: z.literal('look'),
  params: z
    .object({
      target: z.string().optional(),
    })
    .optional(),
});

// Movement
const MoveActionSchema = z.object({
  action: z.literal('move'),
  params: z.object({
    room: z.enum([ROOMS.SALOON, ROOMS.STREET, ROOMS.JAIL]),
  }),
});

// Commerce
const BuyActionSchema = z.object({
  action: z.literal('buy'),
  params: z.object({
    item: z.string().min(1),
  }),
});

const SellActionSchema = z.object({
  action: z.literal('sell'),
  params: z.object({
    item: z.string().min(1),
  }),
});

const GiveActionSchema = z.object({
  action: z.literal('give'),
  params: z.object({
    target: z.string().min(1),
    item: z.string().min(1),
  }),
});

const PayActionSchema = z.object({
  action: z.literal('pay'),
  params: z.object({
    target: z.string().min(1),
    amount: z.number().int().positive(),
  }),
});

// Combat
const ChallengeActionSchema = z.object({
  action: z.literal('challenge'),
  params: z.object({
    target: z.string().min(1),
  }),
});

const AcceptActionSchema = z.object({
  action: z.literal('accept'),
  params: z.object({}).optional(),
});

const DeclineActionSchema = z.object({
  action: z.literal('decline'),
  params: z.object({}).optional(),
});

const ShootActionSchema = z.object({
  action: z.literal('shoot'),
  params: z.object({
    target: z.string().min(1),
  }),
});

const PunchActionSchema = z.object({
  action: z.literal('punch'),
  params: z.object({
    target: z.string().min(1),
  }),
});

// Role-specific
const ArrestActionSchema = z.object({
  action: z.literal('arrest'),
  params: z.object({
    target: z.string().min(1),
  }),
});

const PostBountyActionSchema = z.object({
  action: z.literal('post_bounty'),
  params: z.object({
    target: z.string().min(1),
    amount: z.number().int().positive(),
    reason: z.string().min(1).max(200),
  }),
});

const CollectBountyActionSchema = z.object({
  action: z.literal('collect_bounty'),
  params: z.object({
    target: z.string().min(1),
  }),
});

const HealActionSchema = z.object({
  action: z.literal('heal'),
  params: z.object({
    target: z.string().min(1),
  }),
});

const BartendActionSchema = z.object({
  action: z.literal('bartend'),
  params: z.object({
    target: z.string().min(1),
    drink: z.string().min(1),
  }),
});

const MineActionSchema = z.object({
  action: z.literal('mine'),
  params: z.object({}).optional(),
});

// Meta
const WaitActionSchema = z.object({
  action: z.literal('wait'),
  params: z.object({}).optional(),
});

const SleepActionSchema = z.object({
  action: z.literal('sleep'),
  params: z.object({}).optional(),
});

// Discriminated union of all actions
export const ActionSchema = z.discriminatedUnion('action', [
  SayActionSchema,
  WhisperActionSchema,
  EmoteActionSchema,
  LookActionSchema,
  MoveActionSchema,
  BuyActionSchema,
  SellActionSchema,
  GiveActionSchema,
  PayActionSchema,
  ChallengeActionSchema,
  AcceptActionSchema,
  DeclineActionSchema,
  ShootActionSchema,
  PunchActionSchema,
  ArrestActionSchema,
  PostBountyActionSchema,
  CollectBountyActionSchema,
  HealActionSchema,
  BartendActionSchema,
  MineActionSchema,
  WaitActionSchema,
  SleepActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

// Individual action types for convenience
export type SayAction = z.infer<typeof SayActionSchema>;
export type WhisperAction = z.infer<typeof WhisperActionSchema>;
export type EmoteAction = z.infer<typeof EmoteActionSchema>;
export type LookAction = z.infer<typeof LookActionSchema>;
export type MoveAction = z.infer<typeof MoveActionSchema>;
export type ShootAction = z.infer<typeof ShootActionSchema>;
export type PunchAction = z.infer<typeof PunchActionSchema>;
export type ChallengeAction = z.infer<typeof ChallengeActionSchema>;
