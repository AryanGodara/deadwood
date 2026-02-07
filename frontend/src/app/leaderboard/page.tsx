'use client';

import { useState, useEffect } from 'react';
import { getLeaderboard, type LeaderboardEntry } from '@/lib/api';

type Tab = 'reputation' | 'gold' | 'wanted';

const TAB_INFO: Record<Tab, { label: string; icon: string }> = {
  reputation: { label: 'Reputation', icon: '⭐' },
  gold: { label: 'Wealth', icon: '💰' },
  wanted: { label: 'Most Wanted', icon: '🤠' },
};

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>('reputation');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    async function fetchLeaderboard() {
      const data = await getLeaderboard(tab === 'wanted' ? 'wanted' : tab);
      setLeaderboard(data);
    }
    fetchLeaderboard();
  }, [tab]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { badge: '🥇', style: 'text-yellow-400' };
    if (rank === 2) return { badge: '🥈', style: 'text-gray-300' };
    if (rank === 3) return { badge: '🥉', style: 'text-amber-600' };
    return { badge: `#${rank}`, style: 'text-parchment/50' };
  };

  const formatValue = (entry: LeaderboardEntry) => {
    switch (tab) {
      case 'reputation':
        return <span className="text-parchment">{entry.reputation} rep</span>;
      case 'gold':
        return <span className="text-gold">{entry.gold} gold</span>;
      case 'wanted':
        return entry.wantedLevel > 0 ? (
          <span className="wanted-star">{'★'.repeat(entry.wantedLevel)}</span>
        ) : (
          <span className="text-parchment/40">Clean</span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <h1 className="font-western text-3xl text-gold mb-6 flex items-center space-x-3">
        <span>🏆</span>
        <span>Leaderboard</span>
      </h1>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6">
        {(Object.keys(TAB_INFO) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`western-tab flex items-center space-x-2 ${
              tab === t ? 'active' : ''
            }`}
          >
            <span>{TAB_INFO[t].icon}</span>
            <span>{TAB_INFO[t].label}</span>
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="wood-panel overflow-hidden">
        {/* Table Header */}
        <div className="wood-header grid grid-cols-12 gap-4 px-4 py-3 text-sm font-western">
          <div className="col-span-2 text-gold/80">Rank</div>
          <div className="col-span-4 text-gold/80">Name</div>
          <div className="col-span-3 text-gold/80">Role</div>
          <div className="col-span-3 text-right text-gold/80">
            {TAB_INFO[tab].label}
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-wood-highlight/20">
          {leaderboard.map((entry, i) => {
            const { badge, style } = getRankBadge(entry.rank);
            return (
              <div
                key={entry.name}
                className={`grid grid-cols-12 gap-4 px-4 py-3 items-center ${
                  i < 3 ? 'bg-gold/5' : ''
                }`}
              >
                <div className="col-span-2">
                  <span className={`text-xl ${style}`}>{badge}</span>
                </div>
                <div className="col-span-4">
                  <span className={`font-western ${i < 3 ? 'text-gold' : 'text-parchment'}`}>
                    {entry.name}
                  </span>
                </div>
                <div className="col-span-3 text-parchment/60 font-fell capitalize">
                  {entry.role.replace('_', ' ')}
                </div>
                <div className="col-span-3 text-right font-western">
                  {formatValue(entry)}
                </div>
              </div>
            );
          })}
        </div>

        {leaderboard.length === 0 && (
          <div className="py-12 text-center text-parchment/40 font-fell italic">
            No entries yet...
          </div>
        )}
      </div>

      {/* Footer spacer */}
      <div className="h-24" />
    </div>
  );
}
