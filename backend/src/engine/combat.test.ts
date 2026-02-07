import { describe, it, expect } from 'vitest';
import { resolveShooting, resolvePunch, resolveDuelRound, hasAmmo, deductAmmo } from './combat.js';
import type { Character } from '@deadwood/shared';

function createTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-id',
    name: 'Test Character',
    role: 'stranger',
    stats: { grit: 5, charm: 5, cunning: 5, luck: 5 },
    gold: 10,
    health: 100,
    reputation: 50,
    wantedLevel: 0,
    intoxication: 0,
    currentRoom: 'rusty_spur_saloon',
    inventory: ['revolver', '6 bullets'],
    status: 'idle',
    isNpc: false,
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('resolveShooting', () => {
  it('should return damage between expected range when hit', () => {
    const attacker = createTestCharacter({ stats: { grit: 5, charm: 5, cunning: 5, luck: 5 } });
    const defender = createTestCharacter();

    // Run multiple times to test randomness
    const results = [];
    for (let i = 0; i < 20; i++) {
      results.push(resolveShooting(attacker, defender));
    }

    // At least some should hit
    const hits = results.filter((r) => r.hit);
    expect(hits.length).toBeGreaterThan(0);

    // Check damage range when hit
    for (const hit of hits) {
      // Base damage: 15-30 + grit*2 = 15-30 + 10 = 25-40
      expect(hit.damage).toBeGreaterThanOrEqual(25);
      expect(hit.damage).toBeLessThanOrEqual(40);
    }
  });

  it('should have lower accuracy when intoxicated', () => {
    const sober = createTestCharacter({ intoxication: 0 });
    const drunk = createTestCharacter({ intoxication: 8 });
    const defender = createTestCharacter();

    let soberHits = 0;
    let drunkHits = 0;
    const trials = 100;

    for (let i = 0; i < trials; i++) {
      if (resolveShooting(sober, defender).hit) soberHits++;
      if (resolveShooting(drunk, defender).hit) drunkHits++;
    }

    // Sober should hit more often (statistically)
    expect(soberHits).toBeGreaterThan(drunkHits);
  });
});

describe('resolvePunch', () => {
  it('should deal less damage than shooting', () => {
    const attacker = createTestCharacter();
    const defender = createTestCharacter();

    const punchResults = [];
    const shootResults = [];

    for (let i = 0; i < 20; i++) {
      punchResults.push(resolvePunch(attacker, defender));
      shootResults.push(resolveShooting(attacker, defender));
    }

    const avgPunchDamage = punchResults.filter((r) => r.hit).reduce((sum, r) => sum + r.damage, 0) / punchResults.filter((r) => r.hit).length;
    const avgShootDamage = shootResults.filter((r) => r.hit).reduce((sum, r) => sum + r.damage, 0) / shootResults.filter((r) => r.hit).length;

    expect(avgPunchDamage).toBeLessThan(avgShootDamage);
  });
});

describe('resolveDuelRound', () => {
  it('should determine a first shooter based on stats', () => {
    const duelist1 = createTestCharacter({ name: 'Fast' });
    const duelist2 = createTestCharacter({ name: 'Slow' });

    const result = resolveDuelRound(duelist1, duelist2);

    expect([duelist1, duelist2]).toContain(result.firstShooter);
    expect([duelist1, duelist2]).toContain(result.secondShooter);
    expect(result.firstShooter).not.toBe(result.secondShooter);
  });

  it('should deal expected damage range', () => {
    const duelist1 = createTestCharacter({ stats: { grit: 5, charm: 5, cunning: 5, luck: 5 } });
    const duelist2 = createTestCharacter({ stats: { grit: 5, charm: 5, cunning: 5, luck: 5 } });

    const result = resolveDuelRound(duelist1, duelist2);

    // Damage = 20 + (Grit * 3) + random(1-15) = 20 + 15 + 1-15 = 36-50
    expect(result.firstDamage).toBeGreaterThanOrEqual(36);
    expect(result.firstDamage).toBeLessThanOrEqual(50);
    expect(result.secondDamage).toBeGreaterThanOrEqual(36);
    expect(result.secondDamage).toBeLessThanOrEqual(50);
  });

  it('should favor high grit characters for draw speed', () => {
    const fast = createTestCharacter({ name: 'Fast', stats: { grit: 10, charm: 1, cunning: 1, luck: 10 } });
    const slow = createTestCharacter({ name: 'Slow', stats: { grit: 1, charm: 1, cunning: 1, luck: 1 } });

    let fastWins = 0;
    for (let i = 0; i < 100; i++) {
      const result = resolveDuelRound(fast, slow);
      if (result.firstShooter === fast) fastWins++;
    }

    // Fast should win most of the time
    expect(fastWins).toBeGreaterThan(70);
  });
});

describe('hasAmmo', () => {
  it('should detect bullets in inventory', () => {
    expect(hasAmmo(createTestCharacter({ inventory: ['6 bullets'] }))).toBe(true);
    expect(hasAmmo(createTestCharacter({ inventory: ['revolver', '12 bullets'] }))).toBe(true);
    expect(hasAmmo(createTestCharacter({ inventory: ['1 bullet'] }))).toBe(true);
  });

  it('should return false when no ammo', () => {
    expect(hasAmmo(createTestCharacter({ inventory: ['revolver'] }))).toBe(false);
    expect(hasAmmo(createTestCharacter({ inventory: [] }))).toBe(false);
  });
});

describe('deductAmmo', () => {
  it('should reduce bullet count by 1', () => {
    const result = deductAmmo(['6 bullets']);
    expect(result).toEqual(['5 bullets']);
  });

  it('should remove bullet item when count reaches 0', () => {
    const result = deductAmmo(['1 bullet']);
    expect(result).toEqual([]);
  });

  it('should preserve other items', () => {
    const result = deductAmmo(['revolver', '6 bullets', 'whiskey']);
    expect(result).toContain('revolver');
    expect(result).toContain('whiskey');
    expect(result).toContain('5 bullets');
  });
});
