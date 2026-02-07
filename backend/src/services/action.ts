import {
  ROOM_EXITS,
  ROOMS,
  ERROR_CODES,
  REPUTATION_MODIFIERS,
  DRINK_INTOXICATION,
  MAX_INTOXICATION,
  MAX_HEALTH,
  type Character,
  type RoomId,
} from '@deadwood/shared';
import { store } from '../store/index.js';
import { narrate } from '../engine/narrator.js';
import { resolveShooting, resolvePunch, hasAmmo, deductAmmo } from '../engine/combat.js';
import { getInGameTime } from '../engine/time.js';
import { createEvent, broadcastToRoom, broadcastGlobal } from './event.js';
import { createDuel, acceptDuel, declineDuel, getPendingDuelForCharacter } from './duel.js';
import { isSafeZone } from './room.js';

interface ActionResult {
  success: boolean;
  narrative: string;
  effects: Array<{
    type: string;
    change?: number;
    newValue?: unknown;
    target?: string;
  }>;
  errorCode?: string;
}

/**
 * Process an action from a character
 */
export async function processAction(
  character: Character,
  action: string,
  params: Record<string, unknown>,
  tick: number
): Promise<ActionResult> {
  const { dayPhase } = getInGameTime(tick);

  // Validate character state
  if (character.status === 'dead') {
    return {
      success: false,
      narrative: 'The dead cannot act.',
      effects: [],
      errorCode: ERROR_CODES.CHARACTER_DEAD,
    };
  }

  if (character.status === 'dying' && action !== 'wait') {
    return {
      success: false,
      narrative: 'You are dying. Only a doctor can save you now.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  // Check duel state
  if (character.status === 'in_duel' && !['wait'].includes(action)) {
    return {
      success: false,
      narrative: 'You are in a duel. Focus.',
      effects: [],
      errorCode: ERROR_CODES.IN_DUEL,
    };
  }

  // Route to specific handler
  switch (action) {
    case 'say':
      return handleSay(character, params as { text: string }, tick, dayPhase);
    case 'whisper':
      return handleWhisper(character, params as { target: string; text: string }, tick, dayPhase);
    case 'emote':
      return handleEmote(character, params as { text: string }, tick, dayPhase);
    case 'look':
      return handleLook(character, params as { target?: string }, tick, dayPhase);
    case 'move':
      return handleMove(character, params as { room: string }, tick, dayPhase);
    case 'shoot':
      return handleShoot(character, params as { target: string }, tick, dayPhase);
    case 'punch':
      return handlePunch(character, params as { target: string }, tick, dayPhase);
    case 'challenge':
      return handleChallenge(character, params as { target: string }, tick, dayPhase);
    case 'accept':
      return handleAccept(character, tick);
    case 'decline':
      return handleDecline(character, tick);
    case 'buy':
      return handleBuy(character, params as { item: string }, tick, dayPhase);
    case 'give':
      return handleGive(character, params as { target: string; item: string }, tick, dayPhase);
    case 'pay':
      return handlePay(character, params as { target: string; amount: number }, tick, dayPhase);
    case 'heal':
      return handleHeal(character, params as { target: string }, tick, dayPhase);
    case 'wait':
      return handleWait(character, tick, dayPhase);
    case 'sleep':
      return handleSleep(character, tick, dayPhase);
    default:
      return {
        success: false,
        narrative: 'Unknown action.',
        effects: [],
        errorCode: ERROR_CODES.INVALID_ACTION,
      };
  }
}

async function handleSay(
  character: Character,
  params: { text: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const othersInRoom = store.getCharactersInRoom(character.currentRoom)
    .filter((c) => c.id !== character.id)
    .map((c) => c.name);

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'say',
    actionDetails: params.text,
    otherCharacters: othersInRoom,
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'say',
    data: { text: params.text },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return { success: true, narrative, effects: [] };
}

async function handleWhisper(
  character: Character,
  params: { target: string; text: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const target = store.getCharacterByName(params.target);

  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'whisper',
    actionDetails: `whispers to ${target.name}`,
    otherCharacters: [target.name],
  });

  // Only the whisperer and target see the full event
  // Others just see the action happened
  const publicEvent = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'whisper',
    data: { target: target.name },
    narrative,
  });

  broadcastToRoom(character.currentRoom, publicEvent);

  return { success: true, narrative, effects: [] };
}

async function handleEmote(
  character: Character,
  params: { text: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'emote',
    actionDetails: params.text,
    otherCharacters: [],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'emote',
    data: { text: params.text },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return { success: true, narrative, effects: [] };
}

async function handleLook(
  character: Character,
  params: { target?: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  let details = '';

  if (params.target) {
    const target = store.getCharacterByName(params.target);
    if (target && target.currentRoom === character.currentRoom) {
      details = `${target.name} (${target.role}): Health ${target.health}/100, Rep ${target.reputation}. ${target.intoxication > 3 ? 'Looking drunk.' : ''}`;
    } else {
      details = `You don't see ${params.target} here.`;
    }
  } else {
    const room = store.getRoomById(character.currentRoom);
    const chars = store.getCharactersInRoom(character.currentRoom).filter((c) => c.id !== character.id);
    details = `${room?.name}: ${room?.description} Present: ${chars.map((c) => c.name).join(', ') || 'nobody'}`;
  }

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'look',
    actionDetails: params.target || 'the room',
    otherCharacters: [],
  });

  return {
    success: true,
    narrative: narrative + ' ' + details,
    effects: [],
  };
}

async function handleMove(
  character: Character,
  params: { room: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const targetRoom = params.room as RoomId;
  const exits = ROOM_EXITS[character.currentRoom];

  if (!exits?.includes(targetRoom)) {
    return {
      success: false,
      narrative: `You can't get to ${targetRoom} from here.`,
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const oldRoom = character.currentRoom;

  // Create leave event
  const leaveNarrative = `${character.name} heads toward ${targetRoom}.`;
  const leaveEvent = createEvent({
    type: 'leave',
    tick,
    room: oldRoom,
    actor: character.name,
    data: { to: targetRoom },
    narrative: leaveNarrative,
  });
  broadcastToRoom(oldRoom, leaveEvent);

  // Update character location
  store.updateCharacter(character.id, {
    currentRoom: targetRoom,
    lastActionTick: tick,
  });

  // Create enter event
  const enterNarrative = await narrate({
    character,
    room: targetRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'move',
    actionDetails: `enters from ${oldRoom}`,
    otherCharacters: store.getCharactersInRoom(targetRoom).filter((c) => c.id !== character.id).map((c) => c.name),
  });

  const enterEvent = createEvent({
    type: 'enter',
    tick,
    room: targetRoom,
    actor: character.name,
    data: { from: oldRoom },
    narrative: enterNarrative,
  });
  broadcastToRoom(targetRoom, enterEvent);

  return {
    success: true,
    narrative: enterNarrative,
    effects: [{ type: 'room', newValue: targetRoom }],
  };
}

async function handleShoot(
  character: Character,
  params: { target: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  // Check safe zone
  if (isSafeZone(character.currentRoom)) {
    return {
      success: false,
      narrative: 'Violence is not permitted here.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  // Check ammo
  if (!hasAmmo(character)) {
    return {
      success: false,
      narrative: 'Click. Empty.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const target = store.getCharacterByName(params.target);
  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  if (target.isProtected) {
    return {
      success: false,
      narrative: `${target.name} is protected.`,
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  // Deduct ammo
  const newInventory = deductAmmo(character.inventory);
  store.updateCharacter(character.id, {
    inventory: newInventory,
    wantedLevel: Math.min(5, character.wantedLevel + 1),
    lastActionTick: tick,
  });

  // Resolve combat
  const result = resolveShooting(character, target);

  if (result.hit) {
    const newHealth = Math.max(0, target.health - result.damage);
    store.updateCharacter(target.id, {
      health: newHealth,
      status: newHealth <= 0 ? 'dying' : target.status,
    });
  }

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'shoot',
    actionDetails: result.narrativeInput,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'combat',
    tick,
    room: character.currentRoom,
    actor: character.name,
    data: {
      target: target.name,
      hit: result.hit,
      damage: result.damage,
    },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [
      { type: 'ammo', change: -1 },
      { type: 'wanted', change: 1, newValue: character.wantedLevel + 1 },
      ...(result.hit ? [{ type: 'damage', target: target.name, change: result.damage }] : []),
    ],
  };
}

async function handlePunch(
  character: Character,
  params: { target: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  if (isSafeZone(character.currentRoom)) {
    return {
      success: false,
      narrative: 'Violence is not permitted here.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const target = store.getCharacterByName(params.target);
  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  if (target.isProtected) {
    return {
      success: false,
      narrative: `${target.name} is protected.`,
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const result = resolvePunch(character, target);

  if (result.hit) {
    const newHealth = Math.max(0, target.health - result.damage);
    store.updateCharacter(target.id, {
      health: newHealth,
      status: newHealth <= 0 ? 'dying' : target.status,
    });
  }

  // Increment wanted by 0.5 (round down, so 2 punches = 1 wanted)
  store.updateCharacter(character.id, { lastActionTick: tick });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'punch',
    actionDetails: result.narrativeInput,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'combat',
    tick,
    room: character.currentRoom,
    actor: character.name,
    data: { target: target.name, hit: result.hit, damage: result.damage, type: 'punch' },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: result.hit ? [{ type: 'damage', target: target.name, change: result.damage }] : [],
  };
}

async function handleChallenge(
  character: Character,
  params: { target: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const target = store.getCharacterByName(params.target);

  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  if (target.status === 'in_duel') {
    return {
      success: false,
      narrative: `${target.name} is already in a duel.`,
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  if (target.isNpc) {
    return {
      success: false,
      narrative: `${target.name} won't duel.`,
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const duel = createDuel(character, target, tick);

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'challenge',
    actionDetails: `challenges ${target.name} to a duel`,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'duel_challenge',
    tick,
    room: character.currentRoom,
    actor: character.name,
    data: { challenger: character.name, challenged: target.name, duelId: duel.id },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);
  broadcastGlobal(event);

  return {
    success: true,
    narrative,
    effects: [{ type: 'duel_initiated', target: target.name }],
  };
}

async function handleAccept(character: Character, tick: number): Promise<ActionResult> {
  const duel = getPendingDuelForCharacter(character.id);

  if (!duel || duel.challengedId !== character.id) {
    return {
      success: false,
      narrative: 'No duel to accept.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const result = await acceptDuel(duel, tick);

  return {
    success: result.success,
    narrative: result.narrative,
    effects: [{ type: 'duel_accepted' }],
  };
}

async function handleDecline(character: Character, tick: number): Promise<ActionResult> {
  const duel = getPendingDuelForCharacter(character.id);

  if (!duel || duel.challengedId !== character.id) {
    return {
      success: false,
      narrative: 'No duel to decline.',
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const result = await declineDuel(duel, character, tick);

  return {
    success: result.success,
    narrative: result.narrative,
    effects: [{ type: 'reputation', change: REPUTATION_MODIFIERS.DECLINE_DUEL }],
  };
}

async function handleBuy(
  character: Character,
  params: { item: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  // MVP: Only buying drinks at saloon
  if (character.currentRoom !== ROOMS.SALOON) {
    return {
      success: false,
      narrative: "There's nothing to buy here.",
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const item = params.item.toLowerCase();
  const intoxicationGain = DRINK_INTOXICATION[item];

  if (!intoxicationGain) {
    return {
      success: false,
      narrative: `We don't have ${params.item}.`,
      effects: [],
      errorCode: ERROR_CODES.INVALID_PARAMS,
    };
  }

  const price = item === 'beer' ? 1 : 2;

  if (character.gold < price) {
    return {
      success: false,
      narrative: "You can't afford that.",
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const newIntox = Math.min(MAX_INTOXICATION, character.intoxication + intoxicationGain);
  store.updateCharacter(character.id, {
    gold: character.gold - price,
    intoxication: newIntox,
    lastActionTick: tick,
  });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'buy',
    actionDetails: `buys ${params.item}`,
    otherCharacters: [],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'buy',
    data: { item: params.item, price },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [
      { type: 'gold', change: -price, newValue: character.gold - price },
      { type: 'intoxication', change: intoxicationGain, newValue: newIntox },
    ],
  };
}

async function handleGive(
  character: Character,
  params: { target: string; item: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const target = store.getCharacterByName(params.target);

  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  const itemIndex = character.inventory.findIndex(
    (i) => i.toLowerCase() === params.item.toLowerCase()
  );

  if (itemIndex === -1) {
    return {
      success: false,
      narrative: `You don't have ${params.item}.`,
      effects: [],
      errorCode: ERROR_CODES.INVALID_PARAMS,
    };
  }

  // Transfer item
  const newInventory = [...character.inventory];
  const [item] = newInventory.splice(itemIndex, 1);

  store.updateCharacter(character.id, {
    inventory: newInventory,
    lastActionTick: tick,
  });

  store.updateCharacter(target.id, {
    inventory: [...target.inventory, item],
  });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'give',
    actionDetails: `gives ${item} to ${target.name}`,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'give',
    data: { target: target.name, item },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [{ type: 'inventory', change: -1, target: target.name }],
  };
}

async function handlePay(
  character: Character,
  params: { target: string; amount: number },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  const target = store.getCharacterByName(params.target);

  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  if (character.gold < params.amount) {
    return {
      success: false,
      narrative: "You don't have that much gold.",
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  store.updateCharacter(character.id, {
    gold: character.gold - params.amount,
    lastActionTick: tick,
  });

  store.updateCharacter(target.id, {
    gold: target.gold + params.amount,
  });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'pay',
    actionDetails: `pays ${target.name} ${params.amount} gold`,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'pay',
    data: { target: target.name, amount: params.amount },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [
      { type: 'gold', change: -params.amount, newValue: character.gold - params.amount },
    ],
  };
}

async function handleHeal(
  character: Character,
  params: { target: string },
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  if (character.role !== 'doctor') {
    return {
      success: false,
      narrative: "You're no doctor.",
      effects: [],
      errorCode: ERROR_CODES.ACTION_FORBIDDEN,
    };
  }

  const target = store.getCharacterByName(params.target);

  if (!target || target.currentRoom !== character.currentRoom) {
    return {
      success: false,
      narrative: `${params.target} is not here.`,
      effects: [],
      errorCode: ERROR_CODES.TARGET_NOT_FOUND,
    };
  }

  const healAmount = 30;
  const newHealth = Math.min(MAX_HEALTH, target.health + healAmount);
  const wasDying = target.status === 'dying';

  store.updateCharacter(target.id, {
    health: newHealth,
    status: wasDying ? 'idle' : target.status,
  });

  // Doctor gains reputation for healing
  store.updateCharacter(character.id, {
    reputation: Math.min(100, character.reputation + REPUTATION_MODIFIERS.HEAL_SOMEONE),
    lastActionTick: tick,
  });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'heal',
    actionDetails: wasDying ? `saves ${target.name} from death` : `tends to ${target.name}'s wounds`,
    otherCharacters: [target.name],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'heal',
    data: { target: target.name, healed: healAmount, saved: wasDying },
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [
      { type: 'heal', target: target.name, change: healAmount, newValue: newHealth },
      { type: 'reputation', change: REPUTATION_MODIFIERS.HEAL_SOMEONE },
    ],
  };
}

async function handleWait(
  character: Character,
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  store.updateCharacter(character.id, { lastActionTick: tick });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'wait',
    actionDetails: 'waits and watches',
    otherCharacters: [],
  });

  return { success: true, narrative, effects: [] };
}

async function handleSleep(
  character: Character,
  tick: number,
  dayPhase: string
): Promise<ActionResult> {
  store.updateCharacter(character.id, {
    status: 'sleeping',
    lastActionTick: tick,
  });

  const narrative = await narrate({
    character,
    room: character.currentRoom,
    timeOfDay: dayPhase as 'morning' | 'afternoon' | 'evening' | 'night',
    action: 'sleep',
    actionDetails: 'settles in to rest',
    otherCharacters: [],
  });

  const event = createEvent({
    type: 'action',
    tick,
    room: character.currentRoom,
    actor: character.name,
    action: 'sleep',
    narrative,
  });

  broadcastToRoom(character.currentRoom, event);

  return {
    success: true,
    narrative,
    effects: [{ type: 'status', newValue: 'sleeping' }],
  };
}
