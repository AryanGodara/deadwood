const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: {
    tick: number;
    inGameTime: string;
    dayPhase: string;
    timestamp: number;
  };
}

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await res.json();
    return data;
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
      },
    };
  }
}

export interface HealthData {
  status: string;
  tick: number;
  inGameTime: string;
  dayPhase: string;
  agentCount: number;
  npcCount: number;
  uptime: number;
  version: string;
}

export async function getHealth(): Promise<HealthData | null> {
  const res = await fetchApi<HealthData>('/api/health');
  return res.ok ? res.data ?? null : null;
}

export interface CharacterData {
  name: string;
  role: string;
  health: number;
  reputation: number;
  wantedLevel: number;
  status: string;
  currentRoom: string;
  isNpc: boolean;
  backstory?: string;
  gold?: number;
}

export async function getCharacters(): Promise<CharacterData[]> {
  const res = await fetchApi<{ characters: CharacterData[] }>('/api/characters');
  return res.ok ? res.data?.characters ?? [] : [];
}

export interface RoomData {
  id: string;
  name: string;
  description: string;
  exits: string[];
  isSafeZone: boolean;
}

export async function getRooms(): Promise<RoomData[]> {
  const res = await fetchApi<{ rooms: RoomData[] }>('/api/world/rooms');
  return res.ok ? res.data?.rooms ?? [] : [];
}

export interface EventData {
  id: string;
  type: string;
  tick: number;
  room?: string;
  actor?: string;
  narrative: string;
  timestamp: number;
}

export async function getHistory(room?: string, limit = 50): Promise<EventData[]> {
  const params = new URLSearchParams();
  if (room) params.set('room', room);
  params.set('limit', limit.toString());

  const res = await fetchApi<{ events: EventData[] }>(`/api/history?${params}`);
  return res.ok ? res.data?.events ?? [] : [];
}

export interface GraveyardCharacter {
  name: string;
  role: string;
  backstory?: string;
  causeOfDeath?: string;
  diedAt?: number;
  reputation: number;
}

export async function getGraveyard(): Promise<GraveyardCharacter[]> {
  const res = await fetchApi<{ characters: GraveyardCharacter[] }>('/api/graveyard');
  return res.ok ? res.data?.characters ?? [] : [];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  role: string;
  reputation: number;
  gold: number;
  wantedLevel: number;
}

export async function getLeaderboard(sort = 'reputation'): Promise<LeaderboardEntry[]> {
  const res = await fetchApi<{ leaderboard: LeaderboardEntry[] }>(
    `/api/leaderboard?sort=${sort}`
  );
  return res.ok ? res.data?.leaderboard ?? [] : [];
}

export interface TimeData {
  tick: number;
  hours: number;
  minutes: number;
  inGameTime: string;
  dayPhase: string;
}

export async function getWorldTime(): Promise<TimeData | null> {
  const res = await fetchApi<TimeData>('/api/world/time');
  return res.ok ? res.data ?? null : null;
}
