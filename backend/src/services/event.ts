import { v4 as uuid } from 'uuid';
import type { GameEvent, RoomId, EventType } from '../shared/index.js';
import { store } from '../store/index.js';
import { wsManager } from '../ws/manager.js';

interface CreateEventInput {
  type: EventType;
  tick: number;
  room?: RoomId;
  actor?: string;
  action?: string;
  data?: Record<string, unknown>;
  narrative: string;
}

/**
 * Create and store a new event
 */
export function createEvent(input: CreateEventInput): GameEvent {
  const event: GameEvent = {
    id: uuid(),
    type: input.type,
    tick: input.tick,
    room: input.room,
    actor: input.actor,
    action: input.action,
    data: input.data,
    narrative: input.narrative,
    timestamp: Date.now(),
  };

  return store.createEvent(event);
}

/**
 * Broadcast event to all WebSocket subscribers in a room
 */
export function broadcastToRoom(roomId: RoomId, event: GameEvent): void {
  wsManager.broadcastToRoom(roomId, event);
}

/**
 * Broadcast event globally to all spectators
 */
export function broadcastGlobal(event: GameEvent): void {
  wsManager.broadcastGlobal(event);
}

/**
 * Get recent events for a room
 */
export function getRecentEvents(roomId: RoomId, limit = 10): GameEvent[] {
  return store.getEventsByRoom(roomId, limit);
}
