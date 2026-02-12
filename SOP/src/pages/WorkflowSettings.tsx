import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useToast } from '../components/Toast';
import { workflow } from '../api/client';
import type { WorkflowStep, WorkflowTransition } from '../types';

const colorOptions = [
  { value: 'yellow', label: 'Yellow', class: 'bg-yellow-100 text-yellow-800' },
  { value: 'red', label: 'Red', class: 'bg-red-100 text-red-800' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-100 text-blue-800' },
  { value: 'green', label: 'Green', class: 'bg-green-100 text-green-800' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-100 text-purple-800' },
  { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-100 text-teal-800' },
  { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
  { value: 'gray', label: 'Gray', class: 'bg-gray-100 text-gray-800' },
];

export function WorkflowSettings() {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [transitions, setTransitions] = useState<WorkflowTransition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStep, setNewStep] = useState({ status_key: '', display_label: '', color: 'gray' });
  const { addToast } = useToast();

  useEffect(() => {
    loadWorkflow();
  }, []);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const [stepsData, transitionsData] = await Promise.all([
        workflow.getSteps(),
        workflow.getTransitions(),
      ]);
      setSteps(stepsData);
      setTransitions(transitionsData);
    } catch (err) {
      addToast('Failed to load workflow configuration', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStep = async (step: WorkflowStep) => {
    try {
      setSaving(true);
      await workflow.updateStep(step.id, {
        display_label: step.display_label,
        color: step.color,
        requires_approval: step.requires_approval,
        can_edit: step.can_edit,
      });
      setSteps(steps.map(s => s.id === step.id ? step : s));
      setEditingStep(null);
      addToast('Step updated', 'success');
    } catch (err) {
      addToast('Failed to update step', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddStep = async () => {
    if (!newStep.status_key || !newStep.display_label) {
      addToast('Status key and label are required', 'warning');
      return;
    }

    try {
      setSaving(true);
      const created = await workflow.addStep({
        status_key: newStep.status_key.toLowerCase().replace(/\s+/g, '_'),
        display_label: newStep.display_label,
        color: newStep.color,
      });
      setSteps([...steps, created]);
      setShowAddModal(false);
      setNewStep({ status_key: '', display_label: '', color: 'gray' });
      addToast('Step added', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add step';
      addToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStep = async (step: WorkflowStep) => {
    if (!confirm(`Delete "${step.display_label}" step? This cannot be undone.`)) return;

    try {
      await workflow.deleteStep(step.id);
      setSteps(steps.filter(s => s.id !== step.id));
      addToast('Step deleted', 'success');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete step';
      addToast(errorMessage, 'error');
    }
  };

  const isTransitionEnabled = (from: string, to: string) => {
    return transitions.some(t => t.from_status === from && t.to_status === to);
  };

  const toggleTransition = (from: string, to: string) => {
    if (from === to) return;

    const existing = transitions.find(t => t.from_status === from && t.to_status === to);
    if (existing) {
      setTransitions(transitions.filter(t => t.id !== existing.id));
    } else {
      setTransitions([...transitions, {
        id: Date.now(), // temporary id
        from_status: from,
        to_status: to,
        requires_admin: false,
        auto_creates_approval: false,
      }]);
    }
  };

  const handleSaveTransitions = async () => {
    try {
      setSaving(true);
      await workflow.updateTransitions(transitions.map(t => ({
        from_status: t.from_status,
        to_status: t.to_status,
        requires_admin: t.requires_admin,
        auto_creates_approval: t.auto_creates_approval,
      })));
      addToast('Transitions saved', 'success');
    } catch (err) {
      addToast('Failed to save transitions', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading workflow configuration...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Configuration</h1>
        <p className="text-gray-600 mt-1">Configure workflow steps and transitions for SOPs</p>
      </div>

      {/* Workflow Steps */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 border-0 pb-0">Workflow Steps</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary text-sm"
          >
            + Add Step
          </button>
        </div>

        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
            >
              <div className="w-8 text-center text-gray-400 font-mono text-sm">
                {index + 1}
              </div>

              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                colorOptions.find(c => c.value === step.color)?.class || 'bg-gray-100 text-gray-800'
              }`}>
                {step.display_label}
              </div>

              <div className="text-xs text-gray-500 font-mono">
                {step.status_key}
              </div>

              <div className="flex-1" />

              {step.is_initial && (
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">Initial</span>
              )}
              {step.is_final && (
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Final</span>
              )}
              {step.requires_approval && (
                <span className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded">Requires Approval</span>
              )}
              {!step.can_edit && (
                <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">Read-only</span>
              )}

              <button
                onClick={() => setEditingStep(step)}
                className="p-1.5 text-gray-400 hover:text-esi-blue hover:bg-blue-50 rounded"
                title="Edit step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>

              {!step.is_initial && !step.is_final && (
                <button
                  onClick={() => handleDeleteStep(step)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete step"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Transition Matrix */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0 border-0 pb-0">Allowed Transitions</h2>
          <button
            onClick={handleSaveTransitions}
            disabled={saving}
            className="btn btn-primary text-sm"
          >
            {saving ? 'Saving...' : 'Save Transitions'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Check the boxes to allow transitions between statuses. Rows are "from" status, columns are "to" status.
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="p-2 text-left text-xs font-medium text-gray-500">From → To</th>
                {steps.map(step => (
                  <th key={step.id} className="p-2 text-center text-xs font-medium text-gray-500">
                    {step.display_label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.map(fromStep => (
                <tr key={fromStep.id} className="border-t">
                  <td className="p-2 text-sm font-medium text-gray-700">
                    {fromStep.display_label}
                  </td>
                  {steps.map(toStep => (
                    <td key={toStep.id} className="p-2 text-center">
                      {fromStep.id === toStep.id ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isTransitionEnabled(fromStep.status_key, toStep.status_key)}
                          onChange={() => toggleTransition(fromStep.status_key, toStep.status_key)}
                          className="w-4 h-4 text-esi-blue rounded border-gray-300 focus:ring-esi-blue"
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Step</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Display Label</label>
                <input
                  type="text"
                  value={editingStep.display_label}
                  onChange={e => setEditingStep({ ...editingStep, display_label: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Color</label>
                <select
                  value={editingStep.color}
                  onChange={e => setEditingStep({ ...editingStep, color: e.target.value })}
                  className="input"
                >
                  {colorOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingStep.requires_approval}
                    onChange={e => setEditingStep({ ...editingStep, requires_approval: e.target.checked })}
                    className="w-4 h-4 text-esi-blue rounded border-gray-300"
                  />
                  <span className="text-sm">Requires Approval</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingStep.can_edit}
                    onChange={e => setEditingStep({ ...editingStep, can_edit: e.target.checked })}
                    className="w-4 h-4 text-esi-blue rounded border-gray-300"
                  />
                  <span className="text-sm">Can Edit</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingStep(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateStep(editingStep)}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">Add Workflow Step</h3>

            <div className="space-y-4">
              <div>
                <label className="label">Status Key</label>
                <input
                  type="text"
                  value={newStep.status_key}
                  onChange={e => setNewStep({ ...newStep, status_key: e.target.value })}
                  placeholder="e.g., qa_review"
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Lowercase, underscores for spaces. Used internally.</p>
              </div>

              <div>
                <label className="label">Display Label</label>
                <input
                  type="text"
                  value={newStep.display_label}
                  onChange={e => setNewStep({ ...newStep, display_label: e.target.value })}
                  placeholder="e.g., QA Review"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Color</label>
                <select
                  value={newStep.color}
                  onChange={e => setNewStep({ ...newStep, color: e.target.value })}
                  className="input"
                >
                  {colorOptions.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewStep({ status_key: '', display_label: '', color: 'gray' });
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStep}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Adding...' : 'Add Step'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
