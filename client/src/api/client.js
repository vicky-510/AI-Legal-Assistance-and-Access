// In dev, Vite's proxy (vite.config.js) forwards relative /api and /health
// calls to localhost:5000, so BASE stays empty. In production the frontend
// and backend are deployed separately (e.g. Vercel + Vercel), so BASE must
// point at the deployed backend's absolute URL via VITE_API_URL.
const BASE = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

async function request(path, { method = 'GET', body, isFormData = false, signal } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await res.json().catch(() => null);
  }

  if (!res.ok) {
    throw new ApiError(payload?.error || `Request failed with status ${res.status}`, res.status, payload);
  }

  return payload;
}

// Fetches a binary file (PDF report) and triggers a browser save-as, rather
// than a plain <a href> navigation — that way a 401/404 from an expired
// session or missing document surfaces as a normal ApiError/toast instead
// of the browser trying to "download" a JSON error body as a broken PDF.
async function downloadFile(path, filename) {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });

  if (!res.ok) {
    let payload = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await res.json().catch(() => null);
    }
    throw new ApiError(payload?.error || `Download failed with status ${res.status}`, res.status, payload);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  health: () => request('/health'),

  register: (data) => request('/api/auth/register', { method: 'POST', body: data }),
  login: (data) => request('/api/auth/login', { method: 'POST', body: data }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  analyzeDocument: (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('/api/documents/analyze', { method: 'POST', body: form, isFormData: true });
  },
  diffDocuments: (fileA, fileB) => {
    const form = new FormData();
    form.append('fileA', fileA);
    form.append('fileB', fileB);
    return request('/api/documents/diff', { method: 'POST', body: form, isFormData: true });
  },
  listContracts: () => request('/api/documents'),
  getContract: (id) => request(`/api/documents/${id}`),
  listComparisons: () => request('/api/documents/diffs'),
  getComparison: (id) => request(`/api/documents/diffs/${id}`),
  downloadContractReport: (id, fileName) =>
    downloadFile(`/api/documents/${id}/report`, `LexiClear-Analysis-${fileName || id}.pdf`),
  downloadComparisonReport: (id, label) =>
    downloadFile(`/api/documents/diffs/${id}/report`, `LexiClear-Comparison-${label || id}.pdf`),

  askQuestion: (contractId, question) =>
    request(`/api/chat/${contractId}`, { method: 'POST', body: { question } }),
  askComparisonQuestion: (comparisonId, question) =>
    request(`/api/chat/comparison/${comparisonId}`, { method: 'POST', body: { question } }),

  adminListUsers: () => request('/api/admin/users'),
  adminSetRole: (id, role) => request(`/api/admin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  adminRevokeUser: (id) => request(`/api/admin/users/${id}/revoke`, { method: 'POST' }),
  adminResetPassword: (id) => request(`/api/admin/users/${id}/reset-password`, { method: 'POST' }),
  adminDeleteUser: (id) => request(`/api/admin/users/${id}`, { method: 'DELETE' }),
  adminListDocuments: () => request('/api/admin/documents'),
  adminStats: () => request('/api/admin/stats'),
};

export { ApiError };
