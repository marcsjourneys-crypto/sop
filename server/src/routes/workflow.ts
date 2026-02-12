import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

interface WorkflowStep {
  id: number;
  step_order: number;
  status_key: string;
  display_label: string;
  color: string;
  is_initial: number;
  is_final: number;
  requires_approval: number;
  can_edit: number;
  created_at: string;
}

interface WorkflowTransition {
  id: number;
  from_status: string;
  to_status: string;
  requires_admin: number;
  auto_creates_approval: number;
}

// Get all workflow steps (ordered)
router.get('/steps', authenticateToken, (req, res) => {
  try {
    const steps = db.prepare(`
      SELECT * FROM workflow_steps ORDER BY step_order ASC
    `).all() as WorkflowStep[];
    res.json(steps);
  } catch (error) {
    console.error('Error fetching workflow steps:', error);
    res.status(500).json({ error: 'Failed to fetch workflow steps' });
  }
});

// Get all workflow transitions
router.get('/transitions', authenticateToken, (req, res) => {
  try {
    const transitions = db.prepare(`
      SELECT * FROM workflow_transitions
    `).all() as WorkflowTransition[];
    res.json(transitions);
  } catch (error) {
    console.error('Error fetching workflow transitions:', error);
    res.status(500).json({ error: 'Failed to fetch workflow transitions' });
  }
});

// Add a new workflow step (admin only)
router.post('/steps', requireAdmin, (req, res) => {
  const { status_key, display_label, color = 'gray', requires_approval = 0, can_edit = 1 } = req.body;

  if (!status_key || !display_label) {
    return res.status(400).json({ error: 'status_key and display_label are required' });
  }

  // Check for duplicate status_key
  const existing = db.prepare('SELECT id FROM workflow_steps WHERE status_key = ?').get(status_key);
  if (existing) {
    return res.status(400).json({ error: 'A step with this status key already exists' });
  }

  try {
    // Get max step_order
    const maxOrder = db.prepare('SELECT MAX(step_order) as max_order FROM workflow_steps').get() as { max_order: number | null };
    const newOrder = (maxOrder.max_order || 0) + 1;

    const result = db.prepare(`
      INSERT INTO workflow_steps (step_order, status_key, display_label, color, is_initial, is_final, requires_approval, can_edit)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?)
    `).run(newOrder, status_key, display_label, color, requires_approval ? 1 : 0, can_edit ? 1 : 0);

    const newStep = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(result.lastInsertRowid) as WorkflowStep;
    res.status(201).json(newStep);
  } catch (error) {
    console.error('Error creating workflow step:', error);
    res.status(500).json({ error: 'Failed to create workflow step' });
  }
});

// Update a workflow step (admin only)
router.put('/steps/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { display_label, color, requires_approval, can_edit } = req.body;

  const step = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(id) as WorkflowStep | undefined;
  if (!step) {
    return res.status(404).json({ error: 'Workflow step not found' });
  }

  try {
    db.prepare(`
      UPDATE workflow_steps
      SET display_label = COALESCE(?, display_label),
          color = COALESCE(?, color),
          requires_approval = COALESCE(?, requires_approval),
          can_edit = COALESCE(?, can_edit)
      WHERE id = ?
    `).run(
      display_label ?? null,
      color ?? null,
      requires_approval !== undefined ? (requires_approval ? 1 : 0) : null,
      can_edit !== undefined ? (can_edit ? 1 : 0) : null,
      id
    );

    const updatedStep = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(id) as WorkflowStep;
    res.json(updatedStep);
  } catch (error) {
    console.error('Error updating workflow step:', error);
    res.status(500).json({ error: 'Failed to update workflow step' });
  }
});

// Reorder workflow steps (admin only) - MUST be before /steps/:id route
router.put('/steps/reorder', requireAdmin, (req, res) => {
  const { order } = req.body; // Array of { id, step_order }

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of { id, step_order }' });
  }

  try {
    const updateOrder = db.prepare('UPDATE workflow_steps SET step_order = ? WHERE id = ?');
    const transaction = db.transaction(() => {
      for (const item of order) {
        updateOrder.run(item.step_order, item.id);
      }
    });
    transaction();

    const steps = db.prepare('SELECT * FROM workflow_steps ORDER BY step_order ASC').all() as WorkflowStep[];
    res.json(steps);
  } catch (error) {
    console.error('Error reordering workflow steps:', error);
    res.status(500).json({ error: 'Failed to reorder workflow steps' });
  }
});

// Delete a workflow step (admin only)
router.delete('/steps/:id', requireAdmin, (req, res) => {
  const { id } = req.params;

  const step = db.prepare('SELECT * FROM workflow_steps WHERE id = ?').get(id) as WorkflowStep | undefined;
  if (!step) {
    return res.status(404).json({ error: 'Workflow step not found' });
  }

  // Check if any SOPs are using this status
  const sopsUsingStatus = db.prepare('SELECT COUNT(*) as count FROM sops WHERE status = ?').get(step.status_key) as { count: number };
  if (sopsUsingStatus.count > 0) {
    return res.status(400).json({
      error: `Cannot delete: ${sopsUsingStatus.count} SOP(s) are currently in this status`
    });
  }

  // Don't allow deleting initial or final steps without replacement
  if (step.is_initial || step.is_final) {
    return res.status(400).json({
      error: 'Cannot delete initial or final workflow step'
    });
  }

  try {
    // Delete associated transitions
    db.prepare('DELETE FROM workflow_transitions WHERE from_status = ? OR to_status = ?').run(step.status_key, step.status_key);

    // Delete the step
    db.prepare('DELETE FROM workflow_steps WHERE id = ?').run(id);

    res.json({ message: 'Workflow step deleted' });
  } catch (error) {
    console.error('Error deleting workflow step:', error);
    res.status(500).json({ error: 'Failed to delete workflow step' });
  }
});

// Update workflow transitions (admin only)
router.put('/transitions', requireAdmin, (req, res) => {
  const { transitions } = req.body; // Array of { from_status, to_status, requires_admin, auto_creates_approval }

  if (!Array.isArray(transitions)) {
    return res.status(400).json({ error: 'transitions must be an array' });
  }

  try {
    const transaction = db.transaction(() => {
      // Clear existing transitions
      db.prepare('DELETE FROM workflow_transitions').run();

      // Insert new transitions
      const insertTransition = db.prepare(`
        INSERT INTO workflow_transitions (from_status, to_status, requires_admin, auto_creates_approval)
        VALUES (?, ?, ?, ?)
      `);

      for (const t of transitions) {
        insertTransition.run(
          t.from_status,
          t.to_status,
          t.requires_admin ? 1 : 0,
          t.auto_creates_approval ? 1 : 0
        );
      }
    });
    transaction();

    const updatedTransitions = db.prepare('SELECT * FROM workflow_transitions').all() as WorkflowTransition[];
    res.json(updatedTransitions);
  } catch (error) {
    console.error('Error updating workflow transitions:', error);
    res.status(500).json({ error: 'Failed to update workflow transitions' });
  }
});

// Check if a transition is allowed
router.get('/can-transition', authenticateToken, (req: AuthRequest, res: Response) => {
  const { from_status, to_status } = req.query;
  const isAdmin = req.user?.role === 'admin';

  if (!from_status || !to_status) {
    return res.status(400).json({ error: 'from_status and to_status are required' });
  }

  try {
    const transition = db.prepare(`
      SELECT * FROM workflow_transitions
      WHERE from_status = ? AND to_status = ?
    `).get(from_status, to_status) as WorkflowTransition | undefined;

    if (!transition) {
      return res.json({ allowed: false, reason: 'Transition not allowed' });
    }

    if (transition.requires_admin && !isAdmin) {
      return res.json({ allowed: false, reason: 'Admin required for this transition' });
    }

    res.json({
      allowed: true,
      auto_creates_approval: !!transition.auto_creates_approval
    });
  } catch (error) {
    console.error('Error checking transition:', error);
    res.status(500).json({ error: 'Failed to check transition' });
  }
});

export default router;
