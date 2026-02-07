import { ROOM_DATA, ROOM_EXITS, type RoomId, type DayPhase } from '@deadwood/shared';
import { store } from '../store/index.js';
import { getCharacterPublicInfo } from './character.js';
import { getRecentEvents } from './event.js';

/**
 * Get full room state with characters, items, and recent events
 */
export function getRoomState(
  roomId: RoomId,
  timeOfDay: DayPhase
): {
  id: RoomId;
  name: string;
  description: string;
  timeOfDay: DayPhase;
  characters: Array<{
    name: string;
    role: string;
    activity?: string;
  }>;
  items: string[];
  exits: RoomId[];
  recentEvents: Array<{ tick: number; narrative: string }>;
} {
  const roomData = ROOM_DATA[roomId];
  const characters = store.getCharactersInRoom(roomId);
  const events = getRecentEvents(roomId, 10);

  return {
    id: roomId,
    name: roomData.name,
    description: roomData.description,
    timeOfDay,
    characters: characters.map((c) => {
      const pub = getCharacterPublicInfo(c);
      return {
        name: pub.name,
        role: pub.role,
        activity: pub.activity,
      };
    }),
    items: roomData.items,
    exits: ROOM_EXITS[roomId],
    recentEvents: events.map((e) => ({
      tick: e.tick,
      narrative: e.narrative,
    })),
  };
}

/**
 * Get adjacent rooms
 */
export function getAdjacentRooms(roomId: RoomId): RoomId[] {
  return ROOM_EXITS[roomId] || [];
}

/**
 * Check if a room is a valid exit from another room
 */
export function isValidExit(fromRoom: RoomId, toRoom: RoomId): boolean {
  const exits = ROOM_EXITS[fromRoom];
  return exits?.includes(toRoom) ?? false;
}

/**
 * Check if room is a safe zone (no combat allowed)
 */
export function isSafeZone(roomId: RoomId): boolean {
  return ROOM_DATA[roomId]?.isSafeZone ?? false;
}

/**
 * Get all rooms with basic info
 */
export function getAllRooms(): Array<{
  id: RoomId;
  name: string;
  description: string;
  exits: RoomId[];
  isSafeZone: boolean;
}> {
  return store.getAllRooms();
}
