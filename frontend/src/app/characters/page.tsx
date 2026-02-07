'use client';

import { useState, useEffect } from 'react';
import { getCharacters, type CharacterData } from '@/lib/api';
import CharacterCard from '@/components/spectator/CharacterCard';

type SortOption = 'reputation' | 'gold' | 'wanted' | 'health';

export default function CharactersPage() {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('reputation');
  const [filterNpc, setFilterNpc] = useState<boolean>(false);
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterData | null>(null);

  useEffect(() => {
    async function fetchCharacters() {
      const data = await getCharacters();
      setCharacters(data);
    }
    fetchCharacters();

    const interval = setInterval(fetchCharacters, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredCharacters = characters.filter((c) => !filterNpc || !c.isNpc);

  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    switch (sortBy) {
      case 'reputation':
        return b.reputation - a.reputation;
      case 'gold':
        return (b.gold || 0) - (a.gold || 0);
      case 'wanted':
        return b.wantedLevel - a.wantedLevel;
      case 'health':
        return b.health - a.health;
      default:
        return 0;
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="font-western text-3xl text-gold flex items-center space-x-3">
          <span>🤠</span>
          <span>Characters</span>
        </h1>
        <div className="flex items-center space-x-4">
          {/* Filter NPCs */}
          <label className="wood-panel px-3 py-2 flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={filterNpc}
              onChange={(e) => setFilterNpc(e.target.checked)}
              className="rounded bg-wood-dark border-wood-highlight text-gold focus:ring-gold"
            />
            <span className="text-parchment font-fell">Hide NPCs</span>
          </label>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="wood-panel px-3 py-2 text-sm text-parchment font-fell bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            <option value="reputation" className="bg-wood-dark">Sort by Reputation</option>
            <option value="gold" className="bg-wood-dark">Sort by Gold</option>
            <option value="wanted" className="bg-wood-dark">Sort by Wanted</option>
            <option value="health" className="bg-wood-dark">Sort by Health</option>
          </select>
        </div>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedCharacters.map((char) => (
          <CharacterCard
            key={char.name}
            character={char}
            onClick={() => setSelectedCharacter(char)}
          />
        ))}
      </div>

      {sortedCharacters.length === 0 && (
        <div className="wood-panel p-12 text-center">
          <p className="text-parchment/40 font-fell italic text-lg">
            No characters found...
          </p>
        </div>
      )}

      {/* Character Detail Modal */}
      {selectedCharacter && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedCharacter(null)}
        >
          <div
            className="wood-panel p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner decorations */}
            <div className="corner-decor tl" />
            <div className="corner-decor tr" />
            <div className="corner-decor bl" />
            <div className="corner-decor br" />

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-western text-2xl text-gold">
                  {selectedCharacter.name}
                </h2>
                <p className="text-parchment/60 font-fell capitalize">
                  {selectedCharacter.role.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={() => setSelectedCharacter(null)}
                className="western-btn px-3 py-1 text-sm"
              >
                ✕
              </button>
            </div>

            {selectedCharacter.backstory && (
              <div className="parchment-card p-4 mb-4">
                <h3 className="text-sm font-western text-wood-dark mb-1">
                  Backstory
                </h3>
                <p className="text-wood-medium font-fell italic">
                  &ldquo;{selectedCharacter.backstory}&rdquo;
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Health:</span>
                <span className="text-parchment">{selectedCharacter.health}/100</span>
              </div>
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Reputation:</span>
                <span className="text-parchment">{selectedCharacter.reputation}</span>
              </div>
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Gold:</span>
                <span className="text-gold">{selectedCharacter.gold || '?'}</span>
              </div>
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Wanted:</span>
                <span>
                  {selectedCharacter.wantedLevel > 0 ? (
                    <span className="wanted-star">{'★'.repeat(selectedCharacter.wantedLevel)}</span>
                  ) : (
                    <span className="text-parchment">Clean</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Status:</span>
                <span className="text-parchment capitalize">{selectedCharacter.status}</span>
              </div>
              <div className="flex justify-between font-fell">
                <span className="text-parchment/60">Location:</span>
                <span className="text-parchment">{selectedCharacter.currentRoom}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer spacer */}
      <div className="h-24" />
    </div>
  );
}
