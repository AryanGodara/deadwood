import Anthropic from '@anthropic-ai/sdk';
import type { Character, RoomId, DayPhase } from '@deadwood/shared';
import { ROOM_DATA } from '@deadwood/shared';

let anthropic: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

interface NarrateContext {
  character: Character;
  room: RoomId;
  timeOfDay: DayPhase;
  action: string;
  actionDetails: string;
  otherCharacters: string[];
  recentEvents?: string[];
}

/**
 * Generate narrative description for an action using Claude Haiku
 */
export async function narrate(context: NarrateContext): Promise<string> {
  const client = getClient();

  // Fallback to simple narration if no API key
  if (!client) {
    return generateSimpleNarration(context);
  }

  const roomData = ROOM_DATA[context.room];

  const prompt = `You are the narrator of Deadwood, a Wild West frontier town in 1878.
Write a brief, atmospheric third-person narration of this action.
Keep it under 2 sentences. Match the tone of Cormac McCarthy meets Deadwood (HBO).
Sparse prose. No purple language. Let the violence and silence speak.

Character: ${context.character.name} (${context.character.role}, reputation ${context.character.reputation}, intoxication ${context.character.intoxication})
Room: ${roomData.name}, ${context.timeOfDay}
Action: ${context.action} - ${context.actionDetails}
Others present: ${context.otherCharacters.length > 0 ? context.otherCharacters.join(', ') : 'none'}
${context.recentEvents?.length ? `Recent: ${context.recentEvents.slice(-2).join('. ')}` : ''}

Narration:`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text.trim();
    }
    return generateSimpleNarration(context);
  } catch (error) {
    console.error('Narrator error:', error);
    return generateSimpleNarration(context);
  }
}

/**
 * Simple fallback narration without LLM
 */
function generateSimpleNarration(context: NarrateContext): string {
  const { character, action, actionDetails } = context;

  switch (action) {
    case 'say':
      return `${character.name} speaks: "${actionDetails}"`;
    case 'whisper':
      return `${character.name} leans close and whispers.`;
    case 'emote':
      return `${character.name} ${actionDetails}`;
    case 'look':
      return `${character.name} surveys the room with a careful eye.`;
    case 'move':
      return `${character.name} heads toward ${actionDetails}.`;
    case 'shoot':
      return `${character.name} draws and fires at ${actionDetails}. The shot echoes.`;
    case 'punch':
      return `${character.name} throws a punch at ${actionDetails}.`;
    case 'challenge':
      return `${character.name} challenges ${actionDetails} to a duel.`;
    case 'accept':
      return `${character.name} accepts the challenge. They step outside.`;
    case 'decline':
      return `${character.name} backs down from the duel.`;
    case 'buy':
      return `${character.name} makes a purchase.`;
    case 'give':
      return `${character.name} hands something over.`;
    case 'pay':
      return `${character.name} counts out some gold.`;
    case 'heal':
      return `${character.name} tends to ${actionDetails}'s wounds.`;
    case 'arrest':
      return `${character.name} slaps irons on ${actionDetails}.`;
    case 'sleep':
      return `${character.name} settles in to rest.`;
    case 'wait':
      return `${character.name} waits, watching.`;
    default:
      return `${character.name} takes action.`;
  }
}

/**
 * Generate NPC dialogue
 */
export async function generateNpcDialogue(
  npc: Character,
  situation: string,
  targetName?: string
): Promise<string> {
  const client = getClient();

  // Fallback pool of NPC lines
  const fallbackLines: Record<string, string[]> = {
    'Silas McCoy': [
      "What'll it be?",
      "We don't want no trouble in here.",
      "Another drink, or you just takin' up space?",
      "I seen things in this town you wouldn't believe.",
      "Cash on the bar.",
    ],
    'Fingers Malone': [
      "*plays a melancholy chord*",
      "*nods silently and continues playing*",
      "The piano knows...",
      "*shifts to a darker key*",
    ],
    'Ruby LaRue': [
      "Well now, what have we here?",
      "Lookin' for company, sugar?",
      "Information costs, darlin'.",
      "*watches with knowing eyes*",
      "Everyone's got secrets.",
    ],
  };

  if (!client) {
    const lines = fallbackLines[npc.name] || ['...'];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  const prompt = `You are ${npc.name}, a ${npc.role} in Deadwood (1878).
Personality: ${npc.backstory}

Situation: ${situation}
${targetName ? `Speaking to: ${targetName}` : ''}

Say ONE short line (under 15 words) in character. No quotation marks. Just the dialogue.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (textBlock && textBlock.type === 'text') {
      return textBlock.text.trim().replace(/^["']|["']$/g, '');
    }

    const lines = fallbackLines[npc.name] || ['...'];
    return lines[Math.floor(Math.random() * lines.length)];
  } catch (error) {
    console.error('NPC dialogue error:', error);
    const lines = fallbackLines[npc.name] || ['...'];
    return lines[Math.floor(Math.random() * lines.length)];
  }
}
