import { X } from 'lucide-react';
import ContractDiff from './ContractDiff.jsx';
import CitationChat from './CitationChat.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { api } from '../api/client.js';

export default function ComparisonResult({ comparison, onClose }) {
  if (!comparison) return null;

  return (
    <ErrorBoundary onReset={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {comparison.fileNameA} vs {comparison.fileNameB}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
        )}
      </div>
      <ContractDiff
        diff={comparison.diff}
        meta={{
          fileNameA: comparison.fileNameA,
          fileNameB: comparison.fileNameB,
          pageCountA: comparison.pageCountA,
          pageCountB: comparison.pageCountB,
        }}
      />
      <CitationChat
        key={comparison.id}
        contractId={comparison.id}
        ask={api.askComparisonQuestion}
        initialHistory={comparison.chatHistory}
        label="Ask about this comparison"
      />
    </ErrorBoundary>
  );
}
