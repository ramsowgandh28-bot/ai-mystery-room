import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getResult } from '../api/cases';
import AlertBanner from '../components/AlertBanner';

export default function CaseResult() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [alertError, setAlertError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadResult() {
      try {
        const data = await getResult(id);
        if (!mounted) return;
        setResultData(data);
      } catch (err) {
        if (!mounted) return;
        if (err.code === 'RESULT_NOT_AVAILABLE') {
          // Direct navigation before accusation -> redirect to investigation room (§14.2)
          navigate(`/cases/${id}`, { replace: true });
          return;
        }
        setAlertError(err.message || 'Could not load results. Please refresh.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadResult();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
        <h2 className="text-xl font-mono text-zinc-300 font-bold tracking-wide">
          Revealing the Truth...
        </h2>
        <p className="text-sm text-zinc-500 font-serif">
          Consulting official forensic reports and verifying accusation outcome.
        </p>
      </div>
    );
  }

  if (!resultData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertBanner message={alertError || 'Result not found or expired.'} type="error" />
        <Link to="/" className="text-amber-400 underline font-mono text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const isCorrect = Boolean(resultData.accusation?.isCorrect);
  const finalScore = resultData.score?.final ?? 0;
  const baseScore = resultData.score?.base ?? 100;
  const clueBonus = resultData.score?.clueBonus ?? 0;
  const hintPenalty = resultData.score?.hintPenalty ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Verdict Banner */}
      <div
        className={`rounded-2xl p-6 sm:p-8 text-center border shadow-2xl relative overflow-hidden ${
          isCorrect
            ? 'bg-gradient-to-b from-emerald-950/80 to-zinc-950 border-emerald-500/60'
            : 'bg-gradient-to-b from-rose-950/80 to-zinc-950 border-rose-500/60'
        }`}
      >
        <div className="text-5xl mb-3" role="img" aria-label={isCorrect ? 'trophy' : 'cross mark'}>
          {isCorrect ? '🏆' : '❌'}
        </div>

        <h1
          className={`text-3xl sm:text-5xl font-extrabold font-mono tracking-tight uppercase ${
            isCorrect ? 'text-emerald-300' : 'text-rose-400'
          }`}
        >
          {isCorrect ? 'Case Solved: Culprit Apprehended!' : 'Case Cold: Wrong Suspect Accused!'}
        </h1>

        <p className="text-sm sm:text-base text-zinc-300 max-w-xl mx-auto mt-2 font-serif leading-relaxed">
          {isCorrect
            ? 'Exceptional deduction! You evaluated the motives, pierced the alibi, and correctly brought the perpetrator to justice.'
            : `Your accusation failed to hold up in court. The innocent suspect was exonerated while the actual culprit escaped justice.`}
        </p>

        {/* Big Final Score Pill */}
        <div className="inline-flex items-center gap-3 bg-zinc-950/80 border border-zinc-700/80 px-6 py-2 rounded-full mt-6 shadow">
          <span className="text-xs uppercase font-mono tracking-widest text-zinc-400">Final Score:</span>
          <span
            className={`text-3xl font-extrabold font-mono ${
              isCorrect ? 'text-emerald-400' : 'text-zinc-500'
            }`}
          >
            {finalScore} <span className="text-xs font-normal text-zinc-500">pts</span>
          </span>
        </div>
      </div>

      {/* Culprit Reveal Section */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="revealed culprit">👤</span>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 block">
                Official Police Deposition
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
                The Real Culprit: {resultData.culprit?.name}
              </h2>
            </div>
          </div>
          <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full border border-zinc-700">
            {resultData.difficulty?.toUpperCase()}
          </span>
        </div>

        {/* Culprit details */}
        <div className="bg-zinc-950/60 rounded-xl p-4 border border-zinc-800 space-y-2">
          <h3 className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-bold">
            Suspect Profile & Background
          </h3>
          <p className="text-sm text-zinc-300 leading-relaxed font-serif">
            {resultData.culprit?.description}
          </p>
          {resultData.culprit?.alibi && (
            <div className="pt-2">
              <span className="text-[11px] font-mono text-zinc-500 uppercase">Fabricated Alibi:</span>
              <p className="text-xs italic text-zinc-400 pl-2 border-l border-zinc-700">
                &ldquo;{resultData.culprit.alibi}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Full Explanation */}
        <div className="space-y-3">
          <h3 className="font-mono text-xs uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
            <span>🔎</span> Forensic Reconstruction & Solution Explanation
          </h3>
          <div className="bg-zinc-950/80 border border-amber-500/20 rounded-xl p-5 text-sm sm:text-base text-zinc-200 font-serif leading-relaxed whitespace-pre-line border-l-4 border-l-amber-500">
            {resultData.solution?.explanation}
          </div>
        </div>
      </section>

      {/* Score Breakdown Table */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
        <h2 className="font-mono text-base font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
          <span>📊</span> Detective Score Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm font-mono border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs uppercase text-zinc-400">
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Calculation</th>
                <th className="py-2.5 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              <tr>
                <td className="py-3 font-medium">Difficulty Base Score</td>
                <td className="py-3 text-xs text-zinc-500 font-sans">Starting investigation credit ({resultData.difficulty})</td>
                <td className="py-3 text-right font-bold text-zinc-100">{baseScore}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-emerald-400">Forensic Clue Discoveries</td>
                <td className="py-3 text-xs text-zinc-500 font-sans">+{clueBonus / 5} clues discovered × 5 pts</td>
                <td className="py-3 text-right font-bold text-emerald-400">+{clueBonus}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium text-rose-400">AI Detective Hints</td>
                <td className="py-3 text-xs text-zinc-500 font-sans">{Math.abs(hintPenalty) / 10} hints requested × -10 pts</td>
                <td className="py-3 text-right font-bold text-rose-400">{hintPenalty}</td>
              </tr>
              <tr>
                <td className="py-3 font-medium">Accusation Verdict</td>
                <td className="py-3 text-xs text-zinc-500 font-sans">
                  {isCorrect ? 'Correct accusation (provisional preserved)' : 'Incorrect accusation (forfeits score)'}
                </td>
                <td className="py-3 text-right font-bold">
                  {isCorrect ? '✅ 100%' : '❌ 0%'}
                </td>
              </tr>
              <tr className="border-t-2 border-zinc-700 font-bold text-base">
                <td className="py-4 text-zinc-100 uppercase tracking-wider">Final Score</td>
                <td className="py-4 text-xs text-zinc-500 font-sans">Clamped at minimum 0</td>
                <td className={`py-4 text-right text-xl ${isCorrect ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {finalScore} pts
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Clues Archive (Shows all clues with revealed text for learning) */}
      {resultData.clues && resultData.clues.length > 0 && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-base font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
              <span>🗄️</span> Evidence Dossier (All Clues Unlocked)
            </h2>
            <span className="text-xs font-mono text-zinc-400">
              {resultData.clues.length} total clues
            </span>
          </div>

          <div className="space-y-3">
            {resultData.clues.map((clue, idx) => (
              <div
                key={clue.id || idx}
                className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 font-serif leading-relaxed"
              >
                <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
                  <span className="text-amber-400 font-bold uppercase tracking-wider">
                    Clue #{idx + 1}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${clue.discovered ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-500'}`}>
                    {clue.discovered ? 'Discovered in Game' : 'Missed Lead'}
                  </span>
                </div>
                <p>{clue.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
        <Link
          to="/create"
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-zinc-950 font-mono font-bold text-sm uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all text-center"
        >
          Commission New Mystery →
        </Link>
        <Link
          to="/"
          className="w-full sm:w-auto border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-mono text-sm uppercase font-semibold px-6 py-3.5 rounded-xl transition-colors text-center"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
