import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { SaveIndicator } from '../components/SaveIndicator';
import { useAutoSave } from '../hooks/useAutoSave';
import { questionnaires, sops } from '../api/client';
import { Questionnaire, SOP } from '../types';

export function QuestionnaireForm() {
  const { id, sopId } = useParams<{ id?: string; sopId?: string }>();
  const navigate = useNavigate();
  const [form, setForm] = useState<Questionnaire | null>(null);
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const data = await questionnaires.get(parseInt(id));
          setForm(data);
          if (data.sop_id) {
            const sopData = await sops.get(data.sop_id);
            setSop(sopData);
          }
        } else if (sopId) {
          const sopData = await sops.get(parseInt(sopId));
          setSop(sopData);
          const newForm = await questionnaires.create(parseInt(sopId));
          setForm(newForm);
          navigate(`/questionnaire/${newForm.id}`, { replace: true });
        }
      } catch (err) {
        setError('Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, sopId, navigate]);

  const handleSave = useCallback(async (data: Partial<Questionnaire>) => {
    if (!form?.id) return;
    await questionnaires.update(form.id, data);
  }, [form?.id]);

  const { saving, lastSaved, error: saveError } = useAutoSave({
    data: form || {},
    onSave: handleSave,
    enabled: !!form,
  });

  const updateField = (field: keyof Questionnaire, value: string) => {
    if (!form) return;
    setForm({ ...form, [field]: value });
  };

  const handleDelete = async () => {
    if (!form?.id || !confirm('Delete this questionnaire?')) return;
    await questionnaires.delete(form.id);
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
            <h1 className="text-2xl font-bold text-esi-blue">Employee Questionnaire</h1>
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
          <h2 className="section-title">Interview Information</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="label">Employee Name</label>
              <input
                type="text"
                value={form.employee_name || ''}
                onChange={(e) => updateField('employee_name', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Department</label>
              <input
                type="text"
                value={form.department || ''}
                onChange={(e) => updateField('department', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Position</label>
              <input
                type="text"
                value={form.position || ''}
                onChange={(e) => updateField('position', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Interviewer</label>
              <input
                type="text"
                value={form.interviewer || ''}
                onChange={(e) => updateField('interviewer', e.target.value)}
                className="input"
              />
            </div>
            <div className="form-group">
              <label className="label">Date</label>
              <input
                type="date"
                value={form.interview_date || ''}
                onChange={(e) => updateField('interview_date', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Section 1: Daily Operations */}
        <div className="card">
          <h2 className="section-title">Section 1: Daily Operations</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">1. What are your primary responsibilities in a typical day?</label>
              <textarea value={form.q1_primary_responsibilities || ''} onChange={(e) => updateField('q1_primary_responsibilities', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">2. What time do you typically start these tasks?</label>
              <textarea value={form.q2_start_time || ''} onChange={(e) => updateField('q2_start_time', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">3. What tasks MUST be completed daily (non-negotiable)?</label>
              <textarea value={form.q3_must_complete_daily || ''} onChange={(e) => updateField('q3_must_complete_daily', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">4. What tasks are "when time allows" (lower priority)?</label>
              <textarea value={form.q4_lower_priority || ''} onChange={(e) => updateField('q4_lower_priority', e.target.value)} className="input min-h-[100px]" />
            </div>
          </div>
        </div>

        {/* Section 2: Process Knowledge */}
        <div className="card">
          <h2 className="section-title">Section 2: Process Knowledge</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">5. Walk me through your most common process from start to finish:</label>
              <textarea value={form.q5_common_process || ''} onChange={(e) => updateField('q5_common_process', e.target.value)} className="input min-h-[120px]" />
            </div>
            <div className="form-group">
              <label className="label">6. What tools/equipment do you use for this process?</label>
              <textarea value={form.q6_tools_equipment || ''} onChange={(e) => updateField('q6_tools_equipment', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">7. What materials do you need?</label>
              <textarea value={form.q7_materials || ''} onChange={(e) => updateField('q7_materials', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">8. How do you know when this process is complete?</label>
              <textarea value={form.q8_process_complete || ''} onChange={(e) => updateField('q8_process_complete', e.target.value)} className="input min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Section 3: Quality & Standards */}
        <div className="card">
          <h2 className="section-title">Section 3: Quality & Standards</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">9. What does "done correctly" look like?</label>
              <textarea value={form.q9_done_correctly || ''} onChange={(e) => updateField('q9_done_correctly', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">10. What are the most common mistakes?</label>
              <textarea value={form.q10_common_mistakes || ''} onChange={(e) => updateField('q10_common_mistakes', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">11. How do you catch/prevent these mistakes?</label>
              <textarea value={form.q11_prevent_mistakes || ''} onChange={(e) => updateField('q11_prevent_mistakes', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">12. What quality checks do you perform?</label>
              <textarea value={form.q12_quality_checks || ''} onChange={(e) => updateField('q12_quality_checks', e.target.value)} className="input min-h-[100px]" />
            </div>
          </div>
        </div>

        {/* Section 4: Problem-Solving */}
        <div className="card">
          <h2 className="section-title">Section 4: Problem-Solving</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">13. What problems come up regularly?</label>
              <textarea value={form.q13_regular_problems || ''} onChange={(e) => updateField('q13_regular_problems', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">14. How do you solve them?</label>
              <textarea value={form.q14_solve_problems || ''} onChange={(e) => updateField('q14_solve_problems', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">15. When do you escalate vs. solve yourself?</label>
              <textarea value={form.q15_escalate_vs_solve || ''} onChange={(e) => updateField('q15_escalate_vs_solve', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">16. Most challenging problem solved recently?</label>
              <textarea value={form.q16_challenging_problem || ''} onChange={(e) => updateField('q16_challenging_problem', e.target.value)} className="input min-h-[100px]" />
            </div>
          </div>
        </div>

        {/* Section 5: Communication & Handoffs */}
        <div className="card">
          <h2 className="section-title">Section 5: Communication & Handoffs</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">17. Who do you interact with regularly?</label>
              <textarea value={form.q17_interact_with || ''} onChange={(e) => updateField('q17_interact_with', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">18. What information do you need FROM others?</label>
              <textarea value={form.q18_info_from_others || ''} onChange={(e) => updateField('q18_info_from_others', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">19. What information do you provide TO others?</label>
              <textarea value={form.q19_info_to_others || ''} onChange={(e) => updateField('q19_info_to_others', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">20. How do you hand off work?</label>
              <textarea value={form.q20_handoff_work || ''} onChange={(e) => updateField('q20_handoff_work', e.target.value)} className="input min-h-[80px]" />
            </div>
          </div>
        </div>

        {/* Section 6: Field Knowledge */}
        <div className="card">
          <h2 className="section-title">Section 6: Field Knowledge (Tribal Knowledge)</h2>
          <div className="info-box mb-4">
            <strong>Important:</strong> This section captures knowledge that isn't written down anywhere else.
          </div>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">21. What do you know that ISN'T written down?</label>
              <textarea value={form.q21_not_written_down || ''} onChange={(e) => updateField('q21_not_written_down', e.target.value)} className="input min-h-[120px]" />
            </div>
            <div className="form-group">
              <label className="label">22. What would a new person struggle with most?</label>
              <textarea value={form.q22_new_person_struggle || ''} onChange={(e) => updateField('q22_new_person_struggle', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">23. What took you longest to learn?</label>
              <textarea value={form.q23_longest_to_learn || ''} onChange={(e) => updateField('q23_longest_to_learn', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">24. If training someone tomorrow, what would you tell them first?</label>
              <textarea value={form.q24_training_advice || ''} onChange={(e) => updateField('q24_training_advice', e.target.value)} className="input min-h-[120px]" />
            </div>
          </div>
        </div>

        {/* Section 7: Improvement Ideas */}
        <div className="card">
          <h2 className="section-title">Section 7: Improvement Ideas</h2>
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">25. If you could change ONE thing about this process?</label>
              <textarea value={form.q25_change_one_thing || ''} onChange={(e) => updateField('q25_change_one_thing', e.target.value)} className="input min-h-[100px]" />
            </div>
            <div className="form-group">
              <label className="label">26. What tools/equipment would make your job easier?</label>
              <textarea value={form.q26_better_tools || ''} onChange={(e) => updateField('q26_better_tools', e.target.value)} className="input min-h-[80px]" />
            </div>
            <div className="form-group">
              <label className="label">27. What wastes your time that shouldn't?</label>
              <textarea value={form.q27_time_wasters || ''} onChange={(e) => updateField('q27_time_wasters', e.target.value)} className="input min-h-[100px]" />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <h2 className="section-title">Additional Notes</h2>
          <div className="form-group">
            <label className="label">Additional insights, observations, or context:</label>
            <textarea value={form.notes || ''} onChange={(e) => updateField('notes', e.target.value)} className="input min-h-[150px]" />
          </div>
        </div>

        {/* Delete */}
        <div className="card border-red-200">
          <button onClick={handleDelete} className="btn btn-danger">
            Delete Questionnaire
          </button>
        </div>
      </div>
    </Layout>
  );
}
