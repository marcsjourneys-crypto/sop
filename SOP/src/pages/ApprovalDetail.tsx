import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { approvals } from '../api/client';
import type { ApprovalDetail as ApprovalDetailType, ChangeItem } from '../types';

export function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<ApprovalDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApproval();
  }, [id]);

  async function loadApproval() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await approvals.get(parseInt(id));
      setApproval(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approval) return;
    try {
      setSubmitting(true);
      await approvals.approve(approval.sop_id, approval.id, comments || undefined);
      navigate('/approvals', { state: { message: `${approval.sop_number} approved` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!approval) return;
    if (!comments.trim()) {
      setError('Comments are required when rejecting');
      return;
    }
    try {
      setSubmitting(true);
      await approvals.reject(approval.sop_id, approval.id, comments);
      navigate('/approvals', { state: { message: `${approval.sop_number} rejected` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
      setSubmitting(false);
    }
  }

  function toggleChange(field: string) {
    setExpandedChanges(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getChangeIcon(type: ChangeItem['type']): string {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      case 'reordered': return '\u2195';
      default: return '\u2022';
    }
  }

  function getChangeColor(type: ChangeItem['type']): string {
    switch (type) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      case 'modified': return 'text-blue-600 bg-blue-50';
      case 'reordered': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading approval...</div>
        </div>
      </Layout>
    );
  }

  if (error && !approval) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  if (!approval) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">
          Approval not found
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/approvals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Approvals
        </Link>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">{approval.sop_number}</span>
                <span className="text-gray-300">|</span>
                <span className="text-xl font-medium text-gray-900">{approval.process_name || 'Untitled SOP'}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">v{approval.version}</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Submitted by {approval.requested_by.name} | {formatDate(approval.requested_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Changes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Changes in this version ({approval.changes.length})
          </h2>

          {approval.changes.length === 0 ? (
            <p className="text-gray-500">No changes detected.</p>
          ) : (
            <div className="space-y-2">
              {approval.changes.map((change) => (
                <div key={change.field} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleChange(change.field)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    <span className={`w-6 h-6 flex items-center justify-center rounded font-mono text-sm ${getChangeColor(change.type)}`}>
                      {getChangeIcon(change.type)}
                    </span>
                    <span className="flex-1 text-gray-900">{change.label}</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedChanges.has(change.field) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedChanges.has(change.field) && (change.before || change.after) && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        {change.before && (
                          <div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Before</div>
                            <div className="text-red-700 bg-red-50 p-2 rounded border border-red-100 whitespace-pre-wrap">
                              {change.before}
                            </div>
                          </div>
                        )}
                        {change.after && (
                          <div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">After</div>
                            <div className="text-green-700 bg-green-50 p-2 rounded border border-green-100 whitespace-pre-wrap">
                              {change.after}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Full SOP */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Link
            to={`/sop/${approval.sop_id}`}
            target="_blank"
            className="inline-flex items-center text-esi-blue hover:underline"
          >
            View Full SOP
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Comments & Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments {comments.trim() === '' && <span className="text-gray-400 font-normal">(required for rejection)</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-esi-blue focus:border-esi-blue"
            placeholder="Add comments..."
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
