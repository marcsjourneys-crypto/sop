import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { settings } from '../api/client';
import type { Settings } from '../types';

export function AdminSettings() {
  const [form, setForm] = useState<Settings>({ review_period_days: '90' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    settings.get()
      .then(setForm)
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await settings.update(form);
      setMessage('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Layout><div className="text-center py-12">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">System Settings</h1>

      {message && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md mb-4">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="card max-w-xl">
        <h2 className="section-title">SOP Review Settings</h2>

        <div className="form-group">
          <label className="label">Review Period (days)</label>
          <p className="text-sm text-gray-500 mb-2">
            SOPs will be flagged for review after this many days from activation.
          </p>
          <input
            type="number"
            min="1"
            value={form.review_period_days}
            onChange={(e) => setForm({ ...form, review_period_days: e.target.value })}
            className="input w-32"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary mt-4"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </Layout>
  );
}
