import { useState } from 'react';
import { ChevronDown, Quote } from 'lucide-react';
import RiskBadge from './RiskBadge.jsx';

function ClauseAccordion({ clause }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60"
      >
        <div className="flex items-center gap-3">
          <RiskBadge level={clause.riskLevel} />
          <span className="text-sm font-medium">{clause.title}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/30">
            <p className="text-sm text-slate-700 dark:text-slate-300">{clause.plainEnglishSummary}</p>
            {clause.riskReason && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">Why: </span>
                {clause.riskReason}
              </p>
            )}
            <blockquote className="flex gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs italic text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <Quote className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              <span>{clause.verbatimQuote}</span>
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="shimmer h-24 rounded-xl" />
      <div className="shimmer h-16 rounded-xl" />
      <div className="shimmer h-16 rounded-xl" />
      <div className="shimmer h-16 rounded-xl" />
    </div>
  );
}

export default function ExecutiveSummary({ contract }) {
  if (!contract) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Executive Summary</h2>
          <RiskBadge level={contract.overallRiskScore} className="text-sm" />
        </div>
        <ul className="space-y-2">
          {contract.executiveSummary.map((point, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Clause-by-Clause Breakdown
        </h3>
        <div className="space-y-2">
          {contract.clauses.map((clause, i) => (
            <ClauseAccordion key={i} clause={clause} />
          ))}
        </div>
      </div>
    </div>
  );
}
