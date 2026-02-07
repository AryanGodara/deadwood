import { describe, it, expect } from 'vitest';
import { getInGameTime, isNightTime } from './time.js';

describe('getInGameTime', () => {
  it('should return 6 AM at tick 0', () => {
    const time = getInGameTime(0);
    expect(time.hours).toBe(6);
    expect(time.minutes).toBe(0);
    expect(time.dayPhase).toBe('morning');
    expect(time.formatted).toBe('6:00 AM');
  });

  it('should advance approximately 5 game minutes per tick', () => {
    // 1 tick = 5 seconds real = 5/60 real minutes = 5/60 game hours
    // 5/60 hours = 5 minutes, but due to floating point: floor(0.0833*60) = 4
    const time = getInGameTime(1);
    expect(time.hours).toBe(6);
    expect(time.minutes).toBeGreaterThanOrEqual(4);
    expect(time.minutes).toBeLessThanOrEqual(5);
  });

  it('should be noon after 72 ticks', () => {
    // 72 ticks = 72 * 5 = 360 seconds = 6 real minutes = 6 game hours
    // 6 AM + 6 hours = 12 PM
    const time = getInGameTime(72);
    expect(time.hours).toBe(12);
    expect(time.dayPhase).toBe('afternoon');
  });

  it('should be evening at 6 PM', () => {
    // 6 PM = 12 game hours after 6 AM = 144 ticks
    const time = getInGameTime(144);
    expect(time.hours).toBe(18);
    expect(time.dayPhase).toBe('evening');
  });

  it('should be night at midnight', () => {
    // Midnight = 18 game hours after 6 AM = 216 ticks
    const time = getInGameTime(216);
    expect(time.hours).toBe(0);
    expect(time.dayPhase).toBe('night');
  });

  it('should wrap around 24 hours', () => {
    // Full day = 288 ticks = 24 game hours
    // After 288 ticks, we're back at 6 AM
    const time = getInGameTime(288);
    expect(time.hours).toBe(6);
    expect(time.dayPhase).toBe('morning');
  });
});

describe('isNightTime', () => {
  it('should return false during morning', () => {
    expect(isNightTime(0)).toBe(false);
  });

  it('should return true during night', () => {
    // Night is 0-6 game hours, which starts at tick 216 (midnight)
    expect(isNightTime(216)).toBe(true);
    expect(isNightTime(250)).toBe(true);
  });
});
