import React, { useState, useEffect } from 'react';

const MESSAGES = [
  'Constructing crime scene narrative...',
  'Questioning suspects and establishing alibis...',
  'Planting forensic clues and red herrings...',
  'Encrypting case files and hints...',
  'Verifying logical timeline consistency...',
];

export default function LoadingOverlay({ message }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
          <span className="absolute text-2xl" role="img" aria-label="detective">🕵️</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-mono font-bold text-zinc-100 tracking-wide uppercase">
            {message || 'Generating Mystery'}
          </h3>
          <p className="text-sm text-amber-400/90 font-medium min-h-[2.5rem] transition-opacity duration-300">
            {MESSAGES[msgIndex]}
          </p>
        </div>

        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-300 h-1.5 rounded-full animate-pulse w-3/4 mx-auto" />
        </div>

        <p className="text-xs text-zinc-500 font-mono">
          Powered by Gemini 3.8 Flash • Bounded AI Generation
        </p>
      </div>
    </div>
  );
}
