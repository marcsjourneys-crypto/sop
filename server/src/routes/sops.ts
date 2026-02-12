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
  status: 'draft' | 'active' | 'review';
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
    SELECT s.*, u.name as created_by_name, a.name as approved_by_name
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    ORDER BY s.created_at DESC
  `).all();

  res.json(sops);
});

// Get single SOP with related data
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const sop = db.prepare(`
    SELECT s.*, u.name as created_by_name, a.name as approved_by_name
    FROM sops s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
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

export default router;
