import { useState } from 'react';
import FileUploader from '../components/FileUploader.jsx';
import ContractDiff, { DiffSkeleton } from '../components/ContractDiff.jsx';
import ErrorBoundary from '../components/ErrorBoundary.jsx';
import { api, ApiError } from '../api/client.js';
import { useToast } from '../components/Toast.jsx';

export default function Diff() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const handleCompare = async () => {
    if (!fileA || !fileB) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await api.diffDocuments(fileA, fileB);
      setResult(data);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to compare documents. Please retry.';
      push(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Compare contract versions</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Upload two versions to see additions, omissions, and risk-impact changes side by side.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
        <FileUploader label="Contract A (original)" file={fileA} onFileSelect={setFileA} disabled={loading} />
        <FileUploader label="Contract B (revised)" file={fileB} onFileSelect={setFileB} disabled={loading} />
        <button
          onClick={handleCompare}
          disabled={!fileA || !fileB || loading}
          className="col-span-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 py-2.5 text-sm font-medium text-white shadow-glow transition-opacity disabled:opacity-40"
        >
          {loading ? 'Comparing…' : 'Compare Contracts'}
        </button>
      </div>

      {loading && <DiffSkeleton />}

      {result && (
        <ErrorBoundary onReset={() => setResult(null)}>
          <ContractDiff diff={result.diff} meta={result.meta} />
        </ErrorBoundary>
      )}
    </div>
  );
}
