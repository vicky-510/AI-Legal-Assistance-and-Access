import { useEffect, useState } from 'react';
import { Clock, GitCompareArrows } from 'lucide-react';
import { api, ApiError } from '../api/client.js';

export default function ComparisonHistory({ onSelect, refreshKey }) {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listComparisons()
      .then(({ comparisons: list }) => {
        if (!cancelled) setComparisons(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Failed to load comparisons.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="shimmer h-12 rounded-xl" />
        <div className="shimmer h-12 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-rose-500">{error}</p>;
  }

  if (comparisons.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-800">
        No comparisons yet. Compare two contract versions to get started.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {comparisons.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <GitCompareArrows className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {c.fileNameA} <span className="text-slate-400">vs</span> {c.fileNameB}
              </p>
              <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                {new Date(c.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
