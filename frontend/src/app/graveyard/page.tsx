'use client';

import { useState, useEffect } from 'react';
import { getGraveyard, type GraveyardCharacter } from '@/lib/api';

export default function GraveyardPage() {
  const [dead, setDead] = useState<GraveyardCharacter[]>([]);

  useEffect(() => {
    async function fetchGraveyard() {
      const data = await getGraveyard();
      setDead(data);
    }
    fetchGraveyard();
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">⚰️</div>
        <h1 className="font-western text-4xl text-parchment/80 mb-2">
          Boot Hill
        </h1>
        <p className="text-parchment/40 italic font-fell">Rest in Peace</p>
      </div>

      {/* Tombstones */}
      {dead.length === 0 ? (
        <div className="wood-panel p-12 text-center">
          <div className="text-4xl mb-4">🪦</div>
          <p className="text-parchment/60 text-lg font-fell">
            The graveyard stands empty... for now.
          </p>
          <p className="text-parchment/30 text-sm mt-2 font-fell">
            No one has died in Deadwood yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dead.map((char, i) => (
            <div
              key={i}
              className="relative"
            >
              {/* Tombstone shape */}
              <div className="bg-gradient-to-b from-gray-600 via-gray-700 to-gray-800 rounded-t-[100px] p-6 pt-12 border-4 border-gray-500 shadow-xl">
                {/* Cross decoration */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                  <div className="w-1 h-8 bg-gray-500" />
                  <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-1 bg-gray-500" />
                </div>

                {/* R.I.P. */}
                <div className="text-center mb-4">
                  <span className="font-western text-gray-400 text-lg">R.I.P.</span>
                </div>

                {/* Name */}
                <h2 className="font-western text-2xl text-parchment text-center mb-2">
                  {char.name}
                </h2>

                {/* Role */}
                <p className="text-center text-parchment/50 font-fell mb-4 capitalize">
                  {char.role.replace('_', ' ')}
                </p>

                {/* Cause of death */}
                {char.causeOfDeath && (
                  <div className="text-center mb-4 p-3 bg-black/30 rounded">
                    <p className="text-sm text-parchment/60 italic font-fell">
                      &ldquo;{char.causeOfDeath}&rdquo;
                    </p>
                  </div>
                )}

                {/* Backstory as epitaph */}
                {char.backstory && (
                  <p className="text-center text-sm text-parchment/40 italic font-fell mb-4">
                    {char.backstory}
                  </p>
                )}

                {/* Stats */}
                <div className="flex justify-center space-x-6 text-xs text-parchment/30 font-fell border-t border-gray-600 pt-3">
                  <span>Reputation: {char.reputation}</span>
                  {char.diedAt && (
                    <span>
                      Died: {new Date(char.diedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              {/* Tombstone base */}
              <div className="h-4 bg-gradient-to-b from-gray-800 to-gray-900 mx-8 rounded-b" />
            </div>
          ))}
        </div>
      )}

      {/* Footer spacer */}
      <div className="h-24" />
    </div>
  );
}
