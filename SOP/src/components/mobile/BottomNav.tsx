import { Link, useLocation } from 'react-router-dom';

export type TabId = 'home' | 'sops' | 'profile';

interface BottomNavProps {
  pendingCount?: number;
}

export function BottomNav({ pendingCount = 0 }: BottomNavProps) {
  const location = useLocation();

  const getActiveTab = (): TabId => {
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname === '/my-sops') return 'sops';
    return 'home';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 safe-area-bottom">
      <Link
        to="/dashboard"
        className={`flex flex-col items-center justify-center flex-1 h-full min-w-[80px] transition-colors ${
          activeTab === 'home' ? 'text-esi-blue' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
        <span className="text-xs mt-1 font-medium">Home</span>
        {activeTab === 'home' && (
          <div className="absolute bottom-0 w-12 h-0.5 bg-esi-blue rounded-full" />
        )}
      </Link>

      <Link
        to="/my-sops"
        className={`flex flex-col items-center justify-center flex-1 h-full min-w-[80px] transition-colors relative ${
          activeTab === 'sops' ? 'text-esi-blue' : 'text-gray-500'
        }`}
      >
        <div className="relative">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
        <span className="text-xs mt-1 font-medium">My SOPs</span>
        {activeTab === 'sops' && (
          <div className="absolute bottom-0 w-12 h-0.5 bg-esi-blue rounded-full" />
        )}
      </Link>

      <Link
        to="/profile"
        className={`flex flex-col items-center justify-center flex-1 h-full min-w-[80px] transition-colors ${
          activeTab === 'profile' ? 'text-esi-blue' : 'text-gray-500'
        }`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <span className="text-xs mt-1 font-medium">Profile</span>
        {activeTab === 'profile' && (
          <div className="absolute bottom-0 w-12 h-0.5 bg-esi-blue rounded-full" />
        )}
      </Link>
    </nav>
  );
}
