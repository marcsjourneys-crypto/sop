import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { BottomNav } from './BottomNav';

interface MobileLayoutProps {
  children: ReactNode;
  /** Page title shown in header */
  title?: string;
  /** Show back button instead of logo */
  showBack?: boolean;
  /** Custom back handler */
  onBack?: () => void;
  /** Hide bottom navigation (for full-screen pages) */
  hideNav?: boolean;
  /** Number of pending tasks for nav badge */
  pendingCount?: number;
}

export function MobileLayout({
  children,
  title,
  showBack = false,
  onBack,
  hideNav = false,
  pendingCount = 0,
}: MobileLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-esi-blue text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 safe-area-top">
        <div className="flex items-center gap-3">
          {showBack ? (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <span className="font-bold text-lg">ESI SOP</span>
          )}
          {title && <span className="font-medium">{title}</span>}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white/80">{user?.name?.split(' ')[0]}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className={`flex-1 ${hideNav ? '' : 'pb-20'}`}>
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && <BottomNav pendingCount={pendingCount} />}
    </div>
  );
}
