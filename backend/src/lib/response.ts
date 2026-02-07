import type { Response } from 'express';
import type { DayPhase } from '../shared/index.js';
import { store } from '../store/index.js';
import { getInGameTime } from '../engine/time.js';

interface SuccessOptions<T> {
  data: T;
  status?: number;
}

interface ErrorOptions {
  code: string;
  message: string;
  status?: number;
}

/**
 * Send a success response with standard envelope
 */
export function success<T>(res: Response, options: SuccessOptions<T>): void {
  const tick = store.getTick();
  const { formatted, dayPhase } = getInGameTime(tick);

  res.status(options.status || 200).json({
    ok: true,
    data: options.data,
    meta: {
      tick,
      inGameTime: formatted,
      dayPhase,
      timestamp: Date.now(),
    },
  });
}

/**
 * Send an error response with standard envelope
 */
export function error(res: Response, options: ErrorOptions): void {
  res.status(options.status || 400).json({
    ok: false,
    error: {
      code: options.code,
      message: options.message,
    },
  });
}

/**
 * Get current meta for responses
 */
export function getMeta(): {
  tick: number;
  inGameTime: string;
  dayPhase: DayPhase;
  timestamp: number;
} {
  const tick = store.getTick();
  const { formatted, dayPhase } = getInGameTime(tick);

  return {
    tick,
    inGameTime: formatted,
    dayPhase,
    timestamp: Date.now(),
  };
}
