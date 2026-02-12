// User types
export type User = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
};

// SOP types
export type SOPStatus = 'draft' | 'active' | 'review' | 'pending_approval';

export type SOPVersion = {
  id: number;
  sop_id: number;
  version_number: number;
  snapshot: string;
  change_summary: string | null;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
};

export type SOPApproval = {
  id: number;
  sop_id: number;
  requested_by: number | null;
  requested_by_name?: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  comments: string | null;
};

export type ChangeItem = {
  type: 'added' | 'modified' | 'removed' | 'reordered';
  category: 'metadata' | 'step' | 'responsibility';
  field: string;
  label: string;
  before?: string;
  after?: string;
};

export type PendingApproval = {
  id: number;
  sop_id: number;
  sop_number: string;
  process_name: string | null;
  department: string | null;
  requested_by: { id: number; name: string };
  requested_at: string;
  change_count: number;
  change_summary: string | null;
  version: number;
};

export type ApprovalDetail = PendingApproval & {
  changes: ChangeItem[];
};

export type SOPStep = {
  id: number;
  sop_id: number;
  step_number: number;
  action_name: string | null;
  who_role: string | null;
  action: string | null;
  tools_used: string | null;
  time_for_step: string | null;
  standard: string | null;
  common_mistakes: string | null;
  sort_order: number;
};

export type SOPResponsibility = {
  id: number;
  sop_id: number;
  role_name: string | null;
  responsibility_description: string | null;
};

export type SOPTroubleshooting = {
  id: number;
  sop_id: number;
  problem: string | null;
  possible_cause: string | null;
  solution: string | null;
};

export type SOPRevision = {
  id: number;
  sop_id: number;
  revision_date: string | null;
  description: string | null;
  revised_by: string | null;
};

export type QuestionnairePreview = {
  id: number;
  employee_name: string | null;
  interview_date: string | null;
  created_at: string;
};

export type ShadowingPreview = {
  id: number;
  employee_observed: string | null;
  observation_date: string | null;
  created_at: string;
};

export type SOP = {
  id: number;
  sop_number: string;
  department: string | null;
  process_name: string | null;
  status: SOPStatus;
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
  approved_by_name?: string;
  review_due_date: string | null;
  assigned_to: number | null;
  assigned_to_name?: string;
  created_by: number | null;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  questionnaire_count?: number;
  shadowing_count?: number;
  steps?: SOPStep[];
  responsibilities?: SOPResponsibility[];
  troubleshooting_items?: SOPTroubleshooting[];
  revisions?: SOPRevision[];
  questionnaires?: QuestionnairePreview[];
  shadowings?: ShadowingPreview[];
};

export type Questionnaire = {
  id: number;
  sop_id: number | null;
  sop_number?: string;
  process_name?: string;
  employee_name: string | null;
  department: string | null;
  position: string | null;
  interviewer: string | null;
  interview_date: string | null;
  q1_primary_responsibilities: string | null;
  q2_start_time: string | null;
  q3_must_complete_daily: string | null;
  q4_lower_priority: string | null;
  q5_common_process: string | null;
  q6_tools_equipment: string | null;
  q7_materials: string | null;
  q8_process_complete: string | null;
  q9_done_correctly: string | null;
  q10_common_mistakes: string | null;
  q11_prevent_mistakes: string | null;
  q12_quality_checks: string | null;
  q13_regular_problems: string | null;
  q14_solve_problems: string | null;
  q15_escalate_vs_solve: string | null;
  q16_challenging_problem: string | null;
  q17_interact_with: string | null;
  q18_info_from_others: string | null;
  q19_info_to_others: string | null;
  q20_handoff_work: string | null;
  q21_not_written_down: string | null;
  q22_new_person_struggle: string | null;
  q23_longest_to_learn: string | null;
  q24_training_advice: string | null;
  q25_change_one_thing: string | null;
  q26_better_tools: string | null;
  q27_time_wasters: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type ShadowingObservation = {
  id: number;
  sop_id: number | null;
  sop_number?: string;
  process_name?: string;
  employee_observed: string | null;
  department: string | null;
  position: string | null;
  observer: string | null;
  observation_date: string | null;
  time_from: string | null;
  time_to: string | null;
  process_to_observe: string | null;
  expected_steps: string | null;
  safety_concerns: string | null;
  process_steps: string | null;
  time_total: string | null;
  time_searching_tools: string | null;
  time_changing_tools: string | null;
  time_changeover: string | null;
  waiting_for: string | null;
  searching_for: string | null;
  rework_due_to: string | null;
  bottlenecks: string | null;
  decision_point_1_situation: string | null;
  decision_point_1_options: string | null;
  decision_point_1_decision: string | null;
  decision_point_1_reasoning: string | null;
  decision_point_2_situation: string | null;
  decision_point_2_options: string | null;
  decision_point_2_decision: string | null;
  decision_point_2_reasoning: string | null;
  verify_work_complete: string | null;
  ninety_vs_hundred: string | null;
  work_handed_off: string | null;
  status_communicated: string | null;
  documentation_used: string | null;
  setup_time: string | null;
  setup_issues: string | null;
  setup_optimization: string | null;
  problem_what_went_wrong: string | null;
  problem_how_diagnosed: string | null;
  problem_solution_attempted: string | null;
  problem_outcome: string | null;
  problem_time_to_resolve: string | null;
  key_observations: string | null;
  undocumented_knowledge: string | null;
  sop_recommendations: string | null;
  efficiency_improvements: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  review_period_days: string;
  [key: string]: string;
};
