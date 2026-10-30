import React from 'react';

export default function ScoreTracker({ score, cluesDiscovered, totalClues, hintsUsed, totalHints }) {
  const currentScore = score?.provisional ?? score?.base ?? 100;
  const clueProgress = totalClues > 0 ? Math.round((cluesDiscovered / totalClues) * 100) : 0;

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 shadow-md backdrop-blur">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 items-center">
        {/* Score pill */}
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
            Current Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">
              {currentScore}
            </span>
            <span className="text-xs text-zinc-500">pts</span>
          </div>
        </div>

        {/* Clues progress */}
        <div className="flex flex-col">
          <div className="flex justify-between items-center text-xs text-zinc-400 font-mono mb-1">
            <span>Clues Found</span>
            <span className="text-zinc-200 font-bold">{cluesDiscovered} / {totalClues}</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden border border-zinc-700/50">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${clueProgress}%` }}
            />
          </div>
        </div>

        {/* Hints used */}
        <div className="col-span-2 md:col-span-1 flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800">
          <div className="text-right">
            <span className="block text-xs uppercase tracking-wider text-zinc-400 font-mono">Hints Used</span>
            <span className="text-sm font-semibold text-zinc-200">
              {hintsUsed} <span className="text-zinc-500">/ {totalHints}</span>
            </span>
          </div>
          <span className="text-2xl" role="img" aria-label="light bulb">💡</span>
        </div>
      </div>
    </div>
  );
}
