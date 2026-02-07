// Re-export all types from schemas
export type {
  RegisterRequest,
  RegisterResponse,
} from '../schemas/registration.js';

export type {
  Stats,
  Character,
  CharacterPublic,
  CharacterSelf,
} from '../schemas/character.js';

export type {
  Action,
  SayAction,
  WhisperAction,
  EmoteAction,
  LookAction,
  MoveAction,
  ShootAction,
  PunchAction,
  ChallengeAction,
} from '../schemas/action.js';

export type { Room, RoomState } from '../schemas/room.js';

export type { GameEvent, RecentEvent } from '../schemas/event.js';

export type {
  Meta,
  ApiError,
  HealthResponse,
  ActionResponse,
  ObserveResponse,
} from '../schemas/api.js';

// Re-export constants types
export type {
  RoomId,
  Role,
  VisitorRole,
  DayPhase,
  CharacterStatus,
  ErrorCode,
  EventType,
} from '../constants.js';
