import { useState } from 'react';
import { History as HistoryIcon, FileText, GitCompareArrows } from 'lucide-react';
import DocumentHistory from '../components/DocumentHistory.jsx';
import ComparisonHistory from '../components/ComparisonHistory.jsx';
import ContractResult from '../components/ContractResult.jsx';
import ComparisonResult from '../components/ComparisonResult.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { api, ApiError } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';

const TABS = [
  { key: 'documents', label: 'Analyses', icon: FileText },
  { key: 'comparisons', label: 'Comparisons', icon: GitCompareArrows },
];

export default function History() {
  const [tab, setTab] = useState('documents');
  const [contract, setContract] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const handleSelectContract = async (id) => {
    setLoading(true);
    try {
      const { contract: result } = await api.getContract(id);
      setContract(result);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to load document.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectComparison = async (id) => {
    setLoading(true);
    try {
      const { comparison: result } = await api.getComparison(id);
      setComparison(result);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to load comparison.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showingResult = contract || comparison;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-indigo-500" />
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
      </div>

      {!showingResult && (
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-800/40">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-in-out ${
                tab === key
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {!showingResult && tab === 'documents' && (
        <ErrorBoundary>
          <DocumentHistory onSelect={handleSelectContract} />
        </ErrorBoundary>
      )}

      {!showingResult && tab === 'comparisons' && (
        <ErrorBoundary>
          <ComparisonHistory onSelect={handleSelectComparison} />
        </ErrorBoundary>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      <ContractResult contract={contract} onClose={() => setContract(null)} />
      <ComparisonResult comparison={comparison} onClose={() => setComparison(null)} />
    </div>
  );
}
