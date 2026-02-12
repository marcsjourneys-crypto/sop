import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { StatusBadge } from '../components/StatusBadge';
import { SaveIndicator } from '../components/SaveIndicator';
import { StepProgress } from '../components/StepProgress';
import { useAutoSave } from '../hooks/useAutoSave';
import { sops } from '../api/client';
import type { SOP, SOPStep } from '../types';

const WIZARD_STEPS = [
  { id: 1, name: 'Basic Information', shortName: 'Basics' },
  { id: 2, name: 'Purpose & Scope', shortName: 'Scope' },
  { id: 3, name: 'Responsibilities', shortName: 'Roles' },
  { id: 4, name: 'Materials & Time', shortName: 'Materials' },
  { id: 5, name: 'Procedure Steps', shortName: 'Steps' },
  { id: 6, name: 'Quality Checkpoints', shortName: 'Quality' },
  { id: 7, name: 'Safety & Documentation', shortName: 'Safety' },
  { id: 8, name: 'Review & Links', shortName: 'Review' },
];

export function SOPDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sop, setSop] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);

  const loadSop = useCallback(async () => {
    if (!id) return;
    try {
      const data = await sops.get(parseInt(id));
      setSop(data);
    } catch (err) {
      setError('Failed to load SOP');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSop();
  }, [loadSop]);

  const handleSave = useCallback(async (data: Partial<SOP>) => {
    if (!id) return;
    await sops.update(parseInt(id), data);
  }, [id]);

  const { saving, lastSaved, error: saveError } = useAutoSave({
    data: sop ? {
      department: sop.department,
      process_name: sop.process_name,
      status: sop.status,
      purpose: sop.purpose,
      scope_applies_to: sop.scope_applies_to,
      scope_not_applies_to: sop.scope_not_applies_to,
      tools: sop.tools,
      materials: sop.materials,
      time_total: sop.time_total,
      time_searching: sop.time_searching,
      time_changing: sop.time_changing,
      time_changeover: sop.time_changeover,
      quality_during: sop.quality_during,
      quality_final: sop.quality_final,
      quality_completion_criteria: sop.quality_completion_criteria,
      documentation_required: sop.documentation_required,
      documentation_signoff: sop.documentation_signoff,
      safety_concerns: sop.safety_concerns,
    } : {},
    onSave: handleSave,
    enabled: !!sop,
  });

  const updateField = (field: keyof SOP, value: string) => {
    if (!sop) return;
    setSop({ ...sop, [field]: value });
  };

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'review') => {
    if (!sop || !id) return;
    try {
      const updated = await sops.update(parseInt(id), { ...sop, status: newStatus });
      setSop({ ...sop, ...updated });
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const handleAddStep = async () => {
    if (!id) return;
    try {
      const step = await sops.addStep(parseInt(id));
      setSop((prev) => prev ? { ...prev, steps: [...(prev.steps || []), step] } : prev);
    } catch (err) {
      setError('Failed to add step');
    }
  };

  const handleUpdateStep = async (stepId: number, field: keyof SOPStep, value: string) => {
    if (!sop || !id) return;
    const step = sop.steps?.find((s) => s.id === stepId);
    if (!step) return;

    const updatedStep = { ...step, [field]: value };
    setSop((prev) => prev ? {
      ...prev,
      steps: prev.steps?.map((s) => s.id === stepId ? updatedStep : s)
    } : prev);

    try {
      await sops.updateStep(parseInt(id), stepId, { [field]: value });
    } catch (err) {
      console.error('Failed to save step');
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (!id || !confirm('Delete this step?')) return;
    try {
      await sops.deleteStep(parseInt(id), stepId);
      setSop((prev) => prev ? {
        ...prev,
        steps: prev.steps?.filter((s) => s.id !== stepId).map((s, i) => ({ ...s, step_number: i + 1 }))
      } : prev);
    } catch (err) {
      setError('Failed to delete step');
    }
  };

  const handleAddResponsibility = async () => {
    if (!id) return;
    try {
      const resp = await sops.addResponsibility(parseInt(id), {});
      setSop((prev) => prev ? { ...prev, responsibilities: [...(prev.responsibilities || []), resp] } : prev);
    } catch (err) {
      setError('Failed to add responsibility');
    }
  };

  const handleDeleteResponsibility = async (respId: number) => {
    if (!id) return;
    try {
      await sops.deleteResponsibility(parseInt(id), respId);
      setSop((prev) => prev ? {
        ...prev,
        responsibilities: prev.responsibilities?.filter((r) => r.id !== respId)
      } : prev);
    } catch (err) {
      setError('Failed to delete responsibility');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this SOP? This cannot be undone.')) return;
    try {
      await sops.delete(parseInt(id));
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to delete SOP');
    }
  };

  const goToNextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Render functions for each wizard step
  const renderBasicsStep = () => (
    <div className="card">
      <h2 className="section-title">Basic Information</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Process Name *</label>
          <input
            type="text"
            value={sop?.process_name || ''}
            onChange={(e) => updateField('process_name', e.target.value)}
            className="input"
            placeholder="e.g., Steel Cutting Procedure"
          />
        </div>
        <div className="form-group">
          <label className="label">Department</label>
          <input
            type="text"
            value={sop?.department || ''}
            onChange={(e) => updateField('department', e.target.value)}
            className="input"
            placeholder="e.g., Fabrication"
          />
        </div>
      </div>
    </div>
  );

  const renderScopeStep = () => (
    <div className="card">
      <h2 className="section-title">Purpose & Scope</h2>
      <div className="form-group">
        <label className="label">Purpose - Why does this process exist?</label>
        <textarea
          value={sop?.purpose || ''}
          onChange={(e) => updateField('purpose', e.target.value)}
          className="input min-h-[120px]"
          placeholder="Describe the purpose of this procedure..."
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label className="label">Applies To</label>
          <textarea
            value={sop?.scope_applies_to || ''}
            onChange={(e) => updateField('scope_applies_to', e.target.value)}
            className="input min-h-[100px]"
            placeholder="Who/what does this apply to?"
          />
        </div>
        <div className="form-group">
          <label className="label">Does NOT Apply To</label>
          <textarea
            value={sop?.scope_not_applies_to || ''}
            onChange={(e) => updateField('scope_not_applies_to', e.target.value)}
            className="input min-h-[100px]"
            placeholder="Exceptions or exclusions..."
          />
        </div>
      </div>
    </div>
  );

  const renderResponsibilitiesStep = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">Responsibilities</h2>
        <button onClick={handleAddResponsibility} className="btn btn-secondary text-sm">
          + Add Responsibility
        </button>
      </div>
      {(!sop?.responsibilities || sop.responsibilities.length === 0) && (
        <p className="text-gray-500 text-center py-8">No responsibilities added yet. Click "Add Responsibility" to start.</p>
      )}
      {sop?.responsibilities?.map((resp) => (
        <div key={resp.id} className="grid sm:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="form-group mb-0">
            <label className="label">Role</label>
            <input
              type="text"
              value={resp.role_name || ''}
              onChange={async (e) => {
                const updated = { ...resp, role_name: e.target.value };
                setSop((prev) => prev ? {
                  ...prev,
                  responsibilities: prev.responsibilities?.map((r) => r.id === resp.id ? updated : r)
                } : prev);
                await sops.updateResponsibility(parseInt(id!), resp.id, { role_name: e.target.value });
              }}
              className="input"
              placeholder="e.g., Supervisor"
            />
          </div>
          <div className="form-group mb-0">
            <label className="label">Responsibility</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={resp.responsibility_description || ''}
                onChange={async (e) => {
                  const updated = { ...resp, responsibility_description: e.target.value };
                  setSop((prev) => prev ? {
                    ...prev,
                    responsibilities: prev.responsibilities?.map((r) => r.id === resp.id ? updated : r)
                  } : prev);
                  await sops.updateResponsibility(parseInt(id!), resp.id, { responsibility_description: e.target.value });
                }}
                className="input"
                placeholder="What they're responsible for..."
              />
              <button
                onClick={() => handleDeleteResponsibility(resp.id)}
                className="text-red-600 hover:text-red-800 px-2"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMaterialsStep = () => (
    <div className="card">
      <h2 className="section-title">Required Materials & Equipment</h2>
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="form-group">
          <label className="label">Tools</label>
          <textarea
            value={sop?.tools || ''}
            onChange={(e) => updateField('tools', e.target.value)}
            className="input min-h-[100px]"
            placeholder="List required tools..."
          />
        </div>
        <div className="form-group">
          <label className="label">Materials</label>
          <textarea
            value={sop?.materials || ''}
            onChange={(e) => updateField('materials', e.target.value)}
            className="input min-h-[100px]"
            placeholder="List required materials..."
          />
        </div>
      </div>

      <h3 className="font-bold text-gray-700 mb-4">Time & Efficiency Data</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="form-group">
          <label className="label">Total Process Time</label>
          <input
            type="text"
            value={sop?.time_total || ''}
            onChange={(e) => updateField('time_total', e.target.value)}
            className="input"
            placeholder="e.g., 45 min"
          />
        </div>
        <div className="form-group">
          <label className="label">Time Searching Tools</label>
          <input
            type="text"
            value={sop?.time_searching || ''}
            onChange={(e) => updateField('time_searching', e.target.value)}
            className="input"
            placeholder="e.g., 5 min"
          />
        </div>
        <div className="form-group">
          <label className="label">Time Changing Tools</label>
          <input
            type="text"
            value={sop?.time_changing || ''}
            onChange={(e) => updateField('time_changing', e.target.value)}
            className="input"
            placeholder="e.g., 3 min"
          />
        </div>
        <div className="form-group">
          <label className="label">Changeover Time</label>
          <input
            type="text"
            value={sop?.time_changeover || ''}
            onChange={(e) => updateField('time_changeover', e.target.value)}
            className="input"
            placeholder="e.g., 10 min"
          />
        </div>
      </div>
    </div>
  );

  const renderStepsStep = () => (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title mb-0">Procedure - Step by Step</h2>
        <button onClick={handleAddStep} className="btn btn-primary">
          + Add Step
        </button>
      </div>

      {(!sop?.steps || sop.steps.length === 0) && (
        <p className="text-gray-500 text-center py-8">No steps added yet. Click "Add Step" to start building the procedure.</p>
      )}

      {sop?.steps?.map((step, index) => (
        <div key={step.id} className="border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-esi-blue">Step {index + 1}</h3>
            {(sop.steps?.length || 0) > 1 && (
              <button
                onClick={() => handleDeleteStep(step.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Remove Step
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Action Name</label>
              <input
                type="text"
                value={step.action_name || ''}
                onChange={(e) => handleUpdateStep(step.id, 'action_name', e.target.value)}
                className="input"
                placeholder="e.g., Prepare Materials"
              />
            </div>
            <div className="form-group">
              <label className="label">Who (Role)</label>
              <input
                type="text"
                value={step.who_role || ''}
                onChange={(e) => handleUpdateStep(step.id, 'who_role', e.target.value)}
                className="input"
                placeholder="e.g., Operator"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Action (Detailed Instructions)</label>
            <textarea
              value={step.action || ''}
              onChange={(e) => handleUpdateStep(step.id, 'action', e.target.value)}
              className="input min-h-[80px]"
              placeholder="Describe the action in detail..."
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="label">Tools Used</label>
              <input
                type="text"
                value={step.tools_used || ''}
                onChange={(e) => handleUpdateStep(step.id, 'tools_used', e.target.value)}
                className="input"
                placeholder="Tools needed for this step"
              />
            </div>
            <div className="form-group">
              <label className="label">Time for This Step</label>
              <input
                type="text"
                value={step.time_for_step || ''}
                onChange={(e) => handleUpdateStep(step.id, 'time_for_step', e.target.value)}
                className="input"
                placeholder="e.g., 10 min"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="label">Standard (What "done correctly" looks like)</label>
            <textarea
              value={step.standard || ''}
              onChange={(e) => handleUpdateStep(step.id, 'standard', e.target.value)}
              className="input min-h-[60px]"
              placeholder="Describe the expected outcome..."
            />
          </div>

          <div className="form-group">
            <label className="label">Common Mistakes</label>
            <textarea
              value={step.common_mistakes || ''}
              onChange={(e) => handleUpdateStep(step.id, 'common_mistakes', e.target.value)}
              className="input min-h-[60px]"
              placeholder="What mistakes to avoid..."
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderQualityStep = () => (
    <div className="card">
      <h2 className="section-title">Quality Checkpoints</h2>
      <div className="grid sm:grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="form-group">
          <label className="label">During Process</label>
          <textarea
            value={sop?.quality_during || ''}
            onChange={(e) => updateField('quality_during', e.target.value)}
            className="input min-h-[120px]"
            placeholder="Checks to perform during the process..."
          />
        </div>
        <div className="form-group">
          <label className="label">Final Inspection</label>
          <textarea
            value={sop?.quality_final || ''}
            onChange={(e) => updateField('quality_final', e.target.value)}
            className="input min-h-[120px]"
            placeholder="Final quality checks..."
          />
        </div>
        <div className="form-group">
          <label className="label">Completion Criteria (90% does not equal 100%)</label>
          <textarea
            value={sop?.quality_completion_criteria || ''}
            onChange={(e) => updateField('quality_completion_criteria', e.target.value)}
            className="input min-h-[120px]"
            placeholder="What defines complete?"
          />
        </div>
      </div>
    </div>
  );

  const renderSafetyStep = () => (
    <div className="space-y-6">
      <div className="card">
        <h2 className="section-title">Safety Concerns</h2>
        <div className="safety-box mb-4">
          <strong>Safety First:</strong> Document all hazards and required precautions.
        </div>
        <div className="form-group">
          <label className="label">Main Safety Hazards & Precautions</label>
          <textarea
            value={sop?.safety_concerns || ''}
            onChange={(e) => updateField('safety_concerns', e.target.value)}
            className="input min-h-[150px]"
            placeholder="List all safety hazards and required PPE/precautions..."
          />
        </div>
      </div>

      <div className="card">
        <h2 className="section-title">Documentation</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Required Records</label>
            <textarea
              value={sop?.documentation_required || ''}
              onChange={(e) => updateField('documentation_required', e.target.value)}
              className="input min-h-[100px]"
              placeholder="What needs to be documented..."
            />
          </div>
          <div className="form-group">
            <label className="label">Sign-off Required</label>
            <textarea
              value={sop?.documentation_signoff || ''}
              onChange={(e) => updateField('documentation_signoff', e.target.value)}
              className="input min-h-[100px]"
              placeholder="Who needs to sign off..."
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="card">
        <h2 className="section-title">SOP Summary</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Process Name</p>
            <p className="font-semibold">{sop?.process_name || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Department</p>
            <p className="font-semibold">{sop?.department || 'Not set'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Steps</p>
            <p className="font-semibold">{sop?.steps?.length || 0} steps defined</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Responsibilities</p>
            <p className="font-semibold">{sop?.responsibilities?.length || 0} roles defined</p>
          </div>
        </div>
      </div>

      {/* Linked Documents */}
      <div className="card">
        <h2 className="section-title">Linked Documents</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Questionnaires ({sop?.questionnaires?.length || 0})</h3>
            {sop?.questionnaires?.length ? (
              <ul className="space-y-2">
                {sop.questionnaires.map((q) => (
                  <li key={q.id}>
                    <Link to={`/questionnaire/${q.id}`} className="text-esi-blue hover:underline">
                      {q.employee_name || 'Unnamed'} - {q.interview_date || 'No date'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No questionnaires linked</p>
            )}
            <Link
              to={`/sop/${id}/questionnaire/new`}
              className="btn btn-secondary text-sm mt-4 inline-block"
            >
              + Add Questionnaire
            </Link>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Shadowing Observations ({sop?.shadowings?.length || 0})</h3>
            {sop?.shadowings?.length ? (
              <ul className="space-y-2">
                {sop.shadowings.map((s) => (
                  <li key={s.id}>
                    <Link to={`/shadowing/${s.id}`} className="text-esi-blue hover:underline">
                      {s.employee_observed || 'Unnamed'} - {s.observation_date || 'No date'}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">No observations linked</p>
            )}
            <Link
              to={`/sop/${id}/shadowing/new`}
              className="btn btn-secondary text-sm mt-4 inline-block"
            >
              + Add Shadowing
            </Link>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-200">
        <h2 className="text-xl font-bold text-red-600 mb-4">Danger Zone</h2>
        <button onClick={handleDelete} className="btn btn-danger">
          Delete SOP
        </button>
      </div>
    </div>
  );

  // Render the current step content
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderBasicsStep();
      case 1: return renderScopeStep();
      case 2: return renderResponsibilitiesStep();
      case 3: return renderMaterialsStep();
      case 4: return renderStepsStep();
      case 5: return renderQualityStep();
      case 6: return renderSafetyStep();
      case 7: return renderReviewStep();
      default: return renderBasicsStep();
    }
  };

  if (loading) {
    return <Layout><div className="text-center py-12">Loading...</div></Layout>;
  }

  if (!sop) {
    return <Layout><div className="text-center py-12 text-red-600">{error || 'SOP not found'}</div></Layout>;
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-500 hover:text-gray-700">
              &larr; Back
            </Link>
            <h1 className="text-2xl font-bold font-mono text-esi-blue">{sop.sop_number}</h1>
            <StatusBadge status={sop.status} />
          </div>
          <div className="flex items-center gap-4">
            <SaveIndicator saving={saving} lastSaved={lastSaved} error={saveError} />
            <select
              value={sop.status}
              onChange={(e) => handleStatusChange(e.target.value as 'draft' | 'active' | 'review')}
              className="input w-auto"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mt-4">
            {error}
          </div>
        )}
      </div>

      {/* Step Progress Bar */}
      <StepProgress
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepClick={setCurrentStep}
      />

      {/* Wizard Content */}
      <div className="wizard-content">
        {renderCurrentStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-nav">
        <button
          onClick={goToPrevStep}
          disabled={currentStep === 0}
          className="btn btn-secondary"
        >
          &larr; Previous
        </button>
        <span className="text-sm text-gray-500">
          Step {currentStep + 1} of {WIZARD_STEPS.length}
        </span>
        <button
          onClick={goToNextStep}
          disabled={currentStep === WIZARD_STEPS.length - 1}
          className="btn btn-primary"
        >
          Next &rarr;
        </button>
      </div>
    </Layout>
  );
}
