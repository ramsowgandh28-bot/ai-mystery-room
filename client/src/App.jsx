import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import CreateCase from './pages/CreateCase';
import CaseRoom from './pages/CaseRoom';
import Accusation from './pages/Accusation';
import CaseResult from './pages/CaseResult';

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-zinc-950">
        <Navbar />

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateCase />} />
            <Route path="/cases/:id" element={<CaseRoom />} />
            <Route path="/cases/:id/accuse" element={<Accusation />} />
            <Route path="/cases/:id/result" element={<CaseResult />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6 text-center text-xs text-zinc-500 font-mono">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>AI Mystery Room &bull; Dynamic Detective Simulation</span>
            <span>Powered by Gemini 3.8 Flash &bull; {CURRENT_YEAR}</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
