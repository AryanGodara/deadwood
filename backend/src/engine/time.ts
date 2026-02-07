import { TICK_DURATION_MS, MINUTES_PER_GAME_HOUR, type DayPhase } from '../shared/index.js';

/**
 * Convert tick number to in-game time
 * 1 real minute = 1 game hour
 * 1 tick = 5 seconds = 5/60 minutes = 5/60 game hours = 5 game minutes
 */
export function getInGameTime(tick: number): {
  hours: number;
  minutes: number;
  dayPhase: DayPhase;
  formatted: string;
} {
  // Each tick is 5 seconds real time
  const realSecondsElapsed = tick * (TICK_DURATION_MS / 1000);
  const realMinutesElapsed = realSecondsElapsed / 60;

  // 1 real minute = 1 game hour
  const gameHoursElapsed = realMinutesElapsed * MINUTES_PER_GAME_HOUR;

  // Game starts at 6 AM (hour 6)
  const totalGameHours = 6 + gameHoursElapsed;

  // Wrap around 24 hours
  const hours = Math.floor(totalGameHours) % 24;
  const minutes = Math.floor((totalGameHours % 1) * 60);

  // Determine day phase
  let dayPhase: DayPhase;
  if (hours >= 6 && hours < 12) {
    dayPhase = 'morning';
  } else if (hours >= 12 && hours < 18) {
    dayPhase = 'afternoon';
  } else if (hours >= 18 && hours < 24) {
    dayPhase = 'evening';
  } else {
    dayPhase = 'night';
  }

  // Format time string
  const displayHour = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formatted = `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;

  return { hours, minutes, dayPhase, formatted };
}

/**
 * Get phase icon for display
 */
export function getDayPhaseIcon(phase: DayPhase): string {
  switch (phase) {
    case 'morning':
      return '☀️';
    case 'afternoon':
      return '🌤️';
    case 'evening':
      return '🌅';
    case 'night':
      return '🌙';
  }
}

/**
 * Check if it's night time (stealth bonus applies)
 */
export function isNightTime(tick: number): boolean {
  const { dayPhase } = getInGameTime(tick);
  return dayPhase === 'night';
}
