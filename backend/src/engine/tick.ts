import {
  TICK_DURATION_MS,
  INTOXICATION_DECAY_TICKS,
  SLEEP_HP_REGEN_PER_TICK,
  DYING_SAVE_WINDOW_TICKS,
  DUEL_ACCEPT_TIMEOUT_TICKS,
  MAX_HEALTH,
  ROOMS,
} from '../shared/index.js';
import { store } from '../store/index.js';
import { getInGameTime } from './time.js';
import { generateAmbientNarration, shouldGenerateAmbient } from './ambient.js';
import { createEvent, broadcastToRoom, broadcastGlobal } from '../services/event.js';
import { runNpcTick } from '../services/npc.js';
import { processAction } from '../services/action.js';

let tickInterval: NodeJS.Timeout | null = null;

/**
 * Start the tick loop - the heartbeat of Deadwood
 */
export function startTickLoop(): void {
  if (tickInterval) {
    console.warn('Tick loop already running');
    return;
  }

  console.log('Starting tick loop...');

  tickInterval = setInterval(async () => {
    const worldState = store.getWorldState();

    if (worldState.isPaused) {
      return;
    }

    const tick = store.incrementTick();
    const { formatted, dayPhase } = getInGameTime(tick);

    // Process queued agent actions
    await processActionQueue(tick);

    // Run NPC behavior loops
    await runNpcBehavior(tick);

    // Apply passive effects
    applyPassiveEffects(tick);

    // Maybe generate ambient narration
    await maybeGenerateAmbient(tick, dayPhase);

    // Check duel timeouts
    checkDuelTimeouts(tick);

    // Check dying characters
    checkDyingCharacters(tick);

    if (tick % 12 === 0) {
      console.log(`Tick ${tick} | ${formatted} (${dayPhase})`);
    }
  }, TICK_DURATION_MS);
}

/**
 * Stop the tick loop
 */
export function stopTickLoop(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
    console.log('Tick loop stopped');
  }
}

/**
 * Process all queued actions from agents
 */
async function processActionQueue(tick: number): Promise<void> {
  const actions = store.getQueuedActions();
  store.clearActionQueue();

  for (const [characterId, action] of actions) {
    const character = store.getCharacterById(characterId);
    if (!character || character.status === 'dead') continue;

    try {
      await processAction(character, action.action, action.params || {}, tick);
    } catch (error) {
      console.error(`Error processing action for ${character.name}:`, error);
    }
  }
}

/**
 * Run NPC behavior for all NPCs
 */
async function runNpcBehavior(tick: number): Promise<void> {
  const characters = store.getAllCharacters();
  const npcs = characters.filter((c) => c.isNpc && c.status !== 'dead');

  for (const npc of npcs) {
    const room = npc.currentRoom;
    const recentEvents = store.getEventsByRoom(room, 5);

    try {
      const action = await runNpcTick(npc, room, recentEvents, tick);
      if (action) {
        await processAction(npc, action.action, action.params || {}, tick);
      }
    } catch (error) {
      console.error(`Error in NPC behavior for ${npc.name}:`, error);
    }
  }
}

/**
 * Apply passive effects each tick
 */
function applyPassiveEffects(tick: number): void {
  const characters = store.getLivingCharacters();

  for (const character of characters) {
    // Intoxication decay: -1 per INTOXICATION_DECAY_TICKS ticks
    if (character.intoxication > 0 && tick % INTOXICATION_DECAY_TICKS === 0) {
      store.updateCharacter(character.id, {
        intoxication: Math.max(0, character.intoxication - 1),
      });
    }

    // Sleep HP regen
    if (character.status === 'sleeping' && character.health < MAX_HEALTH) {
      store.updateCharacter(character.id, {
        health: Math.min(MAX_HEALTH, character.health + SLEEP_HP_REGEN_PER_TICK),
      });
    }
  }
}

/**
 * Maybe generate ambient narration
 */
async function maybeGenerateAmbient(tick: number, dayPhase: string): Promise<void> {
  if (!shouldGenerateAmbient(tick)) return;

  // Pick a random room
  const rooms = Object.values(ROOMS);
  const room = rooms[Math.floor(Math.random() * rooms.length)];

  try {
    const narrative = await generateAmbientNarration(room, dayPhase as 'morning' | 'afternoon' | 'evening' | 'night');

    const event = createEvent({
      type: 'ambient',
      tick,
      room,
      narrative,
    });

    broadcastToRoom(room, event);
  } catch (error) {
    console.error('Error generating ambient narration:', error);
  }
}

/**
 * Check for duel timeouts
 */
function checkDuelTimeouts(tick: number): void {
  const duels = store.getActiveDuels();

  for (const duel of duels) {
    if (duel.status === 'pending') {
      // Check if timeout exceeded
      const ticksSinceChallenged = tick - duel.challengedAt;
      if (ticksSinceChallenged > DUEL_ACCEPT_TIMEOUT_TICKS) {
        // Duel expired - challenger loses reputation
        const challenger = store.getCharacterById(duel.challengerId);
        if (challenger) {
          store.updateCharacter(challenger.id, {
            reputation: Math.max(0, challenger.reputation - 2),
          });

          const event = createEvent({
            type: 'world_announcement',
            tick,
            narrative: `${challenger.name}'s duel challenge expires unanswered.`,
          });
          broadcastGlobal(event);
        }

        store.updateDuel(duel.id, { status: 'resolved' });
      }
    }
  }
}

/**
 * Check dying characters (3-tick save window)
 */
function checkDyingCharacters(tick: number): void {
  const characters = store.getAllCharacters();

  for (const character of characters) {
    if (character.status === 'dying') {
      // Check if character has been dying for too long
      const dyingStartTick = character.lastActionTick || tick;
      const ticksDying = tick - dyingStartTick;

      if (ticksDying >= DYING_SAVE_WINDOW_TICKS) {
        // Character dies
        store.killCharacter(character.id, 'Bled out without medical attention');

        const event = createEvent({
          type: 'world_announcement',
          tick,
          room: character.currentRoom,
          narrative: `${character.name} breathes their last. No doctor came.`,
        });

        broadcastToRoom(character.currentRoom, event);
        broadcastGlobal(event);
      }
    }
  }
}
