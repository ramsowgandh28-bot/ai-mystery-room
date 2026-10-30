import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AlertBanner from '../components/AlertBanner';

export default function Home() {
  const [toastMessage, setToastMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      const flash = sessionStorage.getItem('flash_toast');
      if (flash) {
        sessionStorage.removeItem('flash_toast');
        return flash;
      }
    }
    return null;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full text-center relative z-10 space-y-8">
        {toastMessage && (
          <div className="text-left max-w-lg mx-auto">
            <AlertBanner
              message={toastMessage}
              type="warning"
              onDismiss={() => setToastMessage(null)}
            />
          </div>
        )}

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700/80 text-amber-400 text-xs font-mono tracking-widest uppercase">
          <span>🕵️</span> Dynamic Detective Simulation
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-100 font-mono">
            AI <span className="text-amber-400 underline decoration-amber-500/50 underline-offset-8">Mystery Room</span>
          </h1>
          <p className="text-base sm:text-xl text-zinc-400 max-w-2xl mx-auto font-serif leading-relaxed">
            Step into an immersive, AI-generated criminal investigation. Interrogate suspects, analyze forensic clues, uncover motive and alibis, and name the culprit before your score runs dry.
          </p>
        </div>

        {/* CTA Button */}
        <div>
          <Link
            to="/create"
            className="inline-flex items-center gap-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-base sm:text-lg px-8 py-4 rounded-xl shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 group uppercase tracking-wider"
          >
            <span>Start a Mystery</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-8 text-left">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur hover:border-zinc-700 transition-colors">
            <div className="text-2xl mb-2" role="img" aria-label="brain">🧠</div>
            <h3 className="font-mono text-sm font-bold text-zinc-200 uppercase tracking-wide mb-1">
              Gemini-Powered
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every mystery, suspect, timeline, and forensic clue is dynamically synthesized by Gemini 3.8 Flash with rigorous logical consistency checks.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur hover:border-zinc-700 transition-colors">
            <div className="text-2xl mb-2" role="img" aria-label="levels">⚖️</div>
            <h3 className="font-mono text-sm font-bold text-zinc-200 uppercase tracking-wide mb-1">
              3 Difficulty Levels
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Choose Easy, Medium, or Hard. Scale suspect counts, clue complexity, and available detective hints to match your deductive skills.
            </p>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 backdrop-blur hover:border-zinc-700 transition-colors">
            <div className="text-2xl mb-2" role="img" aria-label="trophy">🏆</div>
            <h3 className="font-mono text-sm font-bold text-zinc-200 uppercase tracking-wide mb-1">
              Score Your Instincts
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Earn clue bonuses, manage hint penalties, and secure your final score with an infallible, definitive accusation.
            </p>
          </div>
        </div>

        {/* Security / Privacy notice */}
        <div className="pt-4 border-t border-zinc-800/80">
          <p className="text-[11px] text-zinc-500 font-mono">
            🔒 Anonymous sessions protected with SHA-256 session tokens. No account creation required. Cases persist for 24 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
