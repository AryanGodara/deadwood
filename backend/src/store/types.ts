import type { Character, GameEvent, RoomId } from '../shared/index.js';

export interface Bounty {
  id: string;
  targetName: string;
  amount: number;
  reason: string;
  postedBy: string;
  postedAt: number;
  claimedBy?: string;
  claimedAt?: number;
  isActive: boolean;
}

export interface Duel {
  id: string;
  challengerId: string;
  challengedId: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'resolved';
  challengedAt: number;
  acceptedAt?: number;
  resolvedAt?: number;
  winner?: string;
  round: number;
}

export interface WorldState {
  tick: number;
  phase: number;
  isPaused: boolean;
  startedAt: number;
}

export interface IStore {
  // Characters
  createCharacter(character: Character): Character;
  getCharacterById(id: string): Character | undefined;
  getCharacterByApiKeyHash(hash: string): Character | undefined;
  getCharacterByName(name: string): Character | undefined;
  getCharactersByRoom(roomId: RoomId): Character[];
  getAllCharacters(): Character[];
  getLivingCharacters(): Character[];
  updateCharacter(id: string, updates: Partial<Character>): Character | undefined;
  killCharacter(id: string, causeOfDeath: string): Character | undefined;

  // Rooms
  getRoomById(roomId: RoomId): { id: RoomId; name: string; description: string; items: string[]; isSafeZone: boolean; exits: RoomId[] } | undefined;
  getAllRooms(): Array<{ id: RoomId; name: string; description: string; items: string[]; isSafeZone: boolean; exits: RoomId[] }>;
  getCharactersInRoom(roomId: RoomId): Character[];

  // Events
  createEvent(event: GameEvent): GameEvent;
  getEventsByRoom(roomId: RoomId, limit?: number): GameEvent[];
  getAllEvents(limit?: number): GameEvent[];

  // Bounties
  createBounty(bounty: Bounty): Bounty;
  getActiveBounties(): Bounty[];
  claimBounty(bountyId: string, claimedBy: string): Bounty | undefined;
  getBountyByTarget(targetName: string): Bounty | undefined;

  // Duels
  createDuel(duel: Duel): Duel;
  getDuelById(id: string): Duel | undefined;
  getActiveDuels(): Duel[];
  getPendingDuelForCharacter(characterId: string): Duel | undefined;
  updateDuel(id: string, updates: Partial<Duel>): Duel | undefined;

  // World state
  getTick(): number;
  incrementTick(): number;
  getWorldState(): WorldState;
  setWorldPaused(paused: boolean): void;

  // Graveyard
  getDeadCharacters(): Character[];

  // Action queue
  queueAction(characterId: string, action: { action: string; params?: Record<string, unknown> }): void;
  getQueuedActions(): Map<string, { action: string; params?: Record<string, unknown> }>;
  clearActionQueue(): void;
}
