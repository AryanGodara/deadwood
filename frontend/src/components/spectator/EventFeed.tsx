'use client';

import { useEffect, useState } from 'react';
import type { EventData } from '@/lib/api';

interface EventFeedProps {
  events: EventData[];
}

function getEventIcon(type: string): string {
  switch (type) {
    case 'action':
      return '💬';
    case 'enter':
      return '🚪';
    case 'leave':
      return '👋';
    case 'combat':
      return '💥';
    case 'duel_challenge':
      return '⚔️';
    case 'duel_result':
      return '🎯';
    case 'ambient':
      return '🌵';
    case 'world_announcement':
      return '📢';
    default:
      return '•';
  }
}

function getEventStyle(type: string): string {
  switch (type) {
    case 'combat':
    case 'duel_result':
      return 'border-l-4 border-l-blood';
    case 'duel_challenge':
      return 'border-l-4 border-l-gold';
    case 'world_announcement':
      return 'border-l-4 border-l-gold bg-gold/5';
    default:
      return 'border-l-4 border-l-wood-highlight';
  }
}

export default function EventFeed({ events }: EventFeedProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center text-parchment/40 font-fell italic">
        Loading events...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-parchment/40 font-fell italic">
        No events yet. The town is quiet...
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-y-auto max-h-[600px] pr-2">
      {events.map((event, index) => (
        <div
          key={event.id || index}
          className={`parchment-card p-4 ${getEventStyle(event.type)} ${
            index === 0 ? 'animate-fade-in' : ''
          }`}
        >
          <div className="flex items-start space-x-3">
            <span className="text-lg flex-shrink-0">{getEventIcon(event.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-wood-dark font-fell leading-relaxed">{event.narrative}</p>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-wood-medium/60">
                <span className="font-western">Tick {event.tick}</span>
                {event.actor && (
                  <span className="flex items-center space-x-1">
                    <span>•</span>
                    <span className="font-fell">{event.actor}</span>
                  </span>
                )}
                {event.room && (
                  <span className="flex items-center space-x-1">
                    <span>•</span>
                    <span className="font-fell">{event.room}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
