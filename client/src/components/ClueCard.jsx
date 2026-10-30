import React from 'react';

export default function ClueCard({ clue, index }) {
  const clueNumber = index + 1;
  const isDiscovered = Boolean(clue?.discovered);

  if (!isDiscovered) {
    return (
      <div className="border border-dashed border-zinc-800 bg-zinc-950/40 rounded-xl p-4 flex items-center justify-between text-zinc-500 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xl" role="img" aria-label="locked">🔒</span>
          <div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Clue #{clueNumber}
            </span>
            <p className="text-xs text-zinc-500 italic mt-0.5">
              Not yet discovered. Investigate further to uncover this lead.
            </p>
          </div>
        </div>
        <span className="text-xs font-mono text-zinc-600 border border-zinc-800 px-2 py-0.5 rounded">
          +5 pts
        </span>
      </div>
    );
  }

  return (
    <div className="border border-amber-600/40 bg-zinc-900/90 rounded-xl p-4 shadow-md backdrop-blur transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" role="img" aria-label="unlocked evidence">📂</span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-400">
            Clue #{clueNumber} Discovered
          </span>
        </div>
        <span className="text-[11px] font-mono bg-amber-950/80 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full font-semibold">
          +5 Bonus
        </span>
      </div>

      <p className="text-sm text-zinc-200 leading-relaxed pl-1 font-serif">
        {clue.text}
      </p>

      {clue.discoveredAt && (
        <div className="mt-2 text-right">
          <span className="text-[10px] text-zinc-500 font-mono">
            Found at {new Date(clue.discoveredAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
