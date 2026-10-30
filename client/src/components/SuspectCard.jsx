import React from 'react';

// Generates a deterministic avatar icon and color based on suspect ID
function getSuspectVisuals(id = '') {
  const icons = ['🕵️', '🎩', '💼', '🧤', '👓', '👠', '🍷'];
  const colors = [
    'from-indigo-900 to-zinc-900 border-indigo-700/50',
    'from-emerald-900 to-zinc-900 border-emerald-700/50',
    'from-amber-900 to-zinc-900 border-amber-700/50',
    'from-purple-900 to-zinc-900 border-purple-700/50',
    'from-rose-900 to-zinc-900 border-rose-700/50',
  ];
  const charCode = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return {
    icon: icons[charCode % icons.length],
    gradient: colors[charCode % colors.length],
  };
}

export default function SuspectCard({ suspect, isSelectable = false, isSelected = false, onSelect }) {
  const { icon, gradient } = getSuspectVisuals(suspect.id);

  const baseClasses =
    'relative rounded-xl border p-5 transition-all duration-200 bg-zinc-900/90 backdrop-blur shadow-md flex flex-col justify-between';
  const selectableClasses = isSelectable
    ? 'cursor-pointer hover:border-amber-500/80 hover:shadow-amber-500/10 hover:scale-[1.01]'
    : 'border-zinc-800';
  const selectedClasses = isSelected
    ? 'ring-2 ring-amber-400 border-amber-400 bg-zinc-900 shadow-amber-500/20'
    : '';

  return (
    <div
      onClick={isSelectable && onSelect ? () => onSelect(suspect.id) : undefined}
      className={`${baseClasses} ${selectableClasses} ${selectedClasses}`}
    >
      {isSelected && (
        <span className="absolute top-3 right-3 bg-amber-400 text-zinc-950 text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
          <span>✓</span> Selected
        </span>
      )}

      <div>
        {/* Header: Portrait avatar + Name */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`w-12 h-12 rounded-lg bg-gradient-to-br ${gradient} border flex items-center justify-center text-2xl shadow-inner flex-shrink-0`}
          >
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-base text-zinc-100 tracking-wide font-mono">
              {suspect.name}
            </h4>
            <span className="text-xs text-zinc-400 uppercase tracking-widest font-mono">
              Suspect #{suspect.id?.replace('suspect_', '')}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {suspect.description}
          </p>
        </div>
      </div>

      {/* Alibi Box */}
      <div className="mt-2 pt-3 border-t border-zinc-800/80 bg-zinc-950/40 -mx-5 -mb-5 p-4 rounded-b-xl">
        <span className="text-[10px] uppercase font-mono tracking-wider text-amber-400/90 font-bold block mb-1">
          Alibi Statement
        </span>
        <blockquote className="text-xs italic text-zinc-400 border-l-2 border-amber-500/40 pl-2 leading-relaxed">
          &ldquo;{suspect.alibi}&rdquo;
        </blockquote>
      </div>
    </div>
  );
}
