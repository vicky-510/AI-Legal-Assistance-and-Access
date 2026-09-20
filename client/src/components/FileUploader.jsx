import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

const MAX_SIZE = 10 * 1024 * 1024;

export default function FileUploader({ label, file, onFileSelect, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateAndSet = useCallback(
    (candidate) => {
      setError('');
      if (!candidate) return;
      if (candidate.type !== 'application/pdf' && !candidate.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are accepted.');
        return;
      }
      if (candidate.size > MAX_SIZE) {
        setError('File exceeds the 10 MB limit.');
        return;
      }
      onFileSelect(candidate);
    },
    [onFileSelect]
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    validateAndSet(e.dataTransfer.files?.[0]);
  };

  return (
    <div className="w-full">
      {label && <p className="mb-2 text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>}

      {file ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
              <FileText className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={() => onFileSelect(null)}
              className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`dash-border cursor-pointer transition-all duration-300 ease-in-out ${
            isDragging ? 'scale-[1.01] shadow-glow' : ''
          } ${disabled ? 'pointer-events-none opacity-50' : ''}`}
        >
          <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] bg-white px-6 py-10 text-center dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-500">
              <UploadCloud className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drag &amp; drop a PDF, or <span className="text-indigo-500">browse</span>
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF only · up to 10 MB</p>
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => validateAndSet(e.target.files?.[0])}
      />

      {error && <p className="mt-2 text-xs font-medium text-rose-500">{error}</p>}
    </div>
  );
}
