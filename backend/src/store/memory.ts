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

class MemoryStore implements IStore {
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

  constructor() {
    this.initializeNPCs();
  }

  private initializeNPCs(): void {
    const now = Date.now();

    // Silas McCoy - Bartender
    const silas: Character = {
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
    };

    // Fingers Malone - Piano Man
    const fingers: Character = {
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
    };

    // Ruby LaRue - Madam
    const ruby: Character = {
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
    };

    this.characters.set(silas.id, silas);
    this.characters.set(fingers.id, fingers);
    this.characters.set(ruby.id, ruby);
  }

  // Characters
  createCharacter(character: Character): Character {
    this.characters.set(character.id, character);
    return character;
  }

  getCharacterById(id: string): Character | undefined {
    return this.characters.get(id);
  }

  getCharacterByApiKeyHash(hash: string): Character | undefined {
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
    return updated;
  }

  killCharacter(id: string, causeOfDeath: string): Character | undefined {
    return this.updateCharacter(id, {
      status: 'dead',
      health: 0,
      diedAt: Date.now(),
      causeOfDeath,
    });
  }

  // Rooms
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

  // Events
  createEvent(event: GameEvent): GameEvent {
    this.events.push(event);
    // Keep last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
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

  // Bounties
  createBounty(bounty: Bounty): Bounty {
    this.bounties.set(bounty.id, bounty);
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

  // Duels
  createDuel(duel: Duel): Duel {
    this.duels.set(duel.id, duel);
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
    return updated;
  }

  // World state
  getTick(): number {
    return this.worldState.tick;
  }

  incrementTick(): number {
    this.worldState.tick++;
    return this.worldState.tick;
  }

  getWorldState(): WorldState {
    return { ...this.worldState };
  }

  setWorldPaused(paused: boolean): void {
    this.worldState.isPaused = paused;
  }

  // Graveyard
  getDeadCharacters(): Character[] {
    return Array.from(this.characters.values()).filter((c) => c.status === 'dead');
  }

  // Action queue
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

// Singleton instance
export const store = new MemoryStore();
