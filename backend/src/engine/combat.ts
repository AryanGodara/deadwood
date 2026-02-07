import type { Character } from '@deadwood/shared';

/**
 * Resolve a shooting attack outside of a duel
 * Returns damage dealt (can be 0 if miss)
 */
export function resolveShooting(
  attacker: Character,
  defender: Character
): {
  hit: boolean;
  damage: number;
  narrativeInput: string;
} {
  // Base hit chance: 60% + (grit * 3) - (intoxication * 5)
  const hitChance = 60 + attacker.stats.grit * 3 - attacker.intoxication * 5;
  const roll = Math.random() * 100;

  if (roll > hitChance) {
    return {
      hit: false,
      damage: 0,
      narrativeInput: `${attacker.name} fires at ${defender.name} but the shot goes wide`,
    };
  }

  // Damage: 15-30 base + (grit * 2)
  const baseDamage = 15 + Math.floor(Math.random() * 16);
  const damage = baseDamage + attacker.stats.grit * 2;

  const severity = damage > 25 ? 'grievously' : damage > 18 ? 'badly' : 'grazed';

  return {
    hit: true,
    damage,
    narrativeInput: `${attacker.name}'s bullet finds ${defender.name}, ${severity} wounded`,
  };
}

/**
 * Resolve a punch/brawl attack
 * Returns damage dealt (can be 0 if miss)
 */
export function resolvePunch(
  attacker: Character,
  defender: Character
): {
  hit: boolean;
  damage: number;
  narrativeInput: string;
} {
  // Base hit chance: 70% + (grit * 2) - (intoxication * 4)
  const hitChance = 70 + attacker.stats.grit * 2 - attacker.intoxication * 4;
  const roll = Math.random() * 100;

  if (roll > hitChance) {
    return {
      hit: false,
      damage: 0,
      narrativeInput: `${attacker.name} swings at ${defender.name} but misses`,
    };
  }

  // Damage: 5-15 base + (grit * 1)
  const baseDamage = 5 + Math.floor(Math.random() * 11);
  const damage = baseDamage + attacker.stats.grit;

  const severity = damage > 12 ? 'a solid blow' : damage > 8 ? 'a decent hit' : 'a glancing blow';

  return {
    hit: true,
    damage,
    narrativeInput: `${attacker.name} lands ${severity} on ${defender.name}`,
  };
}

/**
 * Resolve a duel round
 * Formula from GAME_DESIGN.md:
 * Draw Speed = (Grit × 2) + (Luck × 1.5) - (Intoxication × 3) + random(1-10)
 * Damage = 20 + (Grit × 3) + random(1-15)
 */
export function resolveDuelRound(
  duelist1: Character,
  duelist2: Character
): {
  firstShooter: Character;
  secondShooter: Character;
  firstDamage: number;
  secondDamage: number;
  narrativeInput: string;
} {
  // Calculate draw speeds
  const speed1 =
    duelist1.stats.grit * 2 +
    duelist1.stats.luck * 1.5 -
    duelist1.intoxication * 3 +
    Math.random() * 10;
  const speed2 =
    duelist2.stats.grit * 2 +
    duelist2.stats.luck * 1.5 -
    duelist2.intoxication * 3 +
    Math.random() * 10;

  const firstShooter = speed1 >= speed2 ? duelist1 : duelist2;
  const secondShooter = speed1 >= speed2 ? duelist2 : duelist1;

  // First shooter's damage
  const firstDamage = 20 + firstShooter.stats.grit * 3 + Math.floor(Math.random() * 15) + 1;

  // Second shooter's damage (only if they survive)
  const secondDamage = 20 + secondShooter.stats.grit * 3 + Math.floor(Math.random() * 15) + 1;

  const narrativeInput = `${firstShooter.name} draws first`;

  return {
    firstShooter,
    secondShooter,
    firstDamage,
    secondDamage,
    narrativeInput,
  };
}

/**
 * Check if a character has ammo
 */
export function hasAmmo(character: Character): boolean {
  return character.inventory.some(
    (item) =>
      item.includes('bullet') ||
      item.includes('bullets') ||
      item.includes('ammo')
  );
}

/**
 * Deduct one round of ammo from inventory
 */
export function deductAmmo(inventory: string[]): string[] {
  const newInventory = [...inventory];

  for (let i = 0; i < newInventory.length; i++) {
    const item = newInventory[i];
    const bulletMatch = item.match(/^(\d+)\s*bullets?$/i);

    if (bulletMatch) {
      const count = parseInt(bulletMatch[1], 10);
      if (count > 1) {
        newInventory[i] = `${count - 1} bullets`;
      } else {
        newInventory.splice(i, 1);
      }
      return newInventory;
    }
  }

  return newInventory;
}
