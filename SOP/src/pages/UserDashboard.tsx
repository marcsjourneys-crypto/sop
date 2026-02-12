import { useState } from 'react';
import { MobileLayout } from '../components/mobile/MobileLayout';
import { TaskCard } from '../components/mobile/TaskCard';
import { useAuth } from '../hooks/useAuth';
import { useUserSops } from '../hooks/useUserSops';

export function UserDashboard() {
  const { user } = useAuth();
  const { tasks, pending, completed, loading, error, reload } = useUserSops();
  const [showCompleted, setShowCompleted] = useState(false);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <MobileLayout pendingCount={tasks.length}>
      <div className="px-4 py-6">
        {/* Welcome section */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {getGreeting()}, {firstName}!
          </h1>
          {tasks.length === 0 && pending.length === 0 && (
            <p className="text-gray-500 mt-1">No tasks assigned to you yet.</p>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
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
              <span>Loading your tasks...</span>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* My Tasks section */}
            {tasks.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-700">
                    My Tasks
                  </h2>
                  <span className="bg-esi-blue text-white text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {tasks.map((sop) => (
                    <TaskCard key={sop.id} sop={sop} />
                  ))}
                </div>
              </section>
            )}

            {/* Awaiting Approval section */}
            {pending.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-700">
                    Awaiting Approval
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                    {pending.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {pending.map((sop) => (
                    <TaskCard key={sop.id} sop={sop} interactive={false} />
                  ))}
                </div>
              </section>
            )}

            {/* Completed section (collapsible) */}
            {completed.length > 0 && (
              <section className="mb-8">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center justify-between w-full mb-3 text-left"
                >
                  <h2 className="text-lg font-semibold text-gray-700">
                    Completed
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
                      {completed.length}
                    </span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${
                        showCompleted ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </button>
                {showCompleted && (
                  <div className="space-y-3">
                    {completed.map((sop) => (
                      <TaskCard key={sop.id} sop={sop} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Empty state */}
            {tasks.length === 0 && pending.length === 0 && completed.length === 0 && (
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">
                  No SOPs assigned
                </h3>
                <p className="text-gray-500">
                  Your admin will assign SOPs for you to work on.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </MobileLayout>
  );
}
