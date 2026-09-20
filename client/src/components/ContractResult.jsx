import { X } from 'lucide-react';
import ExecutiveSummary from './ExecutiveSummary.jsx';
import CitationChat from './CitationChat.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

export default function ContractResult({ contract, onClose }) {
  if (!contract) return null;

  return (
    <ErrorBoundary onReset={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{contract.fileName}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
        )}
      </div>
      <ExecutiveSummary contract={contract} />
      <CitationChat key={contract.id} contractId={contract.id} initialHistory={contract.chatHistory} />
    </ErrorBoundary>
  );
}
