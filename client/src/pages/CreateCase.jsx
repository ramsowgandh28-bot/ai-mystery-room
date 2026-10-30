import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCase } from '../api/cases';
import LoadingOverlay from '../components/LoadingOverlay';
import AlertBanner from '../components/AlertBanner';

const DIFFICULTIES = [
  {
    id: 'easy',
    name: 'Easy',
    suspects: 3,
    clues: 5,
    hints: 2,
    baseScore: 100,
    color: 'border-emerald-700/60 text-emerald-300',
    selectedBg: 'bg-emerald-950/40 border-emerald-500',
    desc: 'Light introductory puzzle. 3 suspects and clear forensic clues.',
  },
  {
    id: 'medium',
    name: 'Medium',
    suspects: 4,
    clues: 7,
    hints: 3,
    baseScore: 150,
    color: 'border-amber-700/60 text-amber-300',
    selectedBg: 'bg-amber-950/40 border-amber-500',
    desc: 'Balanced mystery. 4 suspects with alibis, conflicting timelines, and red herrings.',
  },
  {
    id: 'hard',
    name: 'Hard',
    suspects: 5,
    clues: 9,
    hints: 3,
    baseScore: 200,
    color: 'border-rose-700/60 text-rose-300',
    selectedBg: 'bg-rose-950/40 border-rose-500',
    desc: 'Master detective level. 5 suspects, complex forensic timelines, and intricate motives.',
  },
];

const PREMISE_SUGGESTIONS = [
  'A vintage diamond vanishes from a locked display case during a midnight thunderstorm at the Blackwood Manor.',
  'An eccentric tech CEO is poisoned at an intimate dinner celebrating a breakthrough AI patent.',
  'A museum curator is found unconscious in the Egyptian wing with the golden scarab missing from its vault.',
];

export default function CreateCase() {
  const navigate = useNavigate();
  const [premise, setPremise] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);

  const isValidPremise = premise.trim().length >= 10 && premise.trim().length <= 500;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!isValidPremise || isLoading) return;

    setIsLoading(true);
    setErrorInfo(null);

    try {
      const result = await generateCase(premise.trim(), difficulty);
      if (result?._id) {
        navigate(`/cases/${result._id}`);
      }
    } catch (err) {
      setErrorInfo({
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'Failed to generate mystery. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {isLoading && <LoadingOverlay message="Generating Case File" />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 uppercase tracking-tight">
          Commission a New Mystery
        </h1>
        <p className="text-sm text-zinc-400 mt-1 font-serif">
          Define the circumstances of the crime and pick your investigation difficulty.
        </p>
      </div>

      {errorInfo && (
        <AlertBanner
          message={
            errorInfo.code === 'RATE_LIMIT_EXCEEDED'
              ? "You've made too many requests. Please wait a minute before trying again."
              : errorInfo.code === 'AI_GENERATION_FAILED'
              ? 'Failed to generate a valid mystery. Please try again.'
              : errorInfo.message
          }
          type={errorInfo.code === 'RATE_LIMIT_EXCEEDED' ? 'warning' : 'error'}
          onRetry={errorInfo.code === 'AI_GENERATION_FAILED' ? handleSubmit : undefined}
          onDismiss={() => setErrorInfo(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Premise Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label
              htmlFor="premise"
              className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200"
            >
              Describe Your Mystery Premise <span className="text-amber-400">*</span>
            </label>
            <span
              className={`text-xs font-mono ${
                premise.length > 500
                  ? 'text-rose-400'
                  : premise.length >= 10
                  ? 'text-zinc-400'
                  : 'text-zinc-500'
              }`}
            >
              {premise.length} / 500 characters (min 10)
            </span>
          </div>

          <textarea
            id="premise"
            rows={4}
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            disabled={isLoading}
            placeholder="e.g. A priceless pocket watch was stolen from Lord Harrington's study during the family annual masquerade ball..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-serif text-sm transition-all shadow-inner disabled:opacity-50"
          />

          {/* Quick Premise Starters */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              Need inspiration? Pick a premise:
            </span>
            <div className="flex flex-wrap gap-2">
              {PREMISE_SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPremise(suggestion)}
                  disabled={isLoading}
                  className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-lg text-left transition-colors"
                >
                  💡 &ldquo;{suggestion.slice(0, 48)}...&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="space-y-3">
          <label className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-200 block">
            Investigation Difficulty <span className="text-amber-400">*</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DIFFICULTIES.map((diff) => {
              const isSelected = difficulty === diff.id;
              return (
                <button
                  key={diff.id}
                  type="button"
                  onClick={() => setDifficulty(diff.id)}
                  disabled={isLoading}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    isSelected
                      ? `${diff.selectedBg} ring-1 ring-amber-400 shadow-md`
                      : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-sm text-zinc-100 uppercase">
                      {diff.name}
                    </span>
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                      {diff.baseScore} pts
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
                    {diff.desc}
                  </p>

                  <div className="text-[11px] font-mono text-zinc-400 pt-2 border-t border-zinc-800/80 space-y-0.5">
                    <div>👥 <strong>{diff.suspects}</strong> Suspects</div>
                    <div>🔍 <strong>{diff.clues}</strong> Clues</div>
                    <div>💡 <strong>{diff.hints}</strong> Hints max</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-zinc-400 font-mono">
            Generated with verified logical timeline & zero solution exposure.
          </span>

          <button
            type="submit"
            disabled={!isValidPremise || isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-mono text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-lg ${
              !isValidPremise || isLoading
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isLoading ? 'Synthesizing...' : 'Generate Mystery →'}
          </button>
        </div>
      </form>
    </div>
  );
}
