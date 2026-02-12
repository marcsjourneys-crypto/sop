import { Router, Response } from 'express';
import { db, generateSopNumber } from '../db/schema.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

interface SopRow {
  id: number;
  sop_number: string;
  department: string | null;
  process_name: string | null;
  status: 'draft' | 'active' | 'review' | 'pending_approval';
  version: number;
  purpose: string | null;
  scope_applies_to: string | null;
  scope_not_applies_to: string | null;
  tools: string | null;
  materials: string | null;
  time_total: string | null;
  time_searching: string | null;
  time_changing: string | null;
  time_changeover: string | null;
  quality_during: string | null;
  quality_final: string | null;
  quality_completion_criteria: string | null;
  documentation_required: string | null;
  documentation_signoff: string | null;
  safety_concerns: string | null;
  troubleshooting: string | null;
  related_documents: string | null;
  approved_by: number | null;
  review_due_date: string | null;
  assigned_to: number | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

// Get all SOPs with status check
router.get('/', (req: AuthRequest, res: Response) => {
  const reviewPeriod = db.prepare('SELECT value FROM settings WHERE key = ?').get('review_period_days') as { value: string } | undefined;
  const reviewDays = parseInt(reviewPeriod?.value || '90');

  // Update status to 'review' for SOPs past their review date
  db.prepare(`
    UPDATE sops
    SET status = 'review', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'active'
    AND review_due_date IS NOT NULL
    AND date(review_due_date) < date('now')
  `).run();

  const sops = db.prepare(`
    SELECT s.*,
      u.name as created_by_name,
      a.name as approved_by_name,
      asn.name as assigned_to_name,
      (SELECT COUNT(*) FROM questionnaires WHERE sop_id = s.id) as questionnaire_count,
      (SELECT COUNT(*) FROM shadowing_observations WHERE sop_id = s.id) as shadowing_count
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    LEFT JOIN users asn ON s.assigned_to = asn.id
    ORDER BY s.created_at DESC
  `).all();

  res.json(sops);
});

// Get single SOP with related data
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const sop = db.prepare(`
    SELECT s.*, u.name as created_by_name, a.name as approved_by_name, asn.name as assigned_to_name
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    LEFT JOIN users asn ON s.assigned_to = asn.id
    WHERE s.id = ?
  `).get(id) as SopRow | undefined;

  if (!sop) {
    return res.status(404).json({ error: 'SOP not found' });
  }

  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY sort_order').all(id);
  const responsibilities = db.prepare('SELECT * FROM sop_responsibilities WHERE sop_id = ?').all(id);
  const troubleshooting = db.prepare('SELECT * FROM sop_troubleshooting WHERE sop_id = ?').all(id);
  const revisions = db.prepare('SELECT * FROM sop_revisions WHERE sop_id = ? ORDER BY revision_date DESC').all(id);
  const questionnaires = db.prepare('SELECT id, employee_name, interview_date, created_at FROM questionnaires WHERE sop_id = ?').all(id);
  const shadowings = db.prepare('SELECT id, employee_observed, observation_date, created_at FROM shadowing_observations WHERE sop_id = ?').all(id);

  res.json({
    ...sop,
    steps,
    responsibilities,
    troubleshooting,
    revisions,
    questionnaires,
    shadowings
  });
});

// Create new SOP
router.post('/', (req: AuthRequest, res: Response) => {
  const sopNumber = generateSopNumber();

  const result = db.prepare(`
    INSERT INTO sops (sop_number, status, created_by)
    VALUES (?, 'draft', ?)
  `).run(sopNumber, req.user!.id);

  // Add one empty step
  db.prepare(`
    INSERT INTO sop_steps (sop_id, step_number, sort_order)
    VALUES (?, 1, 1)
  `).run(result.lastInsertRowid);

  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json(sop);
});

// Update SOP
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    department, process_name, status, purpose,
    scope_applies_to, scope_not_applies_to,
    tools, materials,
    time_total, time_searching, time_changing, time_changeover,
    quality_during, quality_final, quality_completion_criteria,
    documentation_required, documentation_signoff,
    safety_concerns, troubleshooting, related_documents,
    approved_by
  } = req.body;

  // If changing to active, set review_due_date
  let reviewDueDate = null;
  if (status === 'active') {
    const reviewPeriod = db.prepare('SELECT value FROM settings WHERE key = ?').get('review_period_days') as { value: string } | undefined;
    const reviewDays = parseInt(reviewPeriod?.value || '90');
    reviewDueDate = new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  db.prepare(`
    UPDATE sops SET
      department = ?,
      process_name = ?,
      status = ?,
      purpose = ?,
      scope_applies_to = ?,
      scope_not_applies_to = ?,
      tools = ?,
      materials = ?,
      time_total = ?,
      time_searching = ?,
      time_changing = ?,
      time_changeover = ?,
      quality_during = ?,
      quality_final = ?,
      quality_completion_criteria = ?,
      documentation_required = ?,
      documentation_signoff = ?,
      safety_concerns = ?,
      troubleshooting = ?,
      related_documents = ?,
      approved_by = ?,
      review_due_date = COALESCE(?, review_due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    department, process_name, status, purpose,
    scope_applies_to, scope_not_applies_to,
    tools, materials,
    time_total, time_searching, time_changing, time_changeover,
    quality_during, quality_final, quality_completion_criteria,
    documentation_required, documentation_signoff,
    safety_concerns, troubleshooting, related_documents,
    approved_by, reviewDueDate, id
  );

  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id);
  res.json(sop);
});

// Delete SOP
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM sops WHERE id = ?').run(id);
  res.json({ message: 'SOP deleted' });
});

// Update SOP status (for drag-and-drop)
router.patch('/:id/status', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id) as SopRow | undefined;
  if (!sop) {
    return res.status(404).json({ error: 'SOP not found' });
  }

  // Validate status transition
  const validStatuses = ['draft', 'review', 'pending_approval', 'active'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Enforce workflow rules
  const currentStatus = sop.status;

  // Cannot drag to pending_approval - must use submit-for-approval endpoint
  if (status === 'pending_approval') {
    return res.status(400).json({ error: 'Use submit-for-approval endpoint to change to pending_approval' });
  }

  // Cannot drag to active - must go through approval workflow
  if (status === 'active' && currentStatus !== 'pending_approval') {
    return res.status(400).json({ error: 'SOPs must be approved to become active' });
  }

  // Only admins can change from active to review
  if (currentStatus === 'active' && status === 'review') {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can move active SOPs to review' });
    }
  }

  // Cannot move from pending_approval via drag - must use approval workflow
  if (currentStatus === 'pending_approval') {
    return res.status(400).json({ error: 'SOPs pending approval must be approved or rejected through the approval workflow' });
  }

  // Update status
  db.prepare(`
    UPDATE sops SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(status, id);

  const updatedSop = db.prepare(`
    SELECT s.*, u.name as created_by_name, a.name as approved_by_name, asn.name as assigned_to_name
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    LEFT JOIN users asn ON s.assigned_to = asn.id
    WHERE s.id = ?
  `).get(id);

  res.json(updatedSop);
});

// Assign user to SOP (admin only)
router.put('/:id/assign', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { user_id } = req.body;

  // Only admins can assign users
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can assign users to SOPs' });
  }

  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id) as SopRow | undefined;
  if (!sop) {
    return res.status(404).json({ error: 'SOP not found' });
  }

  // Validate user exists if user_id is provided
  if (user_id !== null) {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
  }

  db.prepare(`
    UPDATE sops SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(user_id, id);

  const updatedSop = db.prepare(`
    SELECT s.*, u.name as created_by_name, a.name as approved_by_name, asn.name as assigned_to_name
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    LEFT JOIN users asn ON s.assigned_to = asn.id
    WHERE s.id = ?
  `).get(id);

  res.json(updatedSop);
});

// === SOP Steps ===

// Add step
router.post('/:id/steps', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM sop_steps WHERE sop_id = ?').get(id) as { max: number | null };
  const nextOrder = (maxOrder.max || 0) + 1;

  const result = db.prepare(`
    INSERT INTO sop_steps (sop_id, step_number, sort_order)
    VALUES (?, ?, ?)
  `).run(id, nextOrder, nextOrder);

  const step = db.prepare('SELECT * FROM sop_steps WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(step);
});

// Update step
router.put('/:id/steps/:stepId', (req: AuthRequest, res: Response) => {
  const { stepId } = req.params;
  const { action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes } = req.body;

  db.prepare(`
    UPDATE sop_steps SET
      action_name = ?,
      who_role = ?,
      action = ?,
      tools_used = ?,
      time_for_step = ?,
      standard = ?,
      common_mistakes = ?
    WHERE id = ?
  `).run(action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, stepId);

  const step = db.prepare('SELECT * FROM sop_steps WHERE id = ?').get(stepId);
  res.json(step);
});

// Delete step and renumber
router.delete('/:id/steps/:stepId', (req: AuthRequest, res: Response) => {
  const { id, stepId } = req.params;

  db.prepare('DELETE FROM sop_steps WHERE id = ?').run(stepId);

  // Renumber remaining steps
  const steps = db.prepare('SELECT id FROM sop_steps WHERE sop_id = ? ORDER BY sort_order').all(id) as { id: number }[];
  steps.forEach((step, index) => {
    db.prepare('UPDATE sop_steps SET step_number = ?, sort_order = ? WHERE id = ?').run(index + 1, index + 1, step.id);
  });

  res.json({ message: 'Step deleted' });
});

// === SOP Responsibilities ===

router.post('/:id/responsibilities', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { role_name, responsibility_description } = req.body;

  const result = db.prepare(`
    INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description)
    VALUES (?, ?, ?)
  `).run(id, role_name, responsibility_description);

  const responsibility = db.prepare('SELECT * FROM sop_responsibilities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(responsibility);
});

router.put('/:id/responsibilities/:respId', (req: AuthRequest, res: Response) => {
  const { respId } = req.params;
  const { role_name, responsibility_description } = req.body;

  db.prepare(`
    UPDATE sop_responsibilities SET role_name = ?, responsibility_description = ? WHERE id = ?
  `).run(role_name, responsibility_description, respId);

  const responsibility = db.prepare('SELECT * FROM sop_responsibilities WHERE id = ?').get(respId);
  res.json(responsibility);
});

router.delete('/:id/responsibilities/:respId', (req: AuthRequest, res: Response) => {
  const { respId } = req.params;
  db.prepare('DELETE FROM sop_responsibilities WHERE id = ?').run(respId);
  res.json({ message: 'Responsibility deleted' });
});

// === SOP Troubleshooting ===

router.post('/:id/troubleshooting', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { problem, possible_cause, solution } = req.body;

  const result = db.prepare(`
    INSERT INTO sop_troubleshooting (sop_id, problem, possible_cause, solution)
    VALUES (?, ?, ?, ?)
  `).run(id, problem, possible_cause, solution);

  const item = db.prepare('SELECT * FROM sop_troubleshooting WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(item);
});

router.delete('/:id/troubleshooting/:itemId', (req: AuthRequest, res: Response) => {
  const { itemId } = req.params;
  db.prepare('DELETE FROM sop_troubleshooting WHERE id = ?').run(itemId);
  res.json({ message: 'Item deleted' });
});

// === SOP Revisions ===

router.post('/:id/revisions', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { revision_date, description, revised_by } = req.body;

  const result = db.prepare(`
    INSERT INTO sop_revisions (sop_id, revision_date, description, revised_by)
    VALUES (?, ?, ?, ?)
  `).run(id, revision_date, description, revised_by);

  const revision = db.prepare('SELECT * FROM sop_revisions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(revision);
});

// === VERSION HISTORY ===

// Get all versions for an SOP
router.get('/:id/versions', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const versions = db.prepare(`
    SELECT v.*, u.name as created_by_name
    FROM sop_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.sop_id = ?
    ORDER BY v.version_number DESC
  `).all(id);

  res.json(versions);
});

// Create a new version (snapshot)
router.post('/:id/versions', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { change_summary } = req.body;

  // Get current SOP data
  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id) as SopRow | undefined;
  if (!sop) {
    return res.status(404).json({ error: 'SOP not found' });
  }

  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY sort_order').all(id);
  const responsibilities = db.prepare('SELECT * FROM sop_responsibilities WHERE sop_id = ?').all(id);

  // Create snapshot
  const snapshot = JSON.stringify({ sop, steps, responsibilities });

  // Get current version number
  const currentVersion = db.prepare('SELECT MAX(version_number) as max FROM sop_versions WHERE sop_id = ?').get(id) as { max: number | null };
  const nextVersion = (currentVersion.max || 0) + 1;

  // Save version
  const result = db.prepare(`
    INSERT INTO sop_versions (sop_id, version_number, snapshot, change_summary, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nextVersion, snapshot, change_summary || `Version ${nextVersion}`, req.user!.id);

  // Update SOP version number
  db.prepare('UPDATE sops SET version = ? WHERE id = ?').run(nextVersion, id);

  const version = db.prepare(`
    SELECT v.*, u.name as created_by_name
    FROM sop_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(version);
});

// Get a specific version
router.get('/:id/versions/:versionId', (req: AuthRequest, res: Response) => {
  const { versionId } = req.params;

  const version = db.prepare(`
    SELECT v.*, u.name as created_by_name
    FROM sop_versions v
    LEFT JOIN users u ON v.created_by = u.id
    WHERE v.id = ?
  `).get(versionId);

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  res.json(version);
});

// Restore a version
router.post('/:id/versions/:versionId/restore', (req: AuthRequest, res: Response) => {
  const { id, versionId } = req.params;

  const version = db.prepare('SELECT * FROM sop_versions WHERE id = ? AND sop_id = ?').get(versionId, id) as { snapshot: string; version_number: number } | undefined;

  if (!version) {
    return res.status(404).json({ error: 'Version not found' });
  }

  const { sop, steps, responsibilities } = JSON.parse(version.snapshot);

  // Update SOP fields (except id, sop_number, created_at)
  db.prepare(`
    UPDATE sops SET
      department = ?,
      process_name = ?,
      purpose = ?,
      scope_applies_to = ?,
      scope_not_applies_to = ?,
      tools = ?,
      materials = ?,
      time_total = ?,
      time_searching = ?,
      time_changing = ?,
      time_changeover = ?,
      quality_during = ?,
      quality_final = ?,
      quality_completion_criteria = ?,
      documentation_required = ?,
      documentation_signoff = ?,
      safety_concerns = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sop.department, sop.process_name, sop.purpose,
    sop.scope_applies_to, sop.scope_not_applies_to,
    sop.tools, sop.materials,
    sop.time_total, sop.time_searching, sop.time_changing, sop.time_changeover,
    sop.quality_during, sop.quality_final, sop.quality_completion_criteria,
    sop.documentation_required, sop.documentation_signoff,
    sop.safety_concerns, id
  );

  // Delete current steps and responsibilities
  db.prepare('DELETE FROM sop_steps WHERE sop_id = ?').run(id);
  db.prepare('DELETE FROM sop_responsibilities WHERE sop_id = ?').run(id);

  // Restore steps
  for (const step of steps) {
    db.prepare(`
      INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, step.step_number, step.action_name, step.who_role, step.action, step.tools_used, step.time_for_step, step.standard, step.common_mistakes, step.sort_order);
  }

  // Restore responsibilities
  for (const resp of responsibilities) {
    db.prepare(`
      INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description)
      VALUES (?, ?, ?)
    `).run(id, resp.role_name, resp.responsibility_description);
  }

  // Create a new version noting the restore
  const currentVersion = db.prepare('SELECT MAX(version_number) as max FROM sop_versions WHERE sop_id = ?').get(id) as { max: number | null };
  const newVersion = (currentVersion.max || 0) + 1;

  db.prepare(`
    INSERT INTO sop_versions (sop_id, version_number, snapshot, change_summary, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, newVersion, version.snapshot, `Restored from version ${version.version_number}`, req.user!.id);

  db.prepare('UPDATE sops SET version = ? WHERE id = ?').run(newVersion, id);

  res.json({ message: `Restored to version ${version.version_number}`, newVersion });
});

// === APPROVAL WORKFLOW ===

// Get approval history for an SOP
router.get('/:id/approvals', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const approvals = db.prepare(`
    SELECT a.*,
      r.name as requested_by_name,
      v.name as reviewed_by_name
    FROM sop_approvals a
    LEFT JOIN users r ON a.requested_by = r.id
    LEFT JOIN users v ON a.reviewed_by = v.id
    WHERE a.sop_id = ?
    ORDER BY a.requested_at DESC
  `).all(id);

  res.json(approvals);
});

// Submit SOP for approval
router.post('/:id/submit-for-approval', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  // Check if SOP exists and is in draft status
  const sop = db.prepare('SELECT * FROM sops WHERE id = ?').get(id) as SopRow | undefined;
  if (!sop) {
    return res.status(404).json({ error: 'SOP not found' });
  }

  if (sop.status !== 'draft' && sop.status !== 'review') {
    return res.status(400).json({ error: 'SOP must be in draft or review status to submit for approval' });
  }

  // Check for pending approval
  const pendingApproval = db.prepare(`
    SELECT * FROM sop_approvals WHERE sop_id = ? AND status = 'pending'
  `).get(id);

  if (pendingApproval) {
    return res.status(400).json({ error: 'SOP already has a pending approval request' });
  }

  // Create a version snapshot before submitting
  const steps = db.prepare('SELECT * FROM sop_steps WHERE sop_id = ? ORDER BY sort_order').all(id);
  const responsibilities = db.prepare('SELECT * FROM sop_responsibilities WHERE sop_id = ?').all(id);
  const snapshot = JSON.stringify({ sop, steps, responsibilities });

  const currentVersion = db.prepare('SELECT MAX(version_number) as max FROM sop_versions WHERE sop_id = ?').get(id) as { max: number | null };
  const nextVersion = (currentVersion.max || 0) + 1;

  db.prepare(`
    INSERT INTO sop_versions (sop_id, version_number, snapshot, change_summary, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, nextVersion, snapshot, 'Submitted for approval', req.user!.id);

  db.prepare('UPDATE sops SET version = ? WHERE id = ?').run(nextVersion, id);

  // Create approval request
  const result = db.prepare(`
    INSERT INTO sop_approvals (sop_id, requested_by)
    VALUES (?, ?)
  `).run(id, req.user!.id);

  // Update SOP status
  db.prepare(`UPDATE sops SET status = 'pending_approval', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);

  const approval = db.prepare(`
    SELECT a.*, u.name as requested_by_name
    FROM sop_approvals a
    LEFT JOIN users u ON a.requested_by = u.id
    WHERE a.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(approval);
});

// Approve SOP
router.post('/:id/approvals/:approvalId/approve', (req: AuthRequest, res: Response) => {
  const { id, approvalId } = req.params;
  const { comments } = req.body;

  // Only admins can approve
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can approve SOPs' });
  }

  const approval = db.prepare('SELECT * FROM sop_approvals WHERE id = ? AND sop_id = ?').get(approvalId, id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval request not found' });
  }

  // Update approval record
  db.prepare(`
    UPDATE sop_approvals
    SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, comments = ?
    WHERE id = ?
  `).run(req.user!.id, comments || null, approvalId);

  // Update SOP status to active and set review date
  const reviewPeriod = db.prepare('SELECT value FROM settings WHERE key = ?').get('review_period_days') as { value: string } | undefined;
  const reviewDays = parseInt(reviewPeriod?.value || '90');
  const reviewDueDate = new Date(Date.now() + reviewDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.prepare(`
    UPDATE sops
    SET status = 'active', approved_by = ?, review_due_date = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(req.user!.id, reviewDueDate, id);

  res.json({ message: 'SOP approved successfully' });
});

// Reject SOP
router.post('/:id/approvals/:approvalId/reject', (req: AuthRequest, res: Response) => {
  const { id, approvalId } = req.params;
  const { comments } = req.body;

  // Only admins can reject
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can reject SOPs' });
  }

  if (!comments) {
    return res.status(400).json({ error: 'Comments are required when rejecting' });
  }

  const approval = db.prepare('SELECT * FROM sop_approvals WHERE id = ? AND sop_id = ?').get(approvalId, id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval request not found' });
  }

  // Update approval record
  db.prepare(`
    UPDATE sop_approvals
    SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, comments = ?
    WHERE id = ?
  `).run(req.user!.id, comments, approvalId);

  // Update SOP status back to draft
  db.prepare(`
    UPDATE sops SET status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(id);

  res.json({ message: 'SOP rejected', comments });
});

export default router;
