import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Scale, FileText, GitCompareArrows, ShieldCheck, LogOut, User as UserIcon } from 'lucide-react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const TABS = [
  { to: '/', label: 'Analyze', icon: FileText, end: true },
  { to: '/diff', label: 'Compare', icon: GitCompareArrows },
];

function HealthPill() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const data = await api.health();
        if (!cancelled) setStatus(data.mongo === 'connected' ? 'healthy' : 'degraded');
      } catch {
        if (!cancelled) setStatus('down');
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const styles = {
    checking: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    healthy: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    degraded: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    down: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      {status === 'checking' ? 'Checking…' : status === 'healthy' ? 'All systems go' : status}
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-glow">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">LexiClear AI</span>
          <HealthPill />
        </div>

        {user && (
          <nav className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100/60 p-1 dark:border-slate-800 dark:bg-slate-800/40">
            {TABS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-in-out ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
            {user.role === 'admin' && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-in-out ${
                    isActive
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </NavLink>
            )}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 sm:flex">
                <UserIcon className="h-4 w-4" />
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <NavLink
              to="/login"
              className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-1.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.02]"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
}
