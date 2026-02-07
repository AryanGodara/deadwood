import Anthropic from '@anthropic-ai/sdk';
import type { RoomId, DayPhase } from '@deadwood/shared';
import { ROOMS } from '@deadwood/shared';

let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

// Hardcoded ambient description pool (indexed by room + time)
const AMBIENT_POOL: Record<RoomId, Record<DayPhase, string[]>> = {
  [ROOMS.SALOON]: {
    morning: [
      'Dust motes drift through the morning light slanting through dirty windows.',
      'The saloon smells of last night. Stale whiskey and old smoke.',
      'Silas sweeps the floor. The broom scratches against worn boards.',
      'A rooster crows somewhere outside. The piano is silent.',
    ],
    afternoon: [
      'The afternoon heat settles over the saloon like a blanket.',
      'Flies buzz around the spittoons. No one moves to stop them.',
      'Cards slap against a table in the corner. Someone curses quietly.',
      'The clock on the wall ticks. Loud in the silence.',
    ],
    evening: [
      'Oil lamps flicker to life as darkness claims the windows.',
      'The piano starts up. A familiar tune, worn smooth by repetition.',
      'Laughter rises and falls. The evening crowd fills the room.',
      'Smoke hangs thick near the ceiling. Blue-gray clouds.',
    ],
    night: [
      'The saloon thins out. Those who remain have nowhere else to be.',
      "Shadows pool in the corners. The lamps burn low on their wicks.",
      'Someone snores at a table. Their hat pulled down over their face.',
      'Outside, a dog howls at the moon. Or maybe at something else.',
    ],
  },
  [ROOMS.STREET]: {
    morning: [
      "The street wakes slowly. Horses stamp at the hitching post.",
      'A tumbleweed rolls past. The wind carries dust.',
      'The jail door creaks in the morning breeze.',
      'Someone draws water from the trough. The bucket clanks.',
    ],
    afternoon: [
      'Heat shimmers off the dusty street. Nothing moves.',
      'The sun beats down without mercy. Shadows hide close to buildings.',
      'A hawk circles overhead. Patient. Watching.',
      'The town goes quiet in the afternoon heat.',
    ],
    evening: [
      'Long shadows stretch across the street. Day surrenders to night.',
      'Lanterns glow in windows. The town prepares for darkness.',
      'The evening air carries voices from the saloon.',
      'Someone walks toward the jail. Their spurs jingle.',
    ],
    night: [
      'The street lies empty under starlight. Quiet as a grave.',
      'Moonlight paints silver on the water trough.',
      'A coyote howls in the distance. The town holds its breath.',
      'Shadows move between buildings. Or maybe they dont.',
    ],
  },
  [ROOMS.JAIL]: {
    morning: [
      'Morning light filters through the barred windows. Dust and silence.',
      'The cells stand empty. The wanted posters watch the door.',
      'Keys hang on their hook. Still. Waiting.',
      'The jail smells of iron and old sweat.',
    ],
    afternoon: [
      'Afternoon heat makes the jail an oven. The iron bars are hot to touch.',
      'A fly buzzes against the window. Trying to escape.',
      'The wanted posters curl at the edges. Fading in the heat.',
      'Silence. The cells hold their secrets.',
    ],
    evening: [
      'Evening shadows fill the cells. The bars cast long lines.',
      'Someone lit a lamp. It flickers against the darkness.',
      'The jail cools as night approaches. Stone holds the chill.',
      'Outside, the town comes alive. In here, nothing changes.',
    ],
    night: [
      'The jail is dark. Only moonlight through the bars.',
      'Night sounds echo off the stone walls.',
      'The cells are cold. Empty. Waiting for their next occupant.',
      'Somewhere, a drunk sings. The sound carries from the saloon.',
    ],
  },
};

/**
 * Generate ambient narration for a room
 * 20% chance of LLM, 80% from pool
 */
export async function generateAmbientNarration(
  room: RoomId,
  timeOfDay: DayPhase
): Promise<string> {
  const pool = AMBIENT_POOL[room]?.[timeOfDay];

  // 20% chance of LLM-generated ambient
  if (Math.random() < 0.2) {
    const client = getClient();
    if (client) {
      try {
        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 60,
          messages: [
            {
              role: 'user',
              content: `Write ONE atmospheric sentence for a Wild West ${room === ROOMS.SALOON ? 'saloon' : room === ROOMS.STREET ? 'dusty street' : 'jail'} during ${timeOfDay}. Cormac McCarthy style. Under 20 words. No dialogue.`,
            },
          ],
        });

        const textBlock = response.content.find((block) => block.type === 'text');
        if (textBlock && textBlock.type === 'text') {
          return textBlock.text.trim();
        }
      } catch {
        // Fall through to pool
      }
    }
  }

  // Pick from pool
  if (pool && pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return 'The world holds its breath.';
}

/**
 * Check if ambient narration should trigger this tick
 * ~20% chance, but not every tick (space them out)
 */
let lastAmbientTick = 0;
const MIN_AMBIENT_GAP = 5; // Minimum 5 ticks between ambient narrations

export function shouldGenerateAmbient(tick: number): boolean {
  if (tick - lastAmbientTick < MIN_AMBIENT_GAP) {
    return false;
  }

  if (Math.random() < 0.2) {
    lastAmbientTick = tick;
    return true;
  }

  return false;
}
