import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', '..', 'database.sqlite');

export const db: DatabaseType = new Database(dbPath);

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_number TEXT UNIQUE NOT NULL,
      department TEXT,
      process_name TEXT,
      status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'review', 'pending_approval')),
      version INTEGER DEFAULT 1,
      purpose TEXT,
      scope_applies_to TEXT,
      scope_not_applies_to TEXT,
      tools TEXT,
      materials TEXT,
      time_total TEXT,
      time_searching TEXT,
      time_changing TEXT,
      time_changeover TEXT,
      quality_during TEXT,
      quality_final TEXT,
      quality_completion_criteria TEXT,
      documentation_required TEXT,
      documentation_signoff TEXT,
      safety_concerns TEXT,
      troubleshooting TEXT,
      related_documents TEXT,
      approved_by INTEGER REFERENCES users(id),
      review_due_date TEXT,
      assigned_to INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sop_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      step_number INTEGER NOT NULL,
      action_name TEXT,
      who_role TEXT,
      action TEXT,
      tools_used TEXT,
      time_for_step TEXT,
      standard TEXT,
      common_mistakes TEXT,
      sort_order INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sop_responsibilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      role_name TEXT,
      responsibility_description TEXT
    );

    CREATE TABLE IF NOT EXISTS sop_troubleshooting (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      problem TEXT,
      possible_cause TEXT,
      solution TEXT
    );

    CREATE TABLE IF NOT EXISTS sop_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      revision_date TEXT,
      description TEXT,
      revised_by TEXT
    );

    CREATE TABLE IF NOT EXISTS questionnaires (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER REFERENCES sops(id) ON DELETE SET NULL,
      employee_name TEXT,
      department TEXT,
      position TEXT,
      interviewer TEXT,
      interview_date TEXT,
      q1_primary_responsibilities TEXT,
      q2_start_time TEXT,
      q3_must_complete_daily TEXT,
      q4_lower_priority TEXT,
      q5_common_process TEXT,
      q6_tools_equipment TEXT,
      q7_materials TEXT,
      q8_process_complete TEXT,
      q9_done_correctly TEXT,
      q10_common_mistakes TEXT,
      q11_prevent_mistakes TEXT,
      q12_quality_checks TEXT,
      q13_regular_problems TEXT,
      q14_solve_problems TEXT,
      q15_escalate_vs_solve TEXT,
      q16_challenging_problem TEXT,
      q17_interact_with TEXT,
      q18_info_from_others TEXT,
      q19_info_to_others TEXT,
      q20_handoff_work TEXT,
      q21_not_written_down TEXT,
      q22_new_person_struggle TEXT,
      q23_longest_to_learn TEXT,
      q24_training_advice TEXT,
      q25_change_one_thing TEXT,
      q26_better_tools TEXT,
      q27_time_wasters TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shadowing_observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER REFERENCES sops(id) ON DELETE SET NULL,
      employee_observed TEXT,
      department TEXT,
      position TEXT,
      observer TEXT,
      observation_date TEXT,
      time_from TEXT,
      time_to TEXT,
      process_to_observe TEXT,
      expected_steps TEXT,
      safety_concerns TEXT,
      process_steps TEXT,
      time_total TEXT,
      time_searching_tools TEXT,
      time_changing_tools TEXT,
      time_changeover TEXT,
      waiting_for TEXT,
      searching_for TEXT,
      rework_due_to TEXT,
      bottlenecks TEXT,
      decision_point_1_situation TEXT,
      decision_point_1_options TEXT,
      decision_point_1_decision TEXT,
      decision_point_1_reasoning TEXT,
      decision_point_2_situation TEXT,
      decision_point_2_options TEXT,
      decision_point_2_decision TEXT,
      decision_point_2_reasoning TEXT,
      verify_work_complete TEXT,
      ninety_vs_hundred TEXT,
      work_handed_off TEXT,
      status_communicated TEXT,
      documentation_used TEXT,
      setup_time TEXT,
      setup_issues TEXT,
      setup_optimization TEXT,
      problem_what_went_wrong TEXT,
      problem_how_diagnosed TEXT,
      problem_solution_attempted TEXT,
      problem_outcome TEXT,
      problem_time_to_resolve TEXT,
      key_observations TEXT,
      undocumented_knowledge TEXT,
      sop_recommendations TEXT,
      efficiency_improvements TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- Version History: stores complete SOP snapshots
    CREATE TABLE IF NOT EXISTS sop_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      change_summary TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Approval Workflow
    CREATE TABLE IF NOT EXISTS sop_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sop_id INTEGER NOT NULL REFERENCES sops(id) ON DELETE CASCADE,
      requested_by INTEGER REFERENCES users(id),
      requested_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT,
      comments TEXT
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_sops_status ON sops(status);
    CREATE INDEX IF NOT EXISTS idx_sops_department ON sops(department);
    CREATE INDEX IF NOT EXISTS idx_sop_steps_sop_id ON sop_steps(sop_id);
    CREATE INDEX IF NOT EXISTS idx_questionnaires_sop_id ON questionnaires(sop_id);
    CREATE INDEX IF NOT EXISTS idx_shadowing_sop_id ON shadowing_observations(sop_id);
    CREATE INDEX IF NOT EXISTS idx_sop_versions_sop_id ON sop_versions(sop_id);
    CREATE INDEX IF NOT EXISTS idx_sop_approvals_sop_id ON sop_approvals(sop_id);
  `);

  // Migration: Add assigned_to column to sops table if it doesn't exist
  try {
    db.exec(`ALTER TABLE sops ADD COLUMN assigned_to INTEGER REFERENCES users(id)`);
  } catch {
    // Column already exists, ignore
  }

  // Create index for assigned_to (after migration ensures column exists)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_sops_assigned_to ON sops(assigned_to)`);

  // Insert default settings if not exist
  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('review_period_days', '90');

  console.log('Database initialized successfully');
}

export function generateSopNumber(): string {
  const result = db.prepare('SELECT MAX(CAST(SUBSTR(sop_number, 5) AS INTEGER)) as max_num FROM sops').get() as { max_num: number | null };
  const nextNum = (result.max_num || 0) + 1;
  return `SOP-${String(nextNum).padStart(4, '0')}`;
}
