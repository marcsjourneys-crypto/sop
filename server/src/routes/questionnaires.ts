import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Get all questionnaires
router.get('/', (req: AuthRequest, res: Response) => {
  const questionnaires = db.prepare(`
    SELECT q.*, s.sop_number, s.process_name
    FROM questionnaires q
    LEFT JOIN sops s ON q.sop_id = s.id
    ORDER BY q.created_at DESC
  `).all();

  res.json(questionnaires);
});

// Get single questionnaire
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const questionnaire = db.prepare(`
    SELECT q.*, s.sop_number, s.process_name
    FROM questionnaires q
    LEFT JOIN sops s ON q.sop_id = s.id
    WHERE q.id = ?
  `).get(id);

  if (!questionnaire) {
    return res.status(404).json({ error: 'Questionnaire not found' });
  }

  res.json(questionnaire);
});

// Create questionnaire
router.post('/', (req: AuthRequest, res: Response) => {
  const { sop_id } = req.body;

  const result = db.prepare(`
    INSERT INTO questionnaires (sop_id, created_by)
    VALUES (?, ?)
  `).run(sop_id || null, req.user!.id);

  const questionnaire = db.prepare('SELECT * FROM questionnaires WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(questionnaire);
});

// Update questionnaire
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    sop_id, employee_name, department, position, interviewer, interview_date,
    q1_primary_responsibilities, q2_start_time, q3_must_complete_daily, q4_lower_priority,
    q5_common_process, q6_tools_equipment, q7_materials, q8_process_complete,
    q9_done_correctly, q10_common_mistakes, q11_prevent_mistakes, q12_quality_checks,
    q13_regular_problems, q14_solve_problems, q15_escalate_vs_solve, q16_challenging_problem,
    q17_interact_with, q18_info_from_others, q19_info_to_others, q20_handoff_work,
    q21_not_written_down, q22_new_person_struggle, q23_longest_to_learn, q24_training_advice,
    q25_change_one_thing, q26_better_tools, q27_time_wasters, notes
  } = req.body;

  db.prepare(`
    UPDATE questionnaires SET
      sop_id = ?,
      employee_name = ?,
      department = ?,
      position = ?,
      interviewer = ?,
      interview_date = ?,
      q1_primary_responsibilities = ?,
      q2_start_time = ?,
      q3_must_complete_daily = ?,
      q4_lower_priority = ?,
      q5_common_process = ?,
      q6_tools_equipment = ?,
      q7_materials = ?,
      q8_process_complete = ?,
      q9_done_correctly = ?,
      q10_common_mistakes = ?,
      q11_prevent_mistakes = ?,
      q12_quality_checks = ?,
      q13_regular_problems = ?,
      q14_solve_problems = ?,
      q15_escalate_vs_solve = ?,
      q16_challenging_problem = ?,
      q17_interact_with = ?,
      q18_info_from_others = ?,
      q19_info_to_others = ?,
      q20_handoff_work = ?,
      q21_not_written_down = ?,
      q22_new_person_struggle = ?,
      q23_longest_to_learn = ?,
      q24_training_advice = ?,
      q25_change_one_thing = ?,
      q26_better_tools = ?,
      q27_time_wasters = ?,
      notes = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sop_id, employee_name, department, position, interviewer, interview_date,
    q1_primary_responsibilities, q2_start_time, q3_must_complete_daily, q4_lower_priority,
    q5_common_process, q6_tools_equipment, q7_materials, q8_process_complete,
    q9_done_correctly, q10_common_mistakes, q11_prevent_mistakes, q12_quality_checks,
    q13_regular_problems, q14_solve_problems, q15_escalate_vs_solve, q16_challenging_problem,
    q17_interact_with, q18_info_from_others, q19_info_to_others, q20_handoff_work,
    q21_not_written_down, q22_new_person_struggle, q23_longest_to_learn, q24_training_advice,
    q25_change_one_thing, q26_better_tools, q27_time_wasters, notes, id
  );

  const questionnaire = db.prepare('SELECT * FROM questionnaires WHERE id = ?').get(id);
  res.json(questionnaire);
});

// Delete questionnaire
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM questionnaires WHERE id = ?').run(id);
  res.json({ message: 'Questionnaire deleted' });
});

export default router;
