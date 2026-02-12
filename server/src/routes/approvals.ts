import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Admin-only middleware
function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(adminOnly);

interface ApprovalRow {
  id: number;
  sop_id: number;
  requested_by: number;
  requested_at: string;
  status: string;
  sop_number: string;
  process_name: string | null;
  department: string | null;
  version: number;
  requested_by_name: string;
}

interface VersionRow {
  id: number;
  version_number: number;
  snapshot: string;
  change_summary: string | null;
}

// GET /api/approvals/count - Get pending approval count (for nav badge)
// Note: This route must be defined before /:id to avoid matching "count" as an id
router.get('/count', (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sop_approvals WHERE status = 'pending'
  `).get() as { count: number };

  res.json({ count: result.count });
});

// GET /api/approvals - List all pending approvals
router.get('/', (req: AuthRequest, res: Response) => {
  const approvals = db.prepare(`
    SELECT
      a.id,
      a.sop_id,
      a.requested_by,
      a.requested_at,
      s.sop_number,
      s.process_name,
      s.department,
      s.version,
      u.name as requested_by_name
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    JOIN users u ON a.requested_by = u.id
    WHERE a.status = 'pending'
    ORDER BY a.requested_at DESC
  `).all() as ApprovalRow[];

  // Get change counts for each approval
  const result = approvals.map(approval => {
    const changes = computeChanges(approval.sop_id, approval.version);
    const latestVersion = db.prepare(`
      SELECT change_summary FROM sop_versions
      WHERE sop_id = ? AND version_number = ?
    `).get(approval.sop_id, approval.version) as { change_summary: string | null } | undefined;

    return {
      id: approval.id,
      sop_id: approval.sop_id,
      sop_number: approval.sop_number,
      process_name: approval.process_name,
      department: approval.department,
      requested_by: { id: approval.requested_by, name: approval.requested_by_name },
      requested_at: approval.requested_at,
      change_count: changes.length,
      change_summary: latestVersion?.change_summary || null,
      version: approval.version
    };
  });

  res.json({ approvals: result });
});

// GET /api/approvals/:id - Get single approval with SOP details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const approval = db.prepare(`
    SELECT
      a.id,
      a.sop_id,
      a.requested_by,
      a.requested_at,
      s.sop_number,
      s.process_name,
      s.department,
      s.version,
      u.name as requested_by_name
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    JOIN users u ON a.requested_by = u.id
    WHERE a.id = ? AND a.status = 'pending'
  `).get(id) as ApprovalRow | undefined;

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const changes = computeChanges(approval.sop_id, approval.version);
  const latestVersion = db.prepare(`
    SELECT change_summary FROM sop_versions
    WHERE sop_id = ? AND version_number = ?
  `).get(approval.sop_id, approval.version) as { change_summary: string | null } | undefined;

  res.json({
    id: approval.id,
    sop_id: approval.sop_id,
    sop_number: approval.sop_number,
    process_name: approval.process_name,
    department: approval.department,
    requested_by: { id: approval.requested_by, name: approval.requested_by_name },
    requested_at: approval.requested_at,
    change_count: changes.length,
    change_summary: latestVersion?.change_summary || null,
    version: approval.version,
    changes
  });
});

// GET /api/approvals/:id/changes - Get structured diff
router.get('/:id/changes', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const approval = db.prepare(`
    SELECT a.sop_id, s.version
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    WHERE a.id = ?
  `).get(id) as { sop_id: number; version: number } | undefined;

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const changes = computeChanges(approval.sop_id, approval.version);

  res.json({
    approval_id: parseInt(id),
    sop_id: approval.sop_id,
    version: approval.version,
    previous_version: approval.version - 1,
    changes
  });
});

interface ChangeItem {
  type: 'added' | 'modified' | 'removed' | 'reordered';
  category: 'metadata' | 'step' | 'responsibility';
  field: string;
  label: string;
  before?: string;
  after?: string;
}

function computeChanges(sopId: number, currentVersion: number): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // Get current and previous version snapshots
  const versions = db.prepare(`
    SELECT version_number, snapshot FROM sop_versions
    WHERE sop_id = ? AND version_number IN (?, ?)
    ORDER BY version_number
  `).all(sopId, currentVersion - 1, currentVersion) as VersionRow[];

  if (versions.length < 2) {
    // No previous version to compare - first submission
    return [{ type: 'added', category: 'metadata', field: 'all', label: 'Initial submission' }];
  }

  const prevSnapshot = JSON.parse(versions[0].snapshot);
  const currSnapshot = JSON.parse(versions[1].snapshot);

  // Compare SOP metadata fields
  const metadataFields = [
    { field: 'purpose', label: 'Purpose' },
    { field: 'scope_applies_to', label: 'Scope (Applies To)' },
    { field: 'scope_not_applies_to', label: 'Scope (Does Not Apply To)' },
    { field: 'tools', label: 'Tools' },
    { field: 'materials', label: 'Materials' },
    { field: 'safety_concerns', label: 'Safety Concerns' },
    { field: 'time_total', label: 'Total Time' },
    { field: 'time_searching', label: 'Searching Time' },
    { field: 'time_changing', label: 'Changing Time' },
    { field: 'time_changeover', label: 'Changeover Time' },
    { field: 'quality_during', label: 'Quality During' },
    { field: 'quality_final', label: 'Quality Final' },
    { field: 'quality_completion_criteria', label: 'Completion Criteria' },
    { field: 'documentation_required', label: 'Documentation Required' },
    { field: 'documentation_signoff', label: 'Documentation Signoff' },
    { field: 'related_documents', label: 'Related Documents' },
  ];

  for (const { field, label } of metadataFields) {
    const prev = prevSnapshot.sop[field] || '';
    const curr = currSnapshot.sop[field] || '';
    if (prev !== curr) {
      changes.push({
        type: 'modified',
        category: 'metadata',
        field,
        label: `${label}: Updated`,
        before: prev || '(empty)',
        after: curr || '(empty)'
      });
    }
  }

  // Compare steps
  const prevSteps = prevSnapshot.steps || [];
  const currSteps = currSnapshot.steps || [];

  const prevStepMap = new Map(prevSteps.map((s: any) => [s.id, s]));
  const currStepMap = new Map(currSteps.map((s: any) => [s.id, s]));

  // Check for added/removed steps
  for (const step of currSteps) {
    if (!prevStepMap.has(step.id)) {
      changes.push({
        type: 'added',
        category: 'step',
        field: `step_${step.step_number}`,
        label: `Step ${step.step_number}: Added`,
        after: step.action_name || step.action || '(new step)'
      });
    }
  }

  for (const step of prevSteps) {
    if (!currStepMap.has(step.id)) {
      changes.push({
        type: 'removed',
        category: 'step',
        field: `step_${step.step_number}`,
        label: `Step ${step.step_number}: Removed`,
        before: step.action_name || step.action || '(step)'
      });
    }
  }

  // Check for modified steps
  for (const currStep of currSteps) {
    const prevStep = prevStepMap.get(currStep.id) as Record<string, any> | undefined;
    if (prevStep) {
      const stepFields = ['action_name', 'action', 'who_role', 'tools_used', 'time_for_step', 'standard', 'common_mistakes'];
      for (const field of stepFields) {
        const prev = prevStep[field] || '';
        const curr = (currStep as Record<string, any>)[field] || '';
        if (prev !== curr) {
          const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          changes.push({
            type: 'modified',
            category: 'step',
            field: `step_${currStep.step_number}_${field}`,
            label: `Step ${currStep.step_number}: ${fieldLabel} updated`,
            before: prev || '(empty)',
            after: curr || '(empty)'
          });
        }
      }
    }
  }

  // Compare responsibilities
  const prevResps = prevSnapshot.responsibilities || [];
  const currResps = currSnapshot.responsibilities || [];

  const prevRespMap = new Map(prevResps.map((r: any) => [r.id, r]));
  const currRespMap = new Map(currResps.map((r: any) => [r.id, r]));

  for (const resp of currResps) {
    if (!prevRespMap.has(resp.id)) {
      changes.push({
        type: 'added',
        category: 'responsibility',
        field: `resp_${resp.id}`,
        label: `Responsibility: ${resp.role_name || 'New role'} added`,
        after: resp.responsibility_description || ''
      });
    }
  }

  for (const resp of prevResps) {
    if (!currRespMap.has(resp.id)) {
      changes.push({
        type: 'removed',
        category: 'responsibility',
        field: `resp_${resp.id}`,
        label: `Responsibility: ${resp.role_name || 'Role'} removed`,
        before: resp.responsibility_description || ''
      });
    }
  }

  for (const currResp of currResps) {
    const prevResp = prevRespMap.get(currResp.id) as { role_name?: string; responsibility_description?: string } | undefined;
    if (prevResp) {
      if (prevResp.role_name !== currResp.role_name || prevResp.responsibility_description !== currResp.responsibility_description) {
        changes.push({
          type: 'modified',
          category: 'responsibility',
          field: `resp_${currResp.id}`,
          label: `Responsibility: ${currResp.role_name || 'Role'} modified`,
          before: `${prevResp.role_name}: ${prevResp.responsibility_description}`,
          after: `${currResp.role_name}: ${currResp.responsibility_description}`
        });
      }
    }
  }

  return changes;
}

export default router;
