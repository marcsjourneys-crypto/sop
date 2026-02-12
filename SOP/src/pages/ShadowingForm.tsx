import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SaveIndicator } from '../components/SaveIndicator';
import { useAutoSave } from '../hooks/useAutoSave';
import { shadowing, sops } from '../api/client';
import { ShadowingObservation, SOP } from '../types';

export function ShadowingForm() {
  const { id, sopId } = useParams<{ id?: string; sopId?: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<ShadowingObservation | null>(null);
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const data = await shadowing.get(parseInt(id));
          setForm(data);
          if (data.sop_id) {
            const sopData = await sops.get(data.sop_id);
            setSop(sopData);
          }
        } else if (sopId) {
          const sopData = await sops.get(parseInt(sopId));
          setSop(sopData);
          const newForm = await shadowing.create(parseInt(sopId));
          setForm(newForm);
          navigate(`/shadowing/${newForm.id}`, { replace: true });
        }
      } catch (err) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, sopId, navigate]);

  const handleSave = useCallback(async (data: Partial<ShadowingObservation>) => {
    if (!form?.id) return;
    await shadowing.update(form.id, data);
  }, [form?.id]);

  const { saving, lastSaved, error: saveError } = useAutoSave({
    data: form || {},
    onSave: handleSave,
    enabled: !!form,
  });

  const updateField = (field: keyof ShadowingObservation, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
  };

  const handleDelete = async () => {
    if (!form?.id || !confirm('Delete this observation?')) return;
    await shadowing.delete(form.id);
    navigate(sop ? `/sop/${sop.id}` : '/dashboard');
  };

  if (loading) {
    return <Layout><div className="text-center py-12">Loading...</div></Layout>;
  }

  if (!form) {
    return <Layout><div className="text-center py-12 text-red-600">{error || 'Not found'}</div></Layout>;
  }

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to={sop ? `/sop/${sop.id}` : '/dashboard'} className="text-gray-500 hover:text-gray-700">
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold text-esi-blue">Shadowing Observation</h1>
          </div>
          <SaveIndicator saving={saving} lastSaved={lastSaved} error={saveError} />
        </div>
        {sop && (
          <p className="text-gray-500 mt-2">Linked to: {sop.sop_number} - {sop.process_name}</p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Header Info */}
        <div className="card">
          <h2 className="section-title">Observation Information</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="form-group">
              <label className="label">Employee Being Observed</label>
              <input type="text" value={form.employee_observed || ''} onChange={(e) => updateField('employee_observed', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Department</label>
              <input type="text" value={form.department || ''} onChange={(e) => updateField('department', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Position</label>
              <input type="text" value={form.position || ''} onChange={(e) => updateField('position', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Observer</label>
              <input type="text" value={form.observer || ''} onChange={(e) => updateField('observer', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Date</label>
              <input type="date" value={form.observation_date || ''} onChange={(e) => updateField('observation_date', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Time From</label>
              <input type="time" value={form.time_from || ''} onChange={(e) => updateField('time_from', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Time To</label>
              <input type="time" value={form.time_to || ''} onChange={(e) => updateField('time_to', e.target.value)} className="input" />
            </div>
          </div>
        </div>

        {/* Pre-Observation */}
        <div className="card">
          <h2 className="section-title">Pre-Observation Briefing</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">What process will you be observing?</label>
              <textarea value={form.process_to_observe || ''} onChange={(e) => updateField('process_to_observe', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">What are the expected steps?</label>
              <textarea value={form.expected_steps || ''} onChange={(e) => updateField('expected_steps', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">Safety Concerns</label>
              <div className="safety-box mb-2">Document any safety considerations before beginning observation.</div>
              <textarea value={form.safety_concerns || ''} onChange={(e) => updateField('safety_concerns', e.target.value)} className="input min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Process Observation */}
        <div className="card">
          <h2 className="section-title">Section 1: Process Observation</h2>
          <div className="form-group">
            <label className="label">Process Steps Observed (Document each step as it happens)</label>
            <textarea value={form.process_steps || ''} onChange={(e) => updateField('process_steps', e.target.value)} className="input min-h-[200px]" placeholder="Step 1: ...&#10;Step 2: ...&#10;Step 3: ..." />
          </div>
        </div>

        {/* Time & Efficiency */}
        <div className="card">
          <h2 className="section-title">Section 2: Time & Efficiency Observations</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="form-group">
              <label className="label">Total Process Time</label>
              <input type="text" value={form.time_total || ''} onChange={(e) => updateField('time_total', e.target.value)} className="input" placeholder="e.g., 45 min" />
            </div>
            <div className="form-group">
              <label className="label">Time Searching for Tools</label>
              <input type="text" value={form.time_searching_tools || ''} onChange={(e) => updateField('time_searching_tools', e.target.value)} className="input" placeholder="e.g., 5 min" />
            </div>
            <div className="form-group">
              <label className="label">Time Changing/Switching Tools</label>
              <input type="text" value={form.time_changing_tools || ''} onChange={(e) => updateField('time_changing_tools', e.target.value)} className="input" placeholder="e.g., 3 min" />
            </div>
            <div className="form-group">
              <label className="label">Process Changeover Time</label>
              <input type="text" value={form.time_changeover || ''} onChange={(e) => updateField('time_changeover', e.target.value)} className="input" placeholder="e.g., 10 min" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Waiting for:</label>
              <textarea value={form.waiting_for || ''} onChange={(e) => updateField('waiting_for', e.target.value)} className="input min-h-[60px]" />
            </div>
            <div className="form-group">
              <label className="label">Searching for:</label>
              <textarea value={form.searching_for || ''} onChange={(e) => updateField('searching_for', e.target.value)} className="input min-h-[60px]" />
            </div>
            <div className="form-group">
              <label className="label">Rework due to:</label>
              <textarea value={form.rework_due_to || ''} onChange={(e) => updateField('rework_due_to', e.target.value)} className="input min-h-[60px]" />
            </div>
            <div className="form-group">
              <label className="label">Bottlenecks (Where did work slow down?)</label>
              <textarea value={form.bottlenecks || ''} onChange={(e) => updateField('bottlenecks', e.target.value)} className="input min-h-[60px]" />
            </div>
          </div>
        </div>

        {/* Decision Points */}
        <div className="card">
          <h2 className="section-title">Section 3: Decision Points & Judgment Calls</h2>
          <div className="border border-gray-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-esi-blue mb-3">Decision Point 1</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Situation</label>
                <textarea value={form.decision_point_1_situation || ''} onChange={(e) => updateField('decision_point_1_situation', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Options considered</label>
                <textarea value={form.decision_point_1_options || ''} onChange={(e) => updateField('decision_point_1_options', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Decision made</label>
                <textarea value={form.decision_point_1_decision || ''} onChange={(e) => updateField('decision_point_1_decision', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Reasoning</label>
                <textarea value={form.decision_point_1_reasoning || ''} onChange={(e) => updateField('decision_point_1_reasoning', e.target.value)} className="input min-h-[60px]" />
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-esi-blue mb-3">Decision Point 2</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="label">Situation</label>
                <textarea value={form.decision_point_2_situation || ''} onChange={(e) => updateField('decision_point_2_situation', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Options considered</label>
                <textarea value={form.decision_point_2_options || ''} onChange={(e) => updateField('decision_point_2_options', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Decision made</label>
                <textarea value={form.decision_point_2_decision || ''} onChange={(e) => updateField('decision_point_2_decision', e.target.value)} className="input min-h-[60px]" />
              </div>
              <div className="form-group">
                <label className="label">Reasoning</label>
                <textarea value={form.decision_point_2_reasoning || ''} onChange={(e) => updateField('decision_point_2_reasoning', e.target.value)} className="input min-h-[60px]" />
              </div>
            </div>
          </div>
        </div>

        {/* Quality & Standards */}
        <div className="card">
          <h2 className="section-title">Section 4: Quality & Standards</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">How does employee verify work is complete?</label>
              <textarea value={form.verify_work_complete || ''} onChange={(e) => updateField('verify_work_complete', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">What does "90% vs. 100% complete" look like?</label>
              <textarea value={form.ninety_vs_hundred || ''} onChange={(e) => updateField('ninety_vs_hundred', e.target.value)} className="input min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Communication & Coordination */}
        <div className="card">
          <h2 className="section-title">Section 5: Communication & Coordination</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Work handed off?</label>
              <textarea value={form.work_handed_off || ''} onChange={(e) => updateField('work_handed_off', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">How was status communicated?</label>
              <textarea value={form.status_communicated || ''} onChange={(e) => updateField('status_communicated', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">Documentation used?</label>
              <textarea value={form.documentation_used || ''} onChange={(e) => updateField('documentation_used', e.target.value)} className="input min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Tools & Equipment */}
        <div className="card">
          <h2 className="section-title">Section 6: Tools & Equipment</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Setup time</label>
              <input type="text" value={form.setup_time || ''} onChange={(e) => updateField('setup_time', e.target.value)} className="input" />
            </div>
            <div className="form-group">
              <label className="label">Issues during setup?</label>
              <textarea value={form.setup_issues || ''} onChange={(e) => updateField('setup_issues', e.target.value)} className="input min-h-[60px]" />
            </div>
            <div className="form-group">
              <label className="label">Could setup be optimized?</label>
              <textarea value={form.setup_optimization || ''} onChange={(e) => updateField('setup_optimization', e.target.value)} className="input min-h-[60px]" />
            </div>
          </div>
        </div>

        {/* Problem-Solving */}
        <div className="card">
          <h2 className="section-title">Section 7: Problem-Solving Observed</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">What went wrong</label>
              <textarea value={form.problem_what_went_wrong || ''} onChange={(e) => updateField('problem_what_went_wrong', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">How diagnosed</label>
              <textarea value={form.problem_how_diagnosed || ''} onChange={(e) => updateField('problem_how_diagnosed', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">Solution attempted</label>
              <textarea value={form.problem_solution_attempted || ''} onChange={(e) => updateField('problem_solution_attempted', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">Outcome</label>
              <textarea value={form.problem_outcome || ''} onChange={(e) => updateField('problem_outcome', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">Time to resolve</label>
              <input type="text" value={form.problem_time_to_resolve || ''} onChange={(e) => updateField('problem_time_to_resolve', e.target.value)} className="input" />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <h2 className="section-title">Observer Summary</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Key observations</label>
              <textarea value={form.key_observations || ''} onChange={(e) => updateField('key_observations', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">Undocumented knowledge captured</label>
              <textarea value={form.undocumented_knowledge || ''} onChange={(e) => updateField('undocumented_knowledge', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">SOP recommendations</label>
              <textarea value={form.sop_recommendations || ''} onChange={(e) => updateField('sop_recommendations', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">Efficiency improvements</label>
              <textarea value={form.efficiency_improvements || ''} onChange={(e) => updateField('efficiency_improvements', e.target.value)} className="input min-h-[100px]" />
            </div>
          </div>
        </div>

        {/* Delete */}
        <div className="card border-red-200">
          <button onClick={handleDelete} className="btn btn-danger">
            Delete Observation
          </button>
        </div>
      </div>
    </Layout>
  );
}
