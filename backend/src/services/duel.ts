import { v4 as uuid } from 'uuid';
import {
  ROOMS,
  REPUTATION_MODIFIERS,
  type Character,
} from '../shared/index.js';
import { store, type Duel } from '../store/index.js';
import { resolveDuelRound } from '../engine/combat.js';
import { createEvent, broadcastToRoom, broadcastGlobal } from './event.js';
import { narrate } from '../engine/narrator.js';
import { getInGameTime } from '../engine/time.js';

/**
 * Create a new duel challenge
 */
export function createDuel(
  challenger: Character,
  challenged: Character,
  tick: number
): Duel {
  const duel: Duel = {
    id: uuid(),
    challengerId: challenger.id,
    challengedId: challenged.id,
    status: 'pending',
    challengedAt: tick,
    round: 0,
  };

  store.createDuel(duel);

  // Update challenger status
  store.updateCharacter(challenger.id, { lastActionTick: tick });

  return duel;
}

/**
 * Accept a pending duel
 */
export async function acceptDuel(
  duel: Duel,
  tick: number
): Promise<{ success: boolean; narrative: string }> {
  const challenger = store.getCharacterById(duel.challengerId);
  const challenged = store.getCharacterById(duel.challengedId);

  if (!challenger || !challenged) {
    return { success: false, narrative: 'Duelists not found.' };
  }

  // Update duel status
  store.updateDuel(duel.id, {
    status: 'accepted',
    acceptedAt: tick,
  });

  // Move both to street if not there
  if (challenger.currentRoom !== ROOMS.STREET) {
    store.updateCharacter(challenger.id, {
      currentRoom: ROOMS.STREET,
      status: 'in_duel',
    });
  } else {
    store.updateCharacter(challenger.id, { status: 'in_duel' });
  }

  if (challenged.currentRoom !== ROOMS.STREET) {
    store.updateCharacter(challenged.id, {
      currentRoom: ROOMS.STREET,
      status: 'in_duel',
    });
  } else {
    store.updateCharacter(challenged.id, { status: 'in_duel' });
  }

  const { dayPhase } = getInGameTime(tick);
  const narrative = await narrate({
    character: challenged,
    room: ROOMS.STREET,
    timeOfDay: dayPhase,
    action: 'accept',
    actionDetails: `accepts ${challenger.name}'s duel challenge`,
    otherCharacters: [challenger.name],
  });

  // Announce the duel acceptance
  const event = createEvent({
    type: 'duel_challenge',
    tick,
    room: ROOMS.STREET,
    actor: challenged.name,
    data: { challenger: challenger.name, challenged: challenged.name, phase: 'accepted' },
    narrative,
  });

  broadcastToRoom(ROOMS.STREET, event);
  broadcastGlobal(event);

  // Schedule duel resolution (happens after prep ticks)
  // For now, resolve immediately for MVP
  setTimeout(() => {
    resolveDuel(duel.id, tick + 2);
  }, 10000); // 2 ticks = 10 seconds

  return { success: true, narrative };
}

/**
 * Decline a duel
 */
export async function declineDuel(
  duel: Duel,
  decliner: Character,
  tick: number
): Promise<{ success: boolean; narrative: string }> {
  // Update duel status
  store.updateDuel(duel.id, { status: 'resolved' });

  // Lose reputation
  const newRep = Math.max(0, decliner.reputation + REPUTATION_MODIFIERS.DECLINE_DUEL);
  store.updateCharacter(decliner.id, {
    reputation: newRep,
    status: 'idle',
  });

  const { dayPhase } = getInGameTime(tick);
  const narrative = await narrate({
    character: decliner,
    room: decliner.currentRoom,
    timeOfDay: dayPhase,
    action: 'decline',
    actionDetails: 'backs down from the duel',
    otherCharacters: [],
  });

  const event = createEvent({
    type: 'duel_result',
    tick,
    room: decliner.currentRoom,
    actor: decliner.name,
    data: { declined: true, reputationLost: 5 },
    narrative,
  });

  broadcastToRoom(decliner.currentRoom, event);

  return { success: true, narrative };
}

/**
 * Resolve a duel (after prep phase)
 */
async function resolveDuel(duelId: string, tick: number): Promise<void> {
  const duel = store.getDuelById(duelId);
  if (!duel || duel.status === 'resolved') return;

  const challenger = store.getCharacterById(duel.challengerId);
  const challenged = store.getCharacterById(duel.challengedId);

  if (!challenger || !challenged) {
    store.updateDuel(duelId, { status: 'resolved' });
    return;
  }

  store.updateDuel(duelId, { status: 'in_progress' });

  // Resolve duel round
  const result = resolveDuelRound(challenger, challenged);

  // Apply damage to second shooter first (they get hit first)
  const secondShooterNewHealth = result.secondShooter.health - result.firstDamage;
  store.updateCharacter(result.secondShooter.id, {
    health: Math.max(0, secondShooterNewHealth),
    status: secondShooterNewHealth <= 0 ? 'dying' : 'in_duel',
  });

  let firstShooterNewHealth = result.firstShooter.health;
  let isFatal = false;

  // If second shooter survives, they shoot back
  if (secondShooterNewHealth > 0) {
    firstShooterNewHealth = result.firstShooter.health - result.secondDamage;
    store.updateCharacter(result.firstShooter.id, {
      health: Math.max(0, firstShooterNewHealth),
      status: firstShooterNewHealth <= 0 ? 'dying' : 'idle',
    });
  }

  // Determine winner
  let winner: Character | null = null;
  let loser: Character | null = null;

  if (secondShooterNewHealth <= 0 && firstShooterNewHealth > 0) {
    winner = result.firstShooter;
    loser = result.secondShooter;
    isFatal = true;
  } else if (firstShooterNewHealth <= 0 && secondShooterNewHealth > 0) {
    winner = result.secondShooter;
    loser = result.firstShooter;
    isFatal = true;
  } else if (secondShooterNewHealth <= 0 && firstShooterNewHealth <= 0) {
    // Both go down
    isFatal = true;
  }

  // Award reputation
  if (winner) {
    const repGain = isFatal ? 25 : REPUTATION_MODIFIERS.WIN_DUEL;
    store.updateCharacter(winner.id, {
      reputation: Math.min(100, winner.reputation + repGain),
      wantedLevel: isFatal ? Math.min(5, winner.wantedLevel + 1) : winner.wantedLevel,
      status: 'idle',
    });
  }

  // Mark duel as resolved
  store.updateDuel(duelId, {
    status: 'resolved',
    resolvedAt: tick,
    winner: winner?.id,
  });

  const { dayPhase } = getInGameTime(tick);
  const narrative = await narrate({
    character: result.firstShooter,
    room: ROOMS.STREET,
    timeOfDay: dayPhase,
    action: 'duel_result',
    actionDetails: result.narrativeInput + (winner ? `. ${winner.name} wins.` : '. Both fall.'),
    otherCharacters: [result.secondShooter.name],
  });

  const event = createEvent({
    type: 'duel_result',
    tick,
    room: ROOMS.STREET,
    data: {
      challenger: challenger.name,
      challenged: challenged.name,
      winner: winner?.name || null,
      loser: loser?.name || null,
      fatal: isFatal,
    },
    narrative,
  });

  broadcastToRoom(ROOMS.STREET, event);
  broadcastGlobal(event);
}

/**
 * Get pending duel for a character
 */
export function getPendingDuelForCharacter(characterId: string): Duel | undefined {
  return store.getPendingDuelForCharacter(characterId);
}
