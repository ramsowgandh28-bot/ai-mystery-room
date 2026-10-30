import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ title, difficulty }) {
  const location = useLocation();
  const isCreate = location.pathname === '/create';

  const difficultyColors = {
    easy: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    medium: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    hard: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
  };

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 text-zinc-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <span className="text-2xl" role="img" aria-label="magnifying glass">🔍</span>
          <span className="font-bold tracking-wider text-lg md:text-xl text-amber-400 group-hover:text-amber-300 transition-colors uppercase font-mono">
            AI Mystery Room
          </span>
        </Link>

        {title && (
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono">Case:</span>
            <span className="text-sm font-medium text-zinc-200 truncate max-w-xs">{title}</span>
            {difficulty && (
              <span className={`text-xs px-2.5 py-0.5 rounded-full border uppercase tracking-wider font-semibold ${difficultyColors[difficulty] || ''}`}>
                {difficulty}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          {!isCreate && (
            <Link
              to="/create"
              className="text-xs md:text-sm bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 md:px-4 md:py-2 rounded shadow transition-all hover:scale-105"
            >
              + New Mystery
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
