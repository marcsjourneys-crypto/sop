import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all shadowing observations
router.get('/', (req: AuthRequest, res: Response) => {
  const observations = db.prepare(`
    SELECT sh.*, s.sop_number, s.process_name
    FROM shadowing_observations sh
    LEFT JOIN sops s ON sh.sop_id = s.id
    ORDER BY sh.created_at DESC
  `).all();

  res.json(observations);
});

// Get single shadowing observation
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const observation = db.prepare(`
    SELECT sh.*, s.sop_number, s.process_name
    FROM shadowing_observations sh
    LEFT JOIN sops s ON sh.sop_id = s.id
    WHERE sh.id = ?
  `).get(id);

  if (!observation) {
    return res.status(404).json({ error: 'Observation not found' });
  }

  res.json(observation);
});

// Create shadowing observation
router.post('/', (req: AuthRequest, res: Response) => {
  const { sop_id } = req.body;

  const result = db.prepare(`
    INSERT INTO shadowing_observations (sop_id, created_by)
    VALUES (?, ?)
  `).run(sop_id || null, req.user!.id);

  const observation = db.prepare('SELECT * FROM shadowing_observations WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(observation);
});

// Update shadowing observation
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    sop_id, employee_observed, department, position, observer,
    observation_date, time_from, time_to,
    process_to_observe, expected_steps, safety_concerns, process_steps,
    time_total, time_searching_tools, time_changing_tools, time_changeover,
    waiting_for, searching_for, rework_due_to, bottlenecks,
    decision_point_1_situation, decision_point_1_options, decision_point_1_decision, decision_point_1_reasoning,
    decision_point_2_situation, decision_point_2_options, decision_point_2_decision, decision_point_2_reasoning,
    verify_work_complete, ninety_vs_hundred,
    work_handed_off, status_communicated, documentation_used,
    setup_time, setup_issues, setup_optimization,
    problem_what_went_wrong, problem_how_diagnosed, problem_solution_attempted, problem_outcome, problem_time_to_resolve,
    key_observations, undocumented_knowledge, sop_recommendations, efficiency_improvements
  } = req.body;

  db.prepare(`
    UPDATE shadowing_observations SET
      sop_id = ?,
      employee_observed = ?,
      department = ?,
      position = ?,
      observer = ?,
      observation_date = ?,
      time_from = ?,
      time_to = ?,
      process_to_observe = ?,
      expected_steps = ?,
      safety_concerns = ?,
      process_steps = ?,
      time_total = ?,
      time_searching_tools = ?,
      time_changing_tools = ?,
      time_changeover = ?,
      waiting_for = ?,
      searching_for = ?,
      rework_due_to = ?,
      bottlenecks = ?,
      decision_point_1_situation = ?,
      decision_point_1_options = ?,
      decision_point_1_decision = ?,
      decision_point_1_reasoning = ?,
      decision_point_2_situation = ?,
      decision_point_2_options = ?,
      decision_point_2_decision = ?,
      decision_point_2_reasoning = ?,
      verify_work_complete = ?,
      ninety_vs_hundred = ?,
      work_handed_off = ?,
      status_communicated = ?,
      documentation_used = ?,
      setup_time = ?,
      setup_issues = ?,
      setup_optimization = ?,
      problem_what_went_wrong = ?,
      problem_how_diagnosed = ?,
      problem_solution_attempted = ?,
      problem_outcome = ?,
      problem_time_to_resolve = ?,
      key_observations = ?,
      undocumented_knowledge = ?,
      sop_recommendations = ?,
      efficiency_improvements = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sop_id, employee_observed, department, position, observer,
    observation_date, time_from, time_to,
    process_to_observe, expected_steps, safety_concerns, process_steps,
    time_total, time_searching_tools, time_changing_tools, time_changeover,
    waiting_for, searching_for, rework_due_to, bottlenecks,
    decision_point_1_situation, decision_point_1_options, decision_point_1_decision, decision_point_1_reasoning,
    decision_point_2_situation, decision_point_2_options, decision_point_2_decision, decision_point_2_reasoning,
    verify_work_complete, ninety_vs_hundred,
    work_handed_off, status_communicated, documentation_used,
    setup_time, setup_issues, setup_optimization,
    problem_what_went_wrong, problem_how_diagnosed, problem_solution_attempted, problem_outcome, problem_time_to_resolve,
    key_observations, undocumented_knowledge, sop_recommendations, efficiency_improvements, id
  );

  const observation = db.prepare('SELECT * FROM shadowing_observations WHERE id = ?').get(id);
  res.json(observation);
});

// Delete shadowing observation
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM shadowing_observations WHERE id = ?').run(id);
  res.json({ message: 'Observation deleted' });
});

export default router;
