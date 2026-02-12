import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/approvals/count', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setApprovalCount(data.count))
        .catch(() => setApprovalCount(0));
    }
  }, [isAdmin, location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-esi-blue text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="text-2xl font-bold">ESI</div>
              <div className="text-sm opacity-90 hidden sm:block">SOP Management</div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 sm:gap-4">
              <Link
                to="/dashboard"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard') ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
              >
                Dashboard
              </Link>

              {isAdmin && (
                <>
                  <Link
                    to="/approvals"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      location.pathname.startsWith('/approvals') ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    Approvals
                    {approvalCount > 0 && (
                      <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-xs">
                        {approvalCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/users"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/admin/users') ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    Users
                  </Link>
                  <Link
                    to="/admin/settings"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive('/admin/settings') ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    Settings
                  </Link>
                </>
              )}

              <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/30">
                <span className="text-sm hidden sm:inline">{user?.name}</span>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
