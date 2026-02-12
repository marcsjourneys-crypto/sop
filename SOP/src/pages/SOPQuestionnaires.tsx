import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { sops, questionnaires } from '../api/client';
import type { SOP, Questionnaire } from '../types';

export function SOPQuestionnaires() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sop, setSop] = useState<SOP | null>(null);
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sopData, allQuestionnaires] = await Promise.all([
          sops.get(Number(id)),
          questionnaires.list(),
        ]);
        setSop(sopData);
        setItems(allQuestionnaires.filter(q => q.sop_id === Number(id)));
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const handleDelete = async (itemId: number) => {
    if (!confirm('Delete this questionnaire? This cannot be undone.')) return;

    try {
      await questionnaires.delete(itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err) {
      setError('Failed to delete questionnaire');
    }
  };

  const handleCreate = async () => {
    try {
      const newItem = await questionnaires.create(Number(id));
      navigate(`/questionnaire/${newItem.id}`);
    } catch (err) {
      setError('Failed to create questionnaire');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/sop/${id}`)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Questionnaires for</span>
              <span className="font-mono font-bold text-esi-blue">{sop?.sop_number}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {sop?.process_name || 'Untitled Process'}
            </h1>
          </div>
          <button onClick={handleCreate} className="btn btn-primary">
            + New Questionnaire
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* List */}
        {items.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900">No questionnaires yet</h3>
            <p className="text-gray-500 mt-1">Create your first questionnaire for this SOP.</p>
            <button onClick={handleCreate} className="btn btn-primary mt-4">
              + New Questionnaire
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="card hover:shadow-md transition-shadow flex items-center justify-between"
              >
                <Link to={`/questionnaire/${item.id}`} className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {item.employee_name || 'Unnamed Employee'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.interview_date
                          ? new Date(item.interview_date).toLocaleDateString()
                          : 'No date set'}
                        {item.department && ` · ${item.department}`}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/questionnaire/${item.id}`}
                    className="px-3 py-1.5 text-sm text-esi-blue hover:bg-blue-50 rounded-md transition-colors"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back link */}
        <div className="pt-4">
          <Link
            to={`/sop/${id}`}
            className="text-esi-blue hover:underline inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to SOP
          </Link>
        </div>
      </div>
    </Layout>
  );
}
