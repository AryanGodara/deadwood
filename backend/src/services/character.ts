import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import {
  STARTING_GOLD,
  STARTING_INVENTORY,
  BASE_STATS,
  STARTING_REPUTATION,
  ROOMS,
  type Character,
  type VisitorRole,
  type RegisterRequest,
} from '../shared/index.js';
import { store } from '../store/index.js';

/**
 * Generate a random agent ID
 */
function generateAgentId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'ag_';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Generate a random API key
 */
function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'dk_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  const salt = process.env.API_KEY_SALT || 'deadwood_dev_salt_do_not_use_in_production';
  return createHash('sha256').update(apiKey + salt).digest('hex');
}

/**
 * Generate stats with ±1 random variation
 */
function generateStats(role: VisitorRole): { grit: number; charm: number; cunning: number; luck: number } {
  const base = BASE_STATS[role];
  const vary = () => Math.floor(Math.random() * 3) - 1; // -1, 0, or 1

  return {
    grit: Math.max(1, Math.min(10, base.grit + vary())),
    charm: Math.max(1, Math.min(10, base.charm + vary())),
    cunning: Math.max(1, Math.min(10, base.cunning + vary())),
    luck: Math.max(1, Math.min(10, base.luck + vary())),
  };
}

/**
 * Register a new character
 */
export async function registerCharacter(
  input: RegisterRequest
): Promise<{ agentId: string; apiKey: string; character: Character }> {
  const agentId = generateAgentId();
  const apiKey = generateApiKey();
  const role: VisitorRole = input.preferredRole || 'stranger';

  const character: Character = {
    id: uuid(),
    agentId,
    apiKeyHash: hashApiKey(apiKey),
    name: input.displayName,
    role,
    stats: generateStats(role),
    gold: STARTING_GOLD[role],
    health: 100,
    reputation: STARTING_REPUTATION,
    wantedLevel: 0,
    intoxication: 0,
    currentRoom: ROOMS.SALOON,
    inventory: [...STARTING_INVENTORY[role]],
    status: 'idle',
    backstory: input.backstory,
    isNpc: false,
    createdAt: Date.now(),
  };

  await store.createCharacter(character);

  return { agentId, apiKey, character };
}

/**
 * Get character by API key hash
 */
export async function getCharacterByApiKey(apiKey: string): Promise<Character | undefined> {
  const hash = hashApiKey(apiKey);
  return store.getCharacterByApiKeyHash(hash);
}

/**
 * Get character by name
 */
export function getCharacterByName(name: string): Character | undefined {
  return store.getCharacterByName(name);
}

/**
 * Get all living characters
 */
export function getLivingCharacters(): Character[] {
  return store.getLivingCharacters();
}

/**
 * Get agent count (non-NPC living characters)
 */
export function getAgentCount(): number {
  return store.getLivingCharacters().filter((c) => !c.isNpc).length;
}

/**
 * Get NPC count
 */
export function getNpcCount(): number {
  return store.getLivingCharacters().filter((c) => c.isNpc).length;
}

/**
 * Update character stats
 */
export function updateCharacter(id: string, updates: Partial<Character>): Character | undefined {
  return store.updateCharacter(id, updates);
}

/**
 * Get public character info
 */
export function getCharacterPublicInfo(character: Character): {
  name: string;
  role: string;
  health: number;
  reputation: number;
  wantedLevel: number;
  intoxication: number;
  status: string;
  activity?: string;
} {
  // Determine activity based on status
  let activity: string | undefined;
  if (character.status === 'sleeping') {
    activity = 'sleeping';
  } else if (character.status === 'in_duel') {
    activity = 'in a duel';
  } else if (character.status === 'arrested') {
    activity = 'behind bars';
  } else if (character.isNpc) {
    // NPC-specific activities
    if (character.role === 'bartender') {
      activity = Math.random() > 0.5 ? 'polishing a glass' : 'wiping the bar';
    } else if (character.role === 'piano_man') {
      activity = 'playing a slow tune';
    } else if (character.role === 'madam') {
      activity = 'surveying the room';
    }
  }

  return {
    name: character.name,
    role: character.role,
    health: character.health,
    reputation: character.reputation,
    wantedLevel: character.wantedLevel,
    intoxication: character.intoxication,
    status: character.status,
    activity,
  };
}
