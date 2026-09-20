import { useState } from 'react';
import { X, Download, Loader2 } from 'lucide-react';
import ContractDiff from './ContractDiff.jsx';
import CitationChat from './CitationChat.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import { api, ApiError } from '../api/client.js';
import { useToast } from './Toast.jsx';

export default function ComparisonResult({ comparison, onClose }) {
  const { push } = useToast();
  const [downloading, setDownloading] = useState(false);

  if (!comparison) return null;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const label = `${comparison.fileNameA}-vs-${comparison.fileNameB}`.replace(/\.pdf/gi, '');
      await api.downloadComparisonReport(comparison.id, label);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to download report.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ErrorBoundary onReset={onClose}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
          {comparison.fileNameA} vs {comparison.fileNameB}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          >
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download Report
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              <X className="h-3.5 w-3.5" /> Close
            </button>
          )}
        </div>
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
