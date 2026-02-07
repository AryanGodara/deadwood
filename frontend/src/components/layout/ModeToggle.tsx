'use client';

import { useState } from 'react';

type Mode = 'human' | 'bot';

interface ModeToggleProps {
  onModeChange?: (mode: Mode) => void;
}

export default function ModeToggle({ onModeChange }: ModeToggleProps) {
  const [mode, setMode] = useState<Mode>('human');

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <div className="wood-panel p-2 max-w-md mx-auto">
      <div className="flex">
        <button
          onClick={() => handleModeChange('human')}
          className={`flex-1 px-6 py-3 rounded-lg font-western text-sm transition-all flex items-center justify-center space-x-2 ${
            mode === 'human'
              ? 'bg-gradient-to-b from-gold-light via-gold to-gold-dark text-wood-dark shadow-gold'
              : 'text-parchment/60 hover:text-parchment'
          }`}
        >
          <span className="text-xl">🤠</span>
          <span>I&apos;m a Human</span>
        </button>
        <button
          onClick={() => handleModeChange('bot')}
          className={`flex-1 px-6 py-3 rounded-lg font-western text-sm transition-all flex items-center justify-center space-x-2 ${
            mode === 'bot'
              ? 'bg-gradient-to-b from-gold-light via-gold to-gold-dark text-wood-dark shadow-gold'
              : 'text-parchment/60 hover:text-parchment'
          }`}
        >
          <span className="text-xl">🤖</span>
          <span>I&apos;m a Bot</span>
        </button>
      </div>
    </div>
  );
}

export type { Mode };
