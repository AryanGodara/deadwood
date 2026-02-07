// Tick system
export const TICK_DURATION_MS = 5000;
export const MINUTES_PER_GAME_HOUR = 1; // 1 real minute = 1 game hour

// Rooms (Phase 1)
export const ROOMS = {
  SALOON: 'rusty_spur_saloon',
  STREET: 'street',
  JAIL: 'jail',
} as const;

export type RoomId = (typeof ROOMS)[keyof typeof ROOMS];

// Room adjacency map
export const ROOM_EXITS: Record<RoomId, RoomId[]> = {
  [ROOMS.SALOON]: [ROOMS.STREET],
  [ROOMS.STREET]: [ROOMS.SALOON, ROOMS.JAIL],
  [ROOMS.JAIL]: [ROOMS.STREET],
};

// Room metadata
export const ROOM_DATA: Record<
  RoomId,
  {
    name: string;
    description: string;
    items: string[];
    isSafeZone: boolean;
  }
> = {
  [ROOMS.SALOON]: {
    name: 'The Rusty Spur Saloon',
    description:
      'Tobacco smoke and lamplight. The long oak bar stretches the length of the room. A battered piano sits in the corner, and a staircase leads to rooms upstairs.',
    items: ['whiskey bottle', 'poker cards', 'oil lamp'],
    isSafeZone: false,
  },
  [ROOMS.STREET]: {
    name: 'Main Street',
    description:
      'The dusty main road of Deadwood. Where duels happen. Where the sheriff patrols. A hitching post and water trough line one side.',
    items: ['hitching post', 'water trough'],
    isSafeZone: false,
  },
  [ROOMS.JAIL]: {
    name: 'The Jail',
    description:
      'Two cells with iron bars. Wanted posters paper the walls. A ring of keys hangs by the door.',
    items: ['wanted posters', 'keys'],
    isSafeZone: false,
  },
};

// Roles
export const ROLES = [
  'stranger',
  'businessman',
  'bounty_hunter',
  'outlaw',
  'gunslinger',
  'town_folk',
  'doctor',
  'preacher',
  'sheriff',
  'bartender',
  'piano_man',
  'madam',
] as const;

export type Role = (typeof ROLES)[number];

// Visitor roles (available for agent registration)
export const VISITOR_ROLES = [
  'stranger',
  'businessman',
  'bounty_hunter',
  'outlaw',
  'gunslinger',
  'town_folk',
  'doctor',
  'preacher',
] as const;

export type VisitorRole = (typeof VISITOR_ROLES)[number];

// Actions
export const ACTIONS = [
  'say',
  'whisper',
  'emote',
  'look',
  'move',
  'buy',
  'sell',
  'give',
  'pay',
  'challenge',
  'accept',
  'decline',
  'shoot',
  'punch',
  'arrest',
  'post_bounty',
  'collect_bounty',
  'heal',
  'bartend',
  'mine',
  'wait',
  'sleep',
] as const;

export type ActionType = (typeof ACTIONS)[number];

// Day phases
export const DAY_PHASES = ['morning', 'afternoon', 'evening', 'night'] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

// Character status
export const CHARACTER_STATUSES = [
  'idle',
  'in_duel',
  'arrested',
  'sleeping',
  'dying',
  'dead',
] as const;
export type CharacterStatus = (typeof CHARACTER_STATUSES)[number];

// Base stats per role (from GAME_DESIGN.md §3)
export const BASE_STATS: Record<VisitorRole, { grit: number; charm: number; cunning: number; luck: number }> = {
  stranger: { grit: 5, charm: 5, cunning: 5, luck: 5 },
  businessman: { grit: 3, charm: 8, cunning: 6, luck: 5 },
  bounty_hunter: { grit: 7, charm: 4, cunning: 6, luck: 5 },
  outlaw: { grit: 6, charm: 4, cunning: 8, luck: 4 },
  gunslinger: { grit: 9, charm: 3, cunning: 5, luck: 5 },
  town_folk: { grit: 4, charm: 7, cunning: 5, luck: 6 },
  doctor: { grit: 4, charm: 6, cunning: 6, luck: 6 },
  preacher: { grit: 3, charm: 8, cunning: 4, luck: 7 },
};

// Starting inventory per role
export const STARTING_INVENTORY: Record<VisitorRole, string[]> = {
  stranger: ['revolver', '6 bullets'],
  businessman: ['revolver', '6 bullets', 'ledger'],
  bounty_hunter: ['rifle', '10 bullets', 'rope'],
  outlaw: ['revolver', '6 bullets', 'bandana'],
  gunslinger: ['dual revolvers', '12 bullets'],
  town_folk: ['revolver', '6 bullets'],
  doctor: ['medical bag', 'revolver', '6 bullets'],
  preacher: ['bible', 'revolver'],
};

// Starting gold per role
export const STARTING_GOLD: Record<VisitorRole, number> = {
  stranger: 10,
  businessman: 50,
  bounty_hunter: 20,
  outlaw: 15,
  gunslinger: 20,
  town_folk: 15,
  doctor: 25,
  preacher: 10,
};

// Item prices (Phase 1)
export const ITEM_PRICES: Record<string, { buy: number; sell: number }> = {
  whiskey: { buy: 2, sell: 0 },
  beer: { buy: 1, sell: 0 },
  'bullets (6)': { buy: 3, sell: 1 },
  'medical supplies': { buy: 5, sell: 0 },
};

// Error codes (from GAME_DESIGN.md §11)
export const ERROR_CODES = {
  INVALID_ACTION: 'INVALID_ACTION',
  INVALID_PARAMS: 'INVALID_PARAMS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ACTION_FORBIDDEN: 'ACTION_FORBIDDEN',
  CHARACTER_DEAD: 'CHARACTER_DEAD',
  TARGET_NOT_FOUND: 'TARGET_NOT_FOUND',
  ALREADY_ACTING: 'ALREADY_ACTING',
  IN_DUEL: 'IN_DUEL',
  RATE_LIMITED: 'RATE_LIMITED',
  WORLD_PAUSED: 'WORLD_PAUSED',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Event types
export const EVENT_TYPES = [
  'action',
  'enter',
  'leave',
  'combat',
  'duel_challenge',
  'duel_result',
  'ambient',
  'world_announcement',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

// Drink intoxication levels
export const DRINK_INTOXICATION: Record<string, number> = {
  beer: 1,
  whiskey: 2,
  'rotgut whiskey': 3,
};

// Game constants
export const MAX_HEALTH = 100;
export const MIN_HEALTH = 0;
export const STARTING_REPUTATION = 50;
export const MAX_REPUTATION = 100;
export const MIN_REPUTATION = 0;
export const MAX_WANTED_LEVEL = 5;
export const MAX_INTOXICATION = 10;

// Passive effects
export const INTOXICATION_DECAY_TICKS = 12; // -1 intoxication per 12 ticks
export const SLEEP_HP_REGEN_PER_TICK = 5;
export const DYING_SAVE_WINDOW_TICKS = 3; // Doctor has 3 ticks to save

// Duel constants
export const DUEL_ACCEPT_TIMEOUT_TICKS = 2;
export const DUEL_PREP_TICKS = 2;
export const DUEL_MAX_ROUNDS = 3;

// Reputation modifiers (from GAME_DESIGN.md §7)
export const REPUTATION_MODIFIERS = {
  HELP_SOMEONE: 5,
  HEAL_SOMEONE: 10,
  WIN_DUEL: 15,
  STANDOFF: 10,
  DECLINE_DUEL: -5,
  SAY_KIND: 2,
  ARREST_CRIMINAL: 10,
  KILL_OUTSIDE_DUEL: -20,
  ROB_SOMEONE: -15,
  GET_ARRESTED: -10,
} as const;

// NPC definitions
export const NPCS = {
  SILAS: {
    name: 'Silas McCoy',
    role: 'bartender' as Role,
    stats: { grit: 5, charm: 7, cunning: 6, luck: 5 },
    backstory: 'Been here since the town was three tents and a creek. Knows everyone and everything.',
    room: ROOMS.SALOON,
    isProtected: true,
  },
  FINGERS: {
    name: 'Fingers Malone',
    role: 'piano_man' as Role,
    stats: { grit: 3, charm: 6, cunning: 7, luck: 6 },
    backstory: 'The quietest man in Deadwood. His piano speaks louder than words.',
    room: ROOMS.SALOON,
    isProtected: true,
  },
  RUBY: {
    name: 'Ruby LaRue',
    role: 'madam' as Role,
    stats: { grit: 4, charm: 9, cunning: 8, luck: 5 },
    backstory: 'Sharp as a tack and twice as dangerous. The upstairs rooms see more deals than the bank.',
    room: ROOMS.SALOON,
    isProtected: true,
  },
} as const;
