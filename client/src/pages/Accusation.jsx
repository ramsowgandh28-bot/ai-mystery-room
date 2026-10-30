import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCase, submitAccusation } from '../api/cases';
import SuspectCard from '../components/SuspectCard';
import AlertBanner from '../components/AlertBanner';

export default function Accusation() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [selectedSuspectId, setSelectedSuspectId] = useState('');
  const [isLoadingCase, setIsLoadingCase] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertError, setAlertError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadCase() {
      try {
        const data = await getCase(id);
        if (!mounted) return;
        if (data.status === 'completed') {
          navigate(`/cases/${id}/result`, { replace: true });
          return;
        }
        setCaseData(data);
      } catch (err) {
        if (!mounted) return;
        if (err.code === 'CASE_ALREADY_COMPLETED') {
          navigate(`/cases/${id}/result`, { replace: true });
          return;
        }
        setAlertError(err.message || 'Failed to load suspects for accusation.');
      } finally {
        if (mounted) setIsLoadingCase(false);
      }
    }

    loadCase();
    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSuspectId || isSubmitting) return;

    setIsSubmitting(true);
    setAlertError(null);

    try {
      await submitAccusation(id, selectedSuspectId);
      // Navigate to results page
      navigate(`/cases/${id}/result`);
    } catch (err) {
      if (err.code === 'CASE_ALREADY_COMPLETED') {
        navigate(`/cases/${id}/result`, { replace: true });
        return;
      }
      setAlertError(err.message || 'Failed to submit accusation. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isLoadingCase) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 animate-pulse">
        <div className="h-10 bg-zinc-800 rounded-lg w-1/3 mx-auto" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-64 bg-zinc-800 rounded-xl" />
          <div className="h-64 bg-zinc-800 rounded-xl" />
          <div className="h-64 bg-zinc-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertBanner message={alertError || 'Case not found or expired.'} type="error" />
        <Link to="/" className="text-amber-400 underline font-mono text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  const selectedSuspect = caseData.suspects.find((s) => s.id === selectedSuspectId);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Back button and title */}
      <div className="space-y-3">
        <Link
          to={`/cases/${id}`}
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-amber-400 transition-colors"
        >
          <span>←</span> Back to Investigation Room
        </Link>

        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs font-mono tracking-widest uppercase">
            <span>⚖️</span> Irrevocable Formal Accusation
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 font-mono tracking-tight">
            Who Committed the Crime?
          </h1>
          <p className="text-sm text-zinc-400 font-serif leading-relaxed">
            Review the evidence, motive, and alibis. Select your primary suspect below and submit your verdict.
          </p>
        </div>
      </div>

      {alertError && (
        <AlertBanner
          message={alertError}
          type="error"
          onDismiss={() => setAlertError(null)}
        />
      )}

      {/* Warning banner */}
      <div className="bg-amber-950/40 border border-amber-700/50 rounded-xl p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <div className="space-y-1">
          <p className="font-semibold">One-Time Decision Warning:</p>
          <p className="text-amber-300/80">
            Once submitted, your accusation is final and the mystery locks permanently. If your accusation is correct, your provisional score becomes your Final Score. If you accuse the wrong suspect, your Final Score drops to 0.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Suspects Selection Grid */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Select one suspect:</span>
            {selectedSuspect && (
              <span className="text-amber-400 font-semibold">
                Selected: {selectedSuspect.name}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {caseData.suspects.map((suspect) => (
              <SuspectCard
                key={suspect.id}
                suspect={suspect}
                isSelectable={!isSubmitting}
                isSelected={selectedSuspectId === suspect.id}
                onSelect={(suspectId) => setSelectedSuspectId(suspectId)}
              />
            ))}
          </div>
        </div>

        {/* Accusation submission actions */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 block">
              Provisional Score on the Line
            </span>
            <span className="text-2xl font-bold font-mono text-amber-400">
              {caseData.score?.provisional ?? 100} pts
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to={`/cases/${id}`}
              className="w-full sm:w-auto text-center px-4 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs uppercase font-semibold transition-colors"
            >
              Review Clues More
            </Link>

            <button
              type="submit"
              disabled={!selectedSuspectId || isSubmitting}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-mono text-xs uppercase font-bold tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
                !selectedSuspectId || isSubmitting
                  ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-500 text-white hover:scale-105 active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Submitting Accusation...</span>
                </>
              ) : (
                <>
                  <span>⚖️</span>
                  <span>Confirm Accusation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
