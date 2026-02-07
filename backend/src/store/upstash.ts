import { Redis } from '@upstash/redis';
import {
  ROOMS,
  ROOM_DATA,
  ROOM_EXITS,
  NPCS,
  type Character,
  type GameEvent,
  type RoomId,
} from '../shared/index.js';
import type { IStore, Bounty, Duel, WorldState } from './types.js';
import { v4 as uuid } from 'uuid';

// Redis client - check both naming conventions (Vercel KV vs direct Upstash)
const redisUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = redisUrl && redisToken
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

const KEYS = {
  STATE: 'deadwood:state',
};

interface PersistedState {
  characters: Record<string, Character>;
  events: GameEvent[];
  bounties: Record<string, Bounty>;
  duels: Record<string, Duel>;
  worldState: WorldState;
}

/**
 * Upstash Redis Store with in-memory cache
 * Uses Redis as primary storage, falls back to memory-only if Redis unavailable
 */
class UpstashStore implements IStore {
  private characters: Map<string, Character> = new Map();
  private events: GameEvent[] = [];
  private bounties: Map<string, Bounty> = new Map();
  private duels: Map<string, Duel> = new Map();
  private actionQueue: Map<string, { action: string; params?: Record<string, unknown> }> = new Map();
  private worldState: WorldState = {
    tick: 0,
    phase: 1,
    isPaused: false,
    startedAt: Date.now(),
  };

  // Tick duration in milliseconds (5 seconds)
  private readonly TICK_DURATION_MS = 5000;

  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private saveDebounce: NodeJS.Timeout | null = null;

  constructor() {
    // Initialize synchronously with NPCs, then load from Redis
    this.initializeNPCs();
    this.initPromise = this.loadFromRedis();
  }

  /**
   * Ensure the store is loaded from Redis before any operation
   */
  private async ensureLoaded(): Promise<void> {
    if (!this.initialized && this.initPromise) {
      await this.initPromise;
    }
  }

  private async loadFromRedis(): Promise<void> {
    if (!redis) {
      console.log('[Store] No Redis configured, using memory-only mode');
      this.initialized = true;
      return;
    }

    try {
      const state = await redis.get<PersistedState>(KEYS.STATE);
      if (state) {
        // Merge Redis state with local NPCs
        this.characters = new Map(Object.entries(state.characters || {}));
        this.events = state.events || [];
        this.bounties = new Map(Object.entries(state.bounties || {}));
        this.duels = new Map(Object.entries(state.duels || {}));
        this.worldState = state.worldState || this.worldState;

        // Ensure NPCs exist
        this.ensureNPCs();

        console.log(`[Store] Loaded from Redis: ${this.characters.size} characters, ${this.events.length} events, tick ${this.worldState.tick}`);
      } else {
        // First time - save initial state
        await this.saveToRedis();
        console.log('[Store] Initialized new Redis state');
      }
    } catch (error) {
      console.error('[Store] Redis load failed, using memory:', error);
    }

    this.initialized = true;
  }

  private async saveToRedis(): Promise<void> {
    if (!redis) return;

    try {
      const state: PersistedState = {
        characters: Object.fromEntries(this.characters),
        events: this.events.slice(-200), // Keep last 200 events in Redis
        bounties: Object.fromEntries(this.bounties),
        duels: Object.fromEntries(this.duels),
        worldState: this.worldState,
      };
      await redis.set(KEYS.STATE, state);
    } catch (error) {
      console.error('[Store] Redis save failed:', error);
    }
  }

  private scheduleSave(): void {
    // Debounce saves to avoid hammering Redis
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => {
      this.saveToRedis().catch(console.error);
    }, 100);
  }

  /**
   * Force an immediate save to Redis (for critical operations)
   */
  async flushToRedis(): Promise<void> {
    if (this.saveDebounce) {
      clearTimeout(this.saveDebounce);
      this.saveDebounce = null;
    }
    await this.saveToRedis();
  }

  private ensureNPCs(): void {
    const npcConfigs = [NPCS.SILAS, NPCS.FINGERS, NPCS.RUBY];
    for (const npc of npcConfigs) {
      let found = false;
      for (const char of this.characters.values()) {
        if (char.name === npc.name) {
          found = true;
          break;
        }
      }
      if (!found) {
        const id = uuid();
        this.characters.set(id, {
          id,
          name: npc.name,
          role: npc.role,
          stats: npc.stats,
          gold: npc.role === 'bartender' ? 100 : npc.role === 'madam' ? 200 : 15,
          health: 100,
          reputation: npc.role === 'bartender' ? 75 : npc.role === 'madam' ? 65 : 60,
          wantedLevel: 0,
          intoxication: npc.role === 'piano_man' ? 1 : 0,
          currentRoom: npc.room,
          inventory: npc.role === 'bartender'
            ? ['bar towel', 'whiskey bottle', 'shotgun']
            : npc.role === 'madam'
            ? ['derringer', 'fan', 'perfume']
            : ['sheet music', 'worn hat'],
          status: 'idle',
          backstory: npc.backstory,
          isNpc: true,
          isProtected: npc.isProtected,
          createdAt: Date.now(),
        });
      }
    }
  }

  private initializeNPCs(): void {
    const now = Date.now();

    const npcs: Character[] = [
      {
        id: uuid(),
        name: NPCS.SILAS.name,
        role: NPCS.SILAS.role,
        stats: NPCS.SILAS.stats,
        gold: 100,
        health: 100,
        reputation: 75,
        wantedLevel: 0,
        intoxication: 0,
        currentRoom: NPCS.SILAS.room,
        inventory: ['bar towel', 'whiskey bottle', 'shotgun'],
        status: 'idle',
        backstory: NPCS.SILAS.backstory,
        isNpc: true,
        isProtected: NPCS.SILAS.isProtected,
        createdAt: now,
      },
      {
        id: uuid(),
        name: NPCS.FINGERS.name,
        role: NPCS.FINGERS.role,
        stats: NPCS.FINGERS.stats,
        gold: 15,
        health: 100,
        reputation: 60,
        wantedLevel: 0,
        intoxication: 1,
        currentRoom: NPCS.FINGERS.room,
        inventory: ['sheet music', 'worn hat'],
        status: 'idle',
        backstory: NPCS.FINGERS.backstory,
        isNpc: true,
        isProtected: NPCS.FINGERS.isProtected,
        createdAt: now,
      },
      {
        id: uuid(),
        name: NPCS.RUBY.name,
        role: NPCS.RUBY.role,
        stats: NPCS.RUBY.stats,
        gold: 200,
        health: 100,
        reputation: 65,
        wantedLevel: 0,
        intoxication: 0,
        currentRoom: NPCS.RUBY.room,
        inventory: ['derringer', 'fan', 'perfume'],
        status: 'idle',
        backstory: NPCS.RUBY.backstory,
        isNpc: true,
        isProtected: NPCS.RUBY.isProtected,
        createdAt: now,
      },
    ];

    for (const npc of npcs) {
      this.characters.set(npc.id, npc);
    }
  }

  // === Character methods ===
  async createCharacter(character: Character): Promise<Character> {
    await this.ensureLoaded();
    this.characters.set(character.id, character);
    // Immediate save for character creation (critical operation)
    await this.saveToRedis();
    return character;
  }

  getCharacterById(id: string): Character | undefined {
    return this.characters.get(id);
  }

  async getCharacterByApiKeyHash(hash: string): Promise<Character | undefined> {
    await this.ensureLoaded();
    for (const character of this.characters.values()) {
      if (character.apiKeyHash === hash) {
        return character;
      }
    }
    return undefined;
  }

  getCharacterByName(name: string): Character | undefined {
    const nameLower = name.toLowerCase();
    for (const character of this.characters.values()) {
      if (character.name.toLowerCase() === nameLower) {
        return character;
      }
    }
    return undefined;
  }

  getCharactersByRoom(roomId: RoomId): Character[] {
    const chars: Character[] = [];
    for (const character of this.characters.values()) {
      if (character.currentRoom === roomId && character.status !== 'dead') {
        chars.push(character);
      }
    }
    return chars;
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  getLivingCharacters(): Character[] {
    return Array.from(this.characters.values()).filter((c) => c.status !== 'dead');
  }

  updateCharacter(id: string, updates: Partial<Character>): Character | undefined {
    const character = this.characters.get(id);
    if (!character) return undefined;
    const updated = { ...character, ...updates };
    this.characters.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  killCharacter(id: string, causeOfDeath: string): Character | undefined {
    const result = this.updateCharacter(id, {
      status: 'dead',
      health: 0,
      diedAt: Date.now(),
      causeOfDeath,
    });
    return result;
  }

  // === Room methods ===
  getRoomById(roomId: RoomId) {
    const data = ROOM_DATA[roomId];
    if (!data) return undefined;
    return {
      id: roomId,
      name: data.name,
      description: data.description,
      items: data.items,
      isSafeZone: data.isSafeZone,
      exits: ROOM_EXITS[roomId],
    };
  }

  getAllRooms() {
    return Object.values(ROOMS).map((roomId) => this.getRoomById(roomId)!);
  }

  getCharactersInRoom(roomId: RoomId): Character[] {
    return this.getCharactersByRoom(roomId);
  }

  // === Event methods ===
  createEvent(event: GameEvent): GameEvent {
    this.events.push(event);
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }
    this.scheduleSave();
    return event;
  }

  getEventsByRoom(roomId: RoomId, limit = 50): GameEvent[] {
    return this.events
      .filter((e) => e.room === roomId || e.type === 'world_announcement')
      .slice(-limit);
  }

  getAllEvents(limit = 100): GameEvent[] {
    return this.events.slice(-limit);
  }

  // === Bounty methods ===
  createBounty(bounty: Bounty): Bounty {
    this.bounties.set(bounty.id, bounty);
    this.scheduleSave();
    return bounty;
  }

  getActiveBounties(): Bounty[] {
    return Array.from(this.bounties.values()).filter((b) => b.isActive);
  }

  claimBounty(bountyId: string, claimedBy: string): Bounty | undefined {
    const bounty = this.bounties.get(bountyId);
    if (!bounty || !bounty.isActive) return undefined;
    const updated = {
      ...bounty,
      isActive: false,
      claimedBy,
      claimedAt: Date.now(),
    };
    this.bounties.set(bountyId, updated);
    this.scheduleSave();
    return updated;
  }

  getBountyByTarget(targetName: string): Bounty | undefined {
    const nameLower = targetName.toLowerCase();
    for (const bounty of this.bounties.values()) {
      if (bounty.isActive && bounty.targetName.toLowerCase() === nameLower) {
        return bounty;
      }
    }
    return undefined;
  }

  // === Duel methods ===
  createDuel(duel: Duel): Duel {
    this.duels.set(duel.id, duel);
    this.scheduleSave();
    return duel;
  }

  getDuelById(id: string): Duel | undefined {
    return this.duels.get(id);
  }

  getActiveDuels(): Duel[] {
    return Array.from(this.duels.values()).filter(
      (d) => d.status !== 'resolved'
    );
  }

  getPendingDuelForCharacter(characterId: string): Duel | undefined {
    for (const duel of this.duels.values()) {
      if (
        duel.status === 'pending' &&
        (duel.challengerId === characterId || duel.challengedId === characterId)
      ) {
        return duel;
      }
    }
    return undefined;
  }

  updateDuel(id: string, updates: Partial<Duel>): Duel | undefined {
    const duel = this.duels.get(id);
    if (!duel) return undefined;
    const updated = { ...duel, ...updates };
    this.duels.set(id, updated);
    this.scheduleSave();
    return updated;
  }

  // === World state methods ===

  /**
   * Calculate current tick based on elapsed time since world started.
   * This is serverless-compatible - no need for a persistent tick loop.
   */
  private calculateCurrentTick(): number {
    const elapsed = Date.now() - this.worldState.startedAt;
    return Math.floor(elapsed / this.TICK_DURATION_MS);
  }

  getTick(): number {
    return this.calculateCurrentTick();
  }

  incrementTick(): number {
    // In time-based system, tick auto-increments. Just return current.
    return this.calculateCurrentTick();
  }

  getWorldState(): WorldState {
    const currentTick = this.calculateCurrentTick();
    return {
      ...this.worldState,
      tick: currentTick,
    };
  }

  setWorldPaused(paused: boolean): void {
    this.worldState.isPaused = paused;
    this.scheduleSave();
  }

  // === Graveyard ===
  getDeadCharacters(): Character[] {
    return Array.from(this.characters.values()).filter((c) => c.status === 'dead');
  }

  // === Action queue ===
  queueAction(characterId: string, action: { action: string; params?: Record<string, unknown> }): void {
    this.actionQueue.set(characterId, action);
  }

  getQueuedActions(): Map<string, { action: string; params?: Record<string, unknown> }> {
    return new Map(this.actionQueue);
  }

  clearActionQueue(): void {
    this.actionQueue.clear();
  }
}

export const store = new UpstashStore();
