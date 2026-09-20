import { Plus, Minus, RefreshCw, Equal } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';

const CHANGE_META = {
  ADDED: { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-500/5 border-emerald-500/20' },
  REMOVED: { icon: Minus, color: 'text-rose-500', bg: 'bg-rose-500/5 border-rose-500/20' },
  MODIFIED: { icon: RefreshCw, color: 'text-amber-500', bg: 'bg-amber-500/5 border-amber-500/20' },
  UNCHANGED: { icon: Equal, color: 'text-slate-400', bg: 'bg-slate-500/5 border-slate-500/10' },
};

export function DiffSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="shimmer h-40 rounded-xl" />
      <div className="shimmer h-40 rounded-xl" />
    </div>
  );
}

export default function ContractDiff({ diff, meta }) {
  if (!diff) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-lg font-semibold">Overall Assessment</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300">{diff.overallAssessment}</p>
        {meta && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {meta.fileNameA} ({meta.pageCountA}p) vs {meta.fileNameB} ({meta.pageCountB}p)
          </p>
        )}
      </div>

      <div className="space-y-3">
        {diff.changes.map((change, i) => {
          const cfg = CHANGE_META[change.changeType] || CHANGE_META.UNCHANGED;
          const Icon = cfg.icon;
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 transition-all duration-300 ease-in-out ${cfg.bg}`}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${cfg.color}`} />
                  <span className="text-sm font-medium">{change.clauseTitle}</span>
                </div>
                <RiskBadge level={change.riskImpact} />
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300">{change.explanation}</p>

              {(change.verbatimQuoteA || change.verbatimQuoteB) && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {change.verbatimQuoteA && (
                    <blockquote className="rounded-lg bg-rose-500/5 px-3 py-2 text-xs italic text-slate-600 dark:text-slate-400">
                      A: {change.verbatimQuoteA}
                    </blockquote>
                  )}
                  {change.verbatimQuoteB && (
                    <blockquote className="rounded-lg bg-emerald-500/5 px-3 py-2 text-xs italic text-slate-600 dark:text-slate-400">
                      B: {change.verbatimQuoteB}
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
