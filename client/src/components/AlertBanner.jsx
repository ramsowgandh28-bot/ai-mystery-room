import React from 'react';

export default function AlertBanner({ message, type = 'error', onRetry, onDismiss }) {
  if (!message) return null;

  const styles = {
    error: 'bg-rose-950/80 border-rose-700/60 text-rose-200',
    warning: 'bg-amber-950/80 border-amber-700/60 text-amber-200',
    info: 'bg-sky-950/80 border-sky-700/60 text-sky-200',
    success: 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200',
  };

  const icons = {
    error: '⚠️',
    warning: '⚡',
    info: 'ℹ️',
    success: '✅',
  };

  return (
    <div
      role="alert"
      className={`border rounded-lg p-4 my-4 flex items-center justify-between gap-4 backdrop-blur shadow-lg ${styles[type] || styles.error}`}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl flex-shrink-0">{icons[type] || '⚠️'}</span>
        <p className="text-sm font-medium">{message}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold px-3 py-1.5 rounded transition-colors border border-zinc-600"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="text-zinc-400 hover:text-zinc-200 p-1 text-sm leading-none"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
