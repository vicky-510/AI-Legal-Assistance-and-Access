import { useState } from 'react';
import { History as HistoryIcon } from 'lucide-react';
import DocumentHistory from '../components/DocumentHistory.jsx';
import ContractResult from '../components/ContractResult.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { api, ApiError } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';

export default function History() {
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const handleSelect = async (id) => {
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

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-indigo-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Document History</h1>
      </div>

      {!contract && (
        <ErrorBoundary>
          <DocumentHistory onSelect={handleSelect} />
        </ErrorBoundary>
      )}

      {loading && (
        <div className="flex justify-center py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      )}

      <ContractResult contract={contract} onClose={() => setContract(null)} />
    </div>
  );
}
