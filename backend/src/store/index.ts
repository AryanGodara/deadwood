// Use Upstash Redis store with in-memory cache
// Falls back to memory-only if UPSTASH_REDIS_REST_URL is not set
export { store } from './upstash.js';
export type { IStore, Bounty, Duel, WorldState } from './types.js';
