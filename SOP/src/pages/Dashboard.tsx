import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { sops } from '../api/client';
import type { SOP } from '../types';

export function Dashboard() {
  const [sopList, setSopList] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'review'>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list');
  const navigate = useNavigate();

  useEffect(() => {
    loadSops();
  }, []);

  const loadSops = async () => {
    try {
      const data = await sops.list();
      setSopList(data);
    } catch (err) {
      setError('Failed to load SOPs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSop = async () => {
    try {
      const newSop = await sops.create();
      navigate(`/sop/${newSop.id}`);
    } catch (err) {
      setError('Failed to create SOP');
    }
  };

  const handleDeleteSop = async (e: React.MouseEvent, sopId: number, sopNumber: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Delete ${sopNumber}? This cannot be undone.`)) return;

    try {
      await sops.delete(sopId);
      setSopList(sopList.filter(s => s.id !== sopId));
    } catch (err) {
      setError('Failed to delete SOP');
    }
  };

  const filteredSops = sopList.filter((sop) => {
    if (filter !== 'all' && sop.status !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        sop.sop_number.toLowerCase().includes(searchLower) ||
        sop.process_name?.toLowerCase().includes(searchLower) ||
        sop.department?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const statusCounts = {
    all: sopList.length,
    draft: sopList.filter((s) => s.status === 'draft').length,
    active: sopList.filter((s) => s.status === 'active').length,
    review: sopList.filter((s) => s.status === 'review').length,
  };

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">SOPs</h1>
        <button onClick={handleCreateSop} className="btn btn-primary">
          + New SOP
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setViewMode('list')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'list'
                ? 'border-esi-blue text-esi-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'board'
                ? 'border-esi-blue text-esi-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Board
          </button>
        </nav>
      </div>

      {viewMode === 'list' ? (
      <>
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by SOP #, process name, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'draft', 'active', 'review'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-esi-blue text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : filteredSops.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            {search || filter !== 'all' ? 'No SOPs match your filters' : 'No SOPs yet. Create your first one!'}
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSops.map((sop) => (
            <div key={sop.id} className="card hover:shadow-lg transition-shadow relative">
              <Link to={`/sop/${sop.id}`} className="block">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-esi-blue">{sop.sop_number}</span>
                      <StatusBadge status={sop.status} />
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {sop.process_name || 'Untitled Process'}
                    </h3>
                    {sop.department && (
                      <p className="text-sm text-gray-500">{sop.department}</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 text-right">
                    {sop.review_due_date && (
                      <div>Review: {new Date(sop.review_due_date).toLocaleDateString()}</div>
                    )}
                    <div>Updated: {new Date(sop.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </Link>
              <button
                onClick={(e) => handleDeleteSop(e, sop.id, sop.sop_number)}
                className="absolute top-2 right-2 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete SOP"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      </>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Draft Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Draft</h3>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {sopList.filter(s => s.status === 'draft').length}
              </span>
            </div>
            <div className="space-y-3">
              {sopList.filter(s => s.status === 'draft').map(sop => (
                <Link
                  key={sop.id}
                  to={`/sop/${sop.id}`}
                  className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 border-yellow-400"
                >
                  <div className="font-mono text-xs text-gray-500">{sop.sop_number}</div>
                  <div className="font-medium text-gray-900 text-sm mt-1">{sop.process_name || 'Untitled'}</div>
                  {sop.department && <div className="text-xs text-gray-500 mt-1">{sop.department}</div>}
                </Link>
              ))}
              {sopList.filter(s => s.status === 'draft').length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">No drafts</div>
              )}
            </div>
          </div>

          {/* Review Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Review</h3>
              <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {sopList.filter(s => s.status === 'review').length}
              </span>
            </div>
            <div className="space-y-3">
              {sopList.filter(s => s.status === 'review').map(sop => (
                <Link
                  key={sop.id}
                  to={`/sop/${sop.id}`}
                  className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 border-red-400"
                >
                  <div className="font-mono text-xs text-gray-500">{sop.sop_number}</div>
                  <div className="font-medium text-gray-900 text-sm mt-1">{sop.process_name || 'Untitled'}</div>
                  {sop.department && <div className="text-xs text-gray-500 mt-1">{sop.department}</div>}
                </Link>
              ))}
              {sopList.filter(s => s.status === 'review').length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">No reviews</div>
              )}
            </div>
          </div>

          {/* Pending Approval Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Pending Approval</h3>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {sopList.filter(s => s.status === 'pending_approval').length}
              </span>
            </div>
            <div className="space-y-3">
              {sopList.filter(s => s.status === 'pending_approval').map(sop => (
                <Link
                  key={sop.id}
                  to={`/sop/${sop.id}`}
                  className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 border-blue-400"
                >
                  <div className="font-mono text-xs text-gray-500">{sop.sop_number}</div>
                  <div className="font-medium text-gray-900 text-sm mt-1">{sop.process_name || 'Untitled'}</div>
                  {sop.department && <div className="text-xs text-gray-500 mt-1">{sop.department}</div>}
                </Link>
              ))}
              {sopList.filter(s => s.status === 'pending_approval').length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">None pending</div>
              )}
            </div>
          </div>

          {/* Active Column */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Active</h3>
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-medium">
                {sopList.filter(s => s.status === 'active').length}
              </span>
            </div>
            <div className="space-y-3">
              {sopList.filter(s => s.status === 'active').map(sop => (
                <Link
                  key={sop.id}
                  to={`/sop/${sop.id}`}
                  className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 border-green-400"
                >
                  <div className="font-mono text-xs text-gray-500">{sop.sop_number}</div>
                  <div className="font-medium text-gray-900 text-sm mt-1">{sop.process_name || 'Untitled'}</div>
                  {sop.department && <div className="text-xs text-gray-500 mt-1">{sop.department}</div>}
                </Link>
              ))}
              {sopList.filter(s => s.status === 'active').length === 0 && (
                <div className="text-sm text-gray-400 text-center py-4">None active</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
