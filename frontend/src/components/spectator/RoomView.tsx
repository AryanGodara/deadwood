'use client';

import type { CharacterData } from '@/lib/api';

interface RoomViewProps {
  roomName: string;
  description: string;
  characters: CharacterData[];
  items: string[];
  exits: string[];
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'idle':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'in_duel':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'arrested':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'sleeping':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'dying':
      return 'bg-red-700/20 text-red-600 border-red-700/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

function HealthBar({ health }: { health: number }) {
  const width = Math.max(0, Math.min(100, health));
  const colorClass = health > 60 ? 'high' : health > 30 ? 'medium' : '';

  return (
    <div className="health-bar-bg">
      <div
        className={`health-bar ${colorClass}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function RoomView({
  roomName,
  description,
  characters,
  items,
  exits,
}: RoomViewProps) {
  return (
    <div className="space-y-4">
      {/* Room info */}
      <div className="parchment-card p-4">
        <h3 className="font-western text-lg text-wood-dark mb-2">{roomName}</h3>
        <p className="text-sm text-wood-medium font-fell italic">{description}</p>
      </div>

      {/* Characters */}
      <div>
        <h4 className="text-sm font-western text-gold mb-2 flex items-center space-x-2">
          <span>🤠</span>
          <span>Characters ({characters.length})</span>
        </h4>
        <div className="space-y-2">
          {characters.length === 0 ? (
            <p className="text-sm text-parchment/40 italic font-fell">Nobody here...</p>
          ) : (
            characters.map((char) => (
              <div
                key={char.name}
                className="wood-panel p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-western text-sm text-parchment">
                    {char.name}
                    {char.isNpc && (
                      <span className="ml-2 text-xs text-gold/60">(NPC)</span>
                    )}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getStatusColor(char.status)}`}>
                    {char.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-parchment/60 mb-2">
                  <span className="font-fell">{char.role}</span>
                  <span>Rep: {char.reputation}</span>
                </div>
                <HealthBar health={char.health} />
                {char.wantedLevel > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="wanted-star">{'★'.repeat(char.wantedLevel)}</span>
                    <span className="text-parchment/60 ml-1">Wanted</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Items */}
      {items.length > 0 && (
        <div>
          <h4 className="text-sm font-western text-gold mb-2 flex items-center space-x-2">
            <span>📦</span>
            <span>Items</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span
                key={item}
                className="px-2 py-1 text-xs bg-wood-dark/50 rounded border border-wood-highlight/30 text-parchment/70 font-fell"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Exits */}
      <div>
        <h4 className="text-sm font-western text-gold mb-2 flex items-center space-x-2">
          <span>🚪</span>
          <span>Exits</span>
        </h4>
        <div className="flex flex-wrap gap-2">
          {exits.map((exit) => (
            <span
              key={exit}
              className="px-3 py-1.5 text-xs bg-gradient-to-b from-wood-light to-wood-medium rounded border-2 border-wood-highlight text-gold font-western"
            >
              → {exit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
