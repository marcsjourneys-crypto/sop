import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { sops } from '../api/client';
import { SOP } from '../types';

export function Dashboard() {
  const [sopList, setSopList] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'draft' | 'active' | 'review'>('all');
  const [search, setSearch] = useState('');
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
            <Link
              key={sop.id}
              to={`/sop/${sop.id}`}
              className="card hover:shadow-lg transition-shadow"
            >
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
                <div className="text-sm text-gray-400">
                  {sop.review_due_date && (
                    <div>Review: {new Date(sop.review_due_date).toLocaleDateString()}</div>
                  )}
                  <div>Updated: {new Date(sop.updated_at).toLocaleDateString()}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
