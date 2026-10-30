import React from 'react';

export default function HintPanel({
  hints = [],
  hintsRemaining = 0,
  onRequestHint,
  isLoading = false,
}) {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-md space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" role="img" aria-label="light bulb">💡</span>
          <h3 className="font-mono text-sm uppercase tracking-wider font-bold text-zinc-100">
            Detective Whispers & Hints
          </h3>
        </div>
        <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2.5 py-1 rounded-full font-semibold">
          {hintsRemaining} {hintsRemaining === 1 ? 'hint' : 'hints'} remaining
        </span>
      </div>

      <p className="text-xs text-zinc-400">
        Stuck in the investigation? Requesting an AI hint costs <strong className="text-rose-400 font-mono">-10 points</strong> from your provisional score.
      </p>

      {/* Revealed hints list */}
      {hints.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-950/40 rounded-lg p-3 text-center text-xs text-zinc-500 italic">
          No hints requested yet. Your provisional score remains unpenalized.
        </div>
      ) : (
        <div className="space-y-2">
          {hints.map((hint, idx) => (
            <div
              key={hint.id || idx}
              className="bg-zinc-950/60 border-l-2 border-amber-500 p-3 rounded-r-lg text-xs text-zinc-200"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold text-[11px] text-amber-400 uppercase tracking-wide">
                  Hint #{idx + 1}
                </span>
                <span className="text-[10px] text-rose-400 font-mono font-semibold">-10 pts</span>
              </div>
              <p className="leading-relaxed text-zinc-300 font-serif">{hint.text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onRequestHint}
          disabled={hintsRemaining <= 0 || isLoading}
          className={`w-full py-2.5 px-4 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow ${
            hintsRemaining <= 0
              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
              : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-500 active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
              <span>Deciphering Clue...</span>
            </>
          ) : hintsRemaining <= 0 ? (
            <span>No Hints Remaining</span>
          ) : (
            <>
              <span>💡</span>
              <span>Request Hint (-10 pts)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
