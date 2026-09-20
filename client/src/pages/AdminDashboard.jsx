import { useEffect, useState } from 'react';
import { ShieldCheck, Trash2, RotateCcw, KeyRound, Copy, X, Users, FileText, Activity } from 'lucide-react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';

function ResetPasswordModal({ result, onClose }) {
  const { push } = useToast();
  if (!result) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.newPassword);
      push('Password copied to clipboard.', 'success');
    } catch {
      push('Could not copy automatically — select and copy manually.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Password Reset</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{result.email}</p>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
          <code className="flex-1 select-all break-all text-sm font-medium">{result.newPassword}</code>
          <button onClick={copy} className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
          This password is shown only once — copy it now and share it securely with the user.
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const { push } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetResult, setResetResult] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, u, d] = await Promise.all([
        api.adminStats(),
        api.adminListUsers(),
        api.adminListDocuments(),
      ]);
      setStats(s);
      setUsers(u.users);
      setDocuments(d.contracts);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to load admin data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRoleChange = async (id, role) => {
    try {
      await api.adminSetRole(id, role);
      push(`Role updated to ${role}.`, 'success');
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to update role.', 'error');
    }
  };

  const handleRevoke = async (id) => {
    try {
      await api.adminRevokeUser(id);
      push('Sessions revoked for this user.', 'success');
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to revoke sessions.', 'error');
    }
  };

  const handleResetPassword = async (id) => {
    if (!window.confirm('Reset this user\'s password? Their current password will stop working immediately.')) return;
    try {
      const result = await api.adminResetPassword(id);
      setResetResult(result);
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to reset password.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this user and their documents?')) return;
    try {
      await api.adminDeleteUser(id);
      push('User deleted.', 'success');
      load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : 'Failed to delete user.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-indigo-500" />
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      </div>

      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard icon={Users} label="Users" value={stats.userCount} />
          <StatCard icon={ShieldCheck} label="Admins" value={stats.adminCount} />
          <StatCard icon={FileText} label="Documents Analyzed" value={stats.documentCount} />
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 className="font-semibold">User Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Joined</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-6 py-3 font-medium">{u.name}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{u.email}</td>
                  <td className="px-6 py-3">
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        title="Reset password"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-500"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRevoke(u.id)}
                        title="Revoke sessions"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-amber-500/10 hover:text-amber-500"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={u.id === currentUser.id}
                        title="Delete user"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <Activity className="h-4 w-4 text-slate-400" />
          <h2 className="font-semibold">Recent Documents</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-6 py-3">File</th>
                <th className="px-6 py-3">Owner</th>
                <th className="px-6 py-3">Risk</th>
                <th className="px-6 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d._id} className="border-b border-slate-50 last:border-0 dark:border-slate-800/60">
                  <td className="px-6 py-3 font-medium">{d.fileName}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{d.owner?.email}</td>
                  <td className="px-6 py-3">{d.overallRiskScore}</td>
                  <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ResetPasswordModal result={resetResult} onClose={() => setResetResult(null)} />
    </div>
  );
}
