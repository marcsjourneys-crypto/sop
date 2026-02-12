import { useState, useMemo } from 'react';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { TaskCard } from '../components/mobile/TaskCard';
import { useUserSops } from '../hooks/useUserSops';
import type { SOPStatus } from '../types';

type FilterStatus = 'all' | SOPStatus;

export function MySops() {
  const { all, loading, error, reload } = useUserSops();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  // Filter SOPs based on status and search
  const filteredSops = useMemo(() => {
    let result = all;

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(sop => sop.status === filter);
    }

    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(sop =>
        sop.sop_number.toLowerCase().includes(searchLower) ||
        sop.process_name?.toLowerCase().includes(searchLower) ||
        sop.department?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [all, filter, search]);

  // Count by status
  const counts = useMemo(() => ({
    all: all.length,
    draft: all.filter(s => s.status === 'draft').length,
    review: all.filter(s => s.status === 'review').length,
    pending_approval: all.filter(s => s.status === 'pending_approval').length,
    active: all.filter(s => s.status === 'active').length,
  }), [all]);

  const filterButtons: { label: string; value: FilterStatus; color: string }[] = [
    { label: 'All', value: 'all', color: 'bg-gray-100 text-gray-700' },
    { label: 'Draft', value: 'draft', color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Review', value: 'review', color: 'bg-red-100 text-red-700' },
    { label: 'Pending', value: 'pending_approval', color: 'bg-blue-100 text-blue-700' },
    { label: 'Active', value: 'active', color: 'bg-green-100 text-green-700' },
  ];

  return (
    <MobileLayout title="My SOPs">
      <div className="px-4 py-4">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search SOPs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4">
          {filterButtons.map(({ label, value, color }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap
                transition-all
                ${filter === value
                  ? 'ring-2 ring-esi-blue ring-offset-1'
                  : ''
                }
                ${color}
              `}
            >
              {label}
              <span className="text-xs opacity-75">({counts[value]})</span>
            </button>
          ))}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <p>{error}</p>
            <button
              onClick={reload}
              className="text-red-800 underline mt-2 text-sm font-medium"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-500">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Loading...</span>
            </div>
          </div>
        )}

        {/* SOP List */}
        {!loading && (
          <>
            {filteredSops.length > 0 ? (
              <div className="space-y-3">
                {filteredSops.map((sop) => (
                  <TaskCard
                    key={sop.id}
                    sop={sop}
                    interactive={sop.status !== 'pending_approval'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  {search || filter !== 'all' ? 'No matching SOPs' : 'No SOPs assigned'}
                </h3>
                <p className="text-gray-500">
                  {search || filter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Your admin will assign SOPs for you to work on.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
