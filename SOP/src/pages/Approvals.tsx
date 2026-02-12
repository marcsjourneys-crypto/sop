import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { approvals } from '../api/client';
import type { PendingApproval } from '../types';

export function Approvals() {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      setLoading(true);
      const data = await approvals.list();
      setPendingApprovals(data.approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading approvals...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          {pendingApprovals.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingApprovals.length} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-esi-blue text-esi-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kanban'
                  ? 'border-esi-blue text-esi-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Kanban
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'list' ? (
          pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">&#10003;</div>
              <h3 className="text-lg font-medium text-gray-900">No pending approvals</h3>
              <p className="text-gray-500 mt-1">All SOPs have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  onClick={() => navigate(`/approvals/${approval.id}`)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-esi-blue hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">{approval.sop_number}</span>
                        <span className="text-gray-300">&#183;</span>
                        <span className="font-medium text-gray-900">{approval.process_name || 'Untitled SOP'}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Department: {approval.department || 'Not specified'} &#183; {approval.change_count} change{approval.change_count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Submitted by {approval.requested_by.name} &#183; {formatRelativeTime(approval.requested_at)}
                      </div>
                      {approval.change_summary && (
                        <div className="text-sm text-gray-600 mt-2 italic">
                          "{approval.change_summary}"
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Kanban placeholder */
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">&#128679;</div>
            <h3 className="text-lg font-medium text-gray-900">Kanban view coming soon</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              This will include:
            </p>
            <ul className="text-gray-500 mt-2 text-sm">
              <li>&#8226; Visual pipeline (Pending &#8594; In Review &#8594; Done)</li>
              <li>&#8226; Assign reviews to team members</li>
              <li>&#8226; Drag-and-drop workflow</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
