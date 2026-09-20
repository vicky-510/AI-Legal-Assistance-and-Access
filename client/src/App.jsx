import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Analyze from './pages/Analyze.jsx';
import Diff from './pages/Diff.jsx';
import History from './pages/History.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen bg-ceramic text-slate-900 dark:bg-obsidian dark:text-slate-100">
      <Navbar />
      <main>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Analyze />} />
              <Route path="/diff" element={<Diff />} />
              <Route path="/history" element={<History />} />
            </Route>

            <Route element={<ProtectedRoute roles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  );
}
