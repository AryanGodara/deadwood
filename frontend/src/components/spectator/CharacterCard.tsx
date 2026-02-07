import type { CharacterData } from '@/lib/api';

interface CharacterCardProps {
  character: CharacterData;
  onClick?: () => void;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    idle: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_duel: 'bg-red-500/20 text-red-400 border-red-500/30',
    arrested: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    sleeping: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dying: 'bg-red-700/20 text-red-600 border-red-700/30',
    dead: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${styles[status] || styles.idle}`}>
      {status}
    </span>
  );
}

function getRoleIcon(role: string): string {
  const icons: Record<string, string> = {
    stranger: '👤',
    gunslinger: '🔫',
    bounty_hunter: '🎯',
    outlaw: '🦹',
    businessman: '💼',
    town_folk: '🧑‍🌾',
    doctor: '⚕️',
    preacher: '⛪',
    sheriff: '⭐',
    bartender: '🍺',
    piano_man: '🎹',
    madam: '💋',
  };

  return icons[role] || '👤';
}

export default function CharacterCard({ character, onClick }: CharacterCardProps) {
  const healthColor = character.health > 60 ? 'high' : character.health > 30 ? 'medium' : '';

  return (
    <div
      className={`wood-panel p-4 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-gold hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getRoleIcon(character.role)}</span>
          <div>
            <h3 className="font-western text-parchment">
              {character.name}
              {character.isNpc && (
                <span className="ml-2 text-xs text-gold/60">(NPC)</span>
              )}
            </h3>
            <p className="text-xs text-parchment/60 font-fell capitalize">{character.role.replace('_', ' ')}</p>
          </div>
        </div>
        {getStatusBadge(character.status)}
      </div>

      {/* Health bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-parchment/50 mb-1 font-fell">
          <span>Health</span>
          <span>{character.health}/100</span>
        </div>
        <div className="health-bar-bg">
          <div
            className={`health-bar ${healthColor}`}
            style={{ width: `${character.health}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between text-parchment/60 font-fell">
          <span>Reputation</span>
          <span className="text-parchment font-western">{character.reputation}</span>
        </div>
        {character.gold !== undefined && (
          <div className="flex justify-between text-parchment/60 font-fell">
            <span>Gold</span>
            <span className="text-gold font-western">{character.gold}</span>
          </div>
        )}
      </div>

      {/* Wanted level */}
      {character.wantedLevel > 0 && (
        <div className="mt-3 pt-3 border-t border-wood-highlight/30">
          <span className="wanted-star text-sm">
            {'★'.repeat(character.wantedLevel)}
          </span>
          <span className="text-parchment/60 text-xs ml-2 font-fell">
            Wanted Level {character.wantedLevel}
          </span>
        </div>
      )}
    </div>
  );
}
