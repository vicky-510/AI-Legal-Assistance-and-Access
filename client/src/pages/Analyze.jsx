import { useState } from 'react';
import { ShieldAlert, History } from 'lucide-react';
import FileUploader from '../components/FileUploader.jsx';
import ExecutiveSummary, { SummarySkeleton } from '../components/ExecutiveSummary.jsx';
import CitationChat from '../components/CitationChat.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import DocumentHistory from '../components/DocumentHistory.jsx';
import { api, ApiError } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';

export default function Analyze() {
  const [file, setFile] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const { push } = useToast();

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setContract(null);
    try {
      const { contract: result, cached } = await api.analyzeDocument(file);
      setContract(result);
      if (cached) push('Loaded from cache — 0 API tokens used.', 'success');
      else setHistoryKey((k) => k + 1);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to analyze document. Please retry.';
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrevious = async (id) => {
    setLoading(true);
    setContract(null);
    try {
      const { contract: result } = await api.getContract(id);
      setContract(result);
      setFile(null);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to load document.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Understand any contract in seconds
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Upload a PDF for an executive summary, clause-by-clause risk breakdown, and interactive Q&amp;A.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <FileUploader file={file} onFileSelect={setFile} disabled={loading} />
        <button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-medium text-white shadow-glow transition-opacity disabled:opacity-40"
        >
          {loading ? 'Analyzing…' : 'Analyze Contract'}
        </button>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p>
          LexiClear AI provides automated document assistance for informational purposes only and does not
          constitute legal advice or binding legal counsel. Consult a qualified attorney for decisions with
          legal consequences.
        </p>
      </div>

      {loading && <SummarySkeleton />}

      {contract && (
        <ErrorBoundary onReset={() => setContract(null)}>
          <ExecutiveSummary contract={contract} />
          <CitationChat key={contract.id} contractId={contract.id} initialHistory={contract.chatHistory} />
        </ErrorBoundary>
      )}

      {!loading && (
        <div>
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <History className="h-4 w-4" />
            Recent Documents
          </h3>
          <ErrorBoundary>
            <DocumentHistory onSelect={handleSelectPrevious} refreshKey={historyKey} />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
