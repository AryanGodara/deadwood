'use client';

import { useWorldState } from '@/hooks/useWorldState';

function getDayPhaseIcon(phase: string): string {
  switch (phase) {
    case 'morning':
      return '☀️';
    case 'afternoon':
      return '🌤️';
    case 'evening':
      return '🌅';
    case 'night':
      return '🌙';
    default:
      return '🕐';
  }
}

export default function WorldClock() {
  const { time, isLoading } = useWorldState();

  if (isLoading || !time) {
    return (
      <div className="wood-panel px-4 py-2 flex items-center space-x-2">
        <span>🕐</span>
        <span className="text-parchment/40 font-fell">Loading...</span>
      </div>
    );
  }

  return (
    <div className="wood-panel px-4 py-2 flex items-center space-x-3">
      <span className="text-2xl">{getDayPhaseIcon(time.dayPhase)}</span>
      <div>
        <div className="font-western text-gold">{time.inGameTime}</div>
        <div className="text-xs text-parchment/50 capitalize font-fell">{time.dayPhase}</div>
      </div>
      <div className="text-xs text-parchment/30 border-l border-wood-highlight/30 pl-3 font-western">
        Tick {time.tick}
      </div>
    </div>
  );
}
