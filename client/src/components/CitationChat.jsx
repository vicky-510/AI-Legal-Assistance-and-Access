import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare, X, Send, Quote, AlertCircle } from 'lucide-react';
import { api, ApiError } from '../api/client.js';

function TypingShimmer() {
  return (
    <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 dark:bg-slate-800">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
    </div>
  );
}

function ChatBubble({ message, onCiteClick }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? 'rounded-br-sm bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
            : 'rounded-bl-sm bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100'
        }`}
      >
        <p>{message.content}</p>
        {message.citations?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onCiteClick?.(c)}
                className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-indigo-600 transition-colors hover:bg-white dark:bg-slate-900/60 dark:text-indigo-400"
                title={c.quote}
              >
                <Quote className="h-3 w-3" />
                {c.pageNumber ? `p.${c.pageNumber}` : 'source'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CitationChat({ contractId, initialHistory = [], onCiteClick }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const send = async () => {
    const question = input.trim();
    if (!question || sending) return;

    setError('');
    setMessages((m) => [...m, { role: 'user', content: question, citations: [] }]);
    setInput('');
    setSending(true);

    try {
      const result = await api.askQuestion(contractId, question);
      setMessages((m) => [...m, { role: 'assistant', content: result.answer, citations: result.citations }]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Network error — please retry.';
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const retryLast = () => {
    setError('');
    send();
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-medium text-white shadow-glow transition-transform hover:scale-105"
      >
        <MessageSquare className="h-4 w-4" />
        Ask about this contract
      </button>

      {createPortal(
        <div
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div
            className={`fixed inset-y-0 right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:border-slate-800 dark:bg-slate-900 ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="font-semibold">Citation-Backed Q&amp;A</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Answers are grounded in this document</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-slate-400">
                Ask a question like "What happens if I terminate early?"
              </p>
            )}
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} onCiteClick={onCiteClick} />
            ))}
            {sending && <TypingShimmer />}
          </div>

          {error && (
            <div className="mx-5 mb-2 flex items-center justify-between gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-500">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </span>
              <button onClick={retryLast} className="font-medium underline">
                Retry
              </button>
            </div>
          )}

          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="Ask a question about this contract…"
                disabled={sending}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-indigo-500 transition-shadow focus:ring-2 dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500 text-white transition-opacity disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}
    </>
  );
}
