import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCase, discoverClue, requestHint } from '../api/cases';
import ScoreTracker from '../components/ScoreTracker';
import SuspectCard from '../components/SuspectCard';
import ClueCard from '../components/ClueCard';
import HintPanel from '../components/HintPanel';
import AlertBanner from '../components/AlertBanner';

export default function CaseRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [isLoadingCase, setIsLoadingCase] = useState(true);
  const [isDiscoveringClue, setIsDiscoveringClue] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [bannerAlert, setBannerAlert] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCase() {
      try {
        const data = await getCase(id);
        if (!isMounted) return;
        if (data.status === 'completed') {
          navigate(`/cases/${id}/result`, { replace: true });
          return;
        }
        setCaseData(data);
      } catch (err) {
        if (!isMounted) return;
        if (err.code === 'CASE_ALREADY_COMPLETED') {
          navigate(`/cases/${id}/result`, { replace: true });
          return;
        }
        setBannerAlert({
          type: 'error',
          message: err.message || 'Failed to load case.',
        });
      } finally {
        if (isMounted) {
          setIsLoadingCase(false);
        }
      }
    }

    loadCase();
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const refreshCase = async () => {
    try {
      const data = await getCase(id);
      if (data.status === 'completed') {
        navigate(`/cases/${id}/result`, { replace: true });
        return;
      }
      setCaseData(data);
    } catch (err) {
      if (err.code === 'CASE_ALREADY_COMPLETED') {
        navigate(`/cases/${id}/result`, { replace: true });
      }
    }
  };

  // Handle clue discovery
  const handleDiscoverNextClue = async () => {
    if (!caseData || isDiscoveringClue) return;

    // Find the first undiscovered clue in sequential order
    const nextUndiscoveredClue = caseData.clues.find((c) => !c.discovered);
    if (!nextUndiscoveredClue) {
      setBannerAlert({
        type: 'info',
        message: 'All forensic clues for this case have already been discovered!',
      });
      return;
    }

    setIsDiscoveringClue(true);
    setBannerAlert(null);

    try {
      const result = await discoverClue(id, nextUndiscoveredClue.id);
      // Update case data with newly discovered clue and updated score
      setCaseData((prev) => {
        if (!prev) return prev;
        const updatedClues = prev.clues.map((c) =>
          c.id === result.discoveredClue.id ? result.discoveredClue : c
        );
        return {
          ...prev,
          clues: updatedClues,
          score: result.score,
        };
      });
    } catch (err) {
      if (err.code === 'CLUE_ALREADY_DISCOVERED') {
        await refreshCase();
      } else if (err.code === 'SEQUENTIAL_ORDER_VIOLATION') {
        setBannerAlert({
          type: 'warning',
          message: 'Sequential order violation: Discover previous clues first.',
        });
      } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
        setBannerAlert({
          type: 'warning',
          message: "You've made too many requests. Please wait a minute before trying again.",
        });
      } else {
        setBannerAlert({
          type: 'error',
          message: err.message || 'Could not discover clue. Please try again.',
        });
      }
    } finally {
      setIsDiscoveringClue(false);
    }
  };

  // Handle hint request
  const handleRequestHint = async () => {
    if (!caseData || isRequestingHint) return;

    setIsRequestingHint(true);
    setBannerAlert(null);

    try {
      const result = await requestHint(id);
      setCaseData((prev) => {
        if (!prev) return prev;
        const currentRevealed = prev.hints?.revealed || [];
        const alreadyExists = currentRevealed.some((h) => h.id === result.hint.id);
        const newRevealed = alreadyExists ? currentRevealed : [...currentRevealed, result.hint];
        const newTotal = prev.hints?.total || 3;
        const newRemaining = result.hintsRemaining;

        return {
          ...prev,
          hints: {
            ...prev.hints,
            revealed: newRevealed,
            total: newTotal,
            used: newTotal - newRemaining,
            remaining: newRemaining,
          },
          score: result.score,
        };
      });
    } catch (err) {
      if (err.code === 'NO_HINTS_REMAINING') {
        setBannerAlert({
          type: 'warning',
          message: 'No hints remaining for this mystery.',
        });
      } else if (err.code === 'RATE_LIMIT_EXCEEDED') {
        setBannerAlert({
          type: 'warning',
          message: "You've made too many requests. Please wait a minute before trying again.",
        });
      } else {
        setBannerAlert({
          type: 'error',
          message: err.message || 'Could not retrieve hint. Please try again.',
        });
      }
    } finally {
      setIsRequestingHint(false);
    }
  };

  if (isLoadingCase) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-800 rounded-lg w-1/2" />
        <div className="h-24 bg-zinc-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-48 bg-zinc-800 rounded-xl" />
          <div className="h-48 bg-zinc-800 rounded-xl" />
          <div className="h-48 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertBanner message={bannerAlert?.message || 'Case not found or expired.'} type="error" />
        <Link to="/" className="text-amber-400 underline font-mono text-sm">
          Return to Home
        </Link>
      </div>
    );
  }

  const cluesDiscoveredCount = caseData.clues.filter((c) => c.discovered).length;
  const totalCluesCount = caseData.clues.length;
  const allCluesDiscovered = cluesDiscoveredCount === totalCluesCount;
  const hintsRemainingCount = caseData.hints?.remaining ?? 0;
  const totalHintsCount = caseData.hints?.total ?? 3;
  const hintsUsedCount = caseData.hints?.used ?? (totalHintsCount - hintsRemainingCount);
  const revealedHints = caseData.hints?.revealed || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 pb-28">
      {/* Case Header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-widest text-zinc-400 font-mono block">
              Investigation In Progress
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-zinc-100 font-mono tracking-tight mt-1">
              {caseData.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-mono px-3 py-1 rounded-full border border-amber-500/50 bg-amber-950/60 text-amber-300 font-bold">
              {caseData.difficulty}
            </span>
            <Link
              to={`/cases/${id}/accuse`}
              className="bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs uppercase font-bold tracking-wider px-4 py-2 rounded-lg shadow transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
            >
              <span>⚖️</span> Accuse Suspect
            </Link>
          </div>
        </div>

        {/* Live Score Tracker */}
        <ScoreTracker
          score={caseData.score}
          cluesDiscovered={cluesDiscoveredCount}
          totalClues={totalCluesCount}
          hintsUsed={hintsUsedCount}
          totalHints={totalHintsCount}
        />
      </div>

      {bannerAlert && (
        <AlertBanner
          message={bannerAlert.message}
          type={bannerAlert.type}
          onDismiss={() => setBannerAlert(null)}
        />
      )}

      {/* Story Panel (Detective Casebook) */}
      <section className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 px-4 py-1 text-[11px] font-mono uppercase tracking-widest rounded-bl-xl border-l border-b border-amber-500/20">
          Official Case File
        </div>

        <h2 className="font-mono text-sm uppercase tracking-wider text-amber-400 font-bold mb-3 flex items-center gap-2">
          <span>📜</span> The Incident & Crime Scene
        </h2>

        <div className="text-zinc-200 font-serif leading-relaxed text-sm sm:text-base space-y-3 whitespace-pre-line border-l-2 border-zinc-700 pl-4 py-1">
          {caseData.story}
        </div>
      </section>

      {/* Suspects Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="suspects">👥</span>
            <h2 className="font-mono text-base font-bold text-zinc-100 uppercase tracking-wider">
              Persons of Interest ({caseData.suspects.length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Examine motives & alibis carefully
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {caseData.suspects.map((suspect) => (
            <SuspectCard key={suspect.id} suspect={suspect} />
          ))}
        </div>
      </section>

      {/* Clues & Hints Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Clue Panel (2 cols on lg) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="clues">🔍</span>
              <h2 className="font-mono text-base font-bold text-zinc-100 uppercase tracking-wider">
                Forensic Clues ({cluesDiscoveredCount}/{totalCluesCount})
              </h2>
            </div>

            <button
              type="button"
              onClick={handleDiscoverNextClue}
              disabled={allCluesDiscovered || isDiscoveringClue}
              className={`font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all shadow ${
                allCluesDiscovered
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 border-amber-400 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {isDiscoveringClue ? (
                <>
                  <div className="w-3 h-3 border-2 border-zinc-950/40 border-t-zinc-950 rounded-full animate-spin" />
                  <span>Examining...</span>
                </>
              ) : allCluesDiscovered ? (
                <span>All Clues Found</span>
              ) : (
                <>
                  <span>🔎</span>
                  <span>Discover Next Clue (+5 pts)</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {caseData.clues.map((clue, idx) => (
              <ClueCard key={clue.id || idx} clue={clue} index={idx} />
            ))}
          </div>
        </section>

        {/* Hints Panel (1 col on lg) */}
        <section className="space-y-4">
          <HintPanel
            hints={revealedHints}
            hintsRemaining={hintsRemainingCount}
            onRequestHint={handleRequestHint}
            isLoading={isRequestingHint}
          />
        </section>
      </div>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 py-3 px-4 z-30 shadow-2xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono">Current Score:</span>
            <span className="text-xl font-bold font-mono text-amber-400">
              {caseData.score?.provisional ?? 100} pts
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleDiscoverNextClue}
              disabled={allCluesDiscovered || isDiscoveringClue}
              className={`flex-1 sm:flex-none text-xs font-mono font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg border transition-all ${
                allCluesDiscovered
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700 hover:border-amber-500/50'
              }`}
            >
              {isDiscoveringClue ? 'Searching...' : '🔍 Next Clue'}
            </button>

            <button
              type="button"
              onClick={handleRequestHint}
              disabled={hintsRemainingCount <= 0 || isRequestingHint}
              className={`flex-1 sm:flex-none text-xs font-mono font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg border transition-all ${
                hintsRemainingCount <= 0
                  ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-amber-300 border-zinc-700 hover:border-amber-500/50'
              }`}
            >
              {isRequestingHint ? 'Deciphering...' : `💡 Hint (${hintsRemainingCount})`}
            </button>

            <Link
              to={`/cases/${id}/accuse`}
              className="flex-1 sm:flex-none bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all text-center"
            >
              ⚖️ Accuse
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
