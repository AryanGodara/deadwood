import type { Character, GameEvent, RoomId } from '@deadwood/shared';
import { NPCS } from '@deadwood/shared';
import { store } from '../store/index.js';
import { generateNpcDialogue } from '../engine/narrator.js';

interface NpcAction {
  action: string;
  params?: Record<string, unknown>;
}

/**
 * Run NPC behavior for one tick
 * Returns an action if NPC should take one, null otherwise
 */
export async function runNpcTick(
  npc: Character,
  room: RoomId,
  recentEvents: GameEvent[],
  tick: number
): Promise<NpcAction | null> {
  // NPC action frequency - not every tick
  // Random chance to act (20% per tick)
  if (Math.random() > 0.2) {
    return null;
  }

  switch (npc.name) {
    case NPCS.SILAS.name:
      return silasBehavior(npc, room, recentEvents, tick);
    case NPCS.FINGERS.name:
      return fingersBehavior(npc, room, recentEvents, tick);
    case NPCS.RUBY.name:
      return rubyBehavior(npc, room, recentEvents, tick);
    default:
      return null;
  }
}

/**
 * Silas McCoy (Bartender) behavior
 * Priority:
 * 1. Greet newcomers
 * 2. React to fights
 * 3. Comment on slow business / idle
 */
async function silasBehavior(
  npc: Character,
  room: RoomId,
  recentEvents: GameEvent[],
  tick: number
): Promise<NpcAction | null> {
  // Check for newcomers (enter events in last 3 ticks)
  const recentEnters = recentEvents.filter(
    (e) => e.type === 'enter' && tick - e.tick <= 3
  );

  if (recentEnters.length > 0) {
    const newcomer = recentEnters[0].actor;
    if (newcomer && newcomer !== npc.name) {
      const dialogue = await generateNpcDialogue(npc, `greeting newcomer ${newcomer}`, newcomer);
      return {
        action: 'say',
        params: { text: dialogue },
      };
    }
  }

  // Check for fights (combat events in last 2 ticks)
  const recentCombat = recentEvents.filter(
    (e) => e.type === 'combat' && tick - e.tick <= 2
  );

  if (recentCombat.length > 0) {
    const dialogue = await generateNpcDialogue(npc, 'reacting to a fight breaking out');
    return {
      action: 'say',
      params: { text: dialogue },
    };
  }

  // Random idle behavior (30% chance when already deciding to act)
  if (Math.random() < 0.3) {
    const idleBehaviors = [
      { action: 'emote', params: { text: 'polishes a glass with a worn cloth' } },
      { action: 'emote', params: { text: 'wipes down the bar' } },
      { action: 'emote', params: { text: 'mutters something about the dust' } },
    ];
    return idleBehaviors[Math.floor(Math.random() * idleBehaviors.length)];
  }

  return null;
}

/**
 * Fingers Malone (Piano Man) behavior
 * Priority:
 * 1. Play dramatic music during duels
 * 2. React to fights (stop playing)
 * 3. Match music to time of day
 */
async function fingersBehavior(
  npc: Character,
  room: RoomId,
  recentEvents: GameEvent[],
  tick: number
): Promise<NpcAction | null> {
  // Check for duel events
  const duelEvents = recentEvents.filter(
    (e) => (e.type === 'duel_challenge' || e.type === 'duel_result') && tick - e.tick <= 3
  );

  if (duelEvents.length > 0) {
    return {
      action: 'emote',
      params: { text: 'strikes up a tense, dramatic tune' },
    };
  }

  // Check for combat (hide)
  const recentCombat = recentEvents.filter(
    (e) => e.type === 'combat' && tick - e.tick <= 2
  );

  if (recentCombat.length > 0) {
    return {
      action: 'emote',
      params: { text: 'stops playing and ducks behind the piano' },
    };
  }

  // Random music emotes
  if (Math.random() < 0.4) {
    const musicEmotes = [
      { action: 'emote', params: { text: 'plays a melancholy tune' } },
      { action: 'emote', params: { text: 'transitions to a slower piece' } },
      { action: 'emote', params: { text: 'hits a sour note, then recovers' } },
      { action: 'emote', params: { text: 'hums along quietly' } },
    ];
    return musicEmotes[Math.floor(Math.random() * musicEmotes.length)];
  }

  return null;
}

/**
 * Ruby LaRue (Madam) behavior
 * Priority:
 * 1. Approach rich characters
 * 2. Watch low-rep characters warily
 * 3. Idle surveillance
 */
async function rubyBehavior(
  npc: Character,
  room: RoomId,
  recentEvents: GameEvent[],
  _tick: number
): Promise<NpcAction | null> {
  const characters = store.getCharactersInRoom(room);
  const others = characters.filter((c) => c.id !== npc.id && !c.isNpc);

  // Look for rich characters (gold > 30)
  const richChars = others.filter((c) => c.gold > 30 && c.status === 'idle');
  if (richChars.length > 0) {
    const target = richChars[Math.floor(Math.random() * richChars.length)];
    const dialogue = await generateNpcDialogue(npc, `approaching wealthy patron ${target.name}`, target.name);
    return {
      action: 'say',
      params: { text: dialogue },
    };
  }

  // Watch low-rep characters (reputation < 30)
  const lowRepChars = others.filter((c) => c.reputation < 30);
  if (lowRepChars.length > 0) {
    const target = lowRepChars[0];
    return {
      action: 'emote',
      params: { text: `watches ${target.name} with narrowed eyes` },
    };
  }

  // Idle behavior
  if (Math.random() < 0.3) {
    const idleBehaviors = [
      { action: 'emote', params: { text: 'adjusts her fan, eyes scanning the room' } },
      { action: 'emote', params: { text: 'leans against the bannister, watching' } },
      { action: 'emote', params: { text: 'whispers something to a passing girl' } },
    ];
    return idleBehaviors[Math.floor(Math.random() * idleBehaviors.length)];
  }

  return null;
}
