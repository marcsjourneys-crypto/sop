import { db, initializeDatabase } from './schema.js';
import bcrypt from 'bcrypt';

async function seed() {
  initializeDatabase();

  // Create admin user if not exists
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@esi.com');

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('admin@esi.com', passwordHash, 'Admin User', 'admin');
    console.log('Created admin user: admin@esi.com / admin123');
  } else {
    console.log('Admin user already exists');
  }

  // Create a sample regular user
  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get('user@esi.com');

  if (!existingUser) {
    const passwordHash = await bcrypt.hash('user123', 10);
    db.prepare(`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (?, ?, ?, ?)
    `).run('user@esi.com', passwordHash, 'Sample User', 'user');
    console.log('Created sample user: user@esi.com / user123');
  } else {
    console.log('Sample user already exists');
  }

  // Seed sample SOPs
  const existingSops = db.prepare('SELECT COUNT(*) as count FROM sops').get() as { count: number };

  if (existingSops.count === 0) {
    console.log('Creating sample SOPs...');

    // SOP 1: Equipment Calibration (Active)
    const sop1 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope, definitions, status, effective_date, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-001',
      'Equipment Calibration Procedure',
      'Quality Assurance',
      'To establish a standardized procedure for calibrating measurement equipment to ensure accuracy and compliance with ISO standards.',
      'This procedure applies to all measurement and testing equipment used in production and quality control departments.',
      'Calibration: The process of comparing measurement values to a known standard.\nNIST: National Institute of Standards and Technology.\nTolerance: Acceptable range of measurement deviation.',
      'active',
      '2024-01-15',
      '2025-01-15'
    );

    const sop1Id = sop1.lastInsertRowid;

    // Steps for SOP 1
    const steps1 = [
      { step: 1, instruction: 'Gather all equipment requiring calibration and the calibration log.', notes: 'Check the equipment schedule for due dates.' },
      { step: 2, instruction: 'Verify the calibration standards are current and traceable to NIST.', notes: 'Standards must have valid certificates.' },
      { step: 3, instruction: 'Clean all equipment surfaces before calibration.', notes: 'Use approved cleaning agents only.' },
      { step: 4, instruction: 'Perform calibration according to equipment-specific procedures.', notes: 'Refer to manufacturer guidelines.' },
      { step: 5, instruction: 'Record all measurements and compare to tolerance specifications.', notes: 'Document any out-of-tolerance conditions.' },
      { step: 6, instruction: 'Apply calibration sticker with date and technician initials.', notes: 'Include next due date on sticker.' },
      { step: 7, instruction: 'Update the calibration log and equipment database.', notes: 'Retain records for 5 years minimum.' }
    ];

    for (const step of steps1) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, instruction, notes)
        VALUES (?, ?, ?, ?)
      `).run(sop1Id, step.step, step.instruction, step.notes);
    }

    // Responsibilities for SOP 1
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop1Id, 'QA Manager', 'Approve calibration procedures and schedules');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop1Id, 'Calibration Technician', 'Perform calibrations and maintain records');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop1Id, 'Department Supervisors', 'Ensure equipment is available for scheduled calibration');

    console.log('Created SOP-001: Equipment Calibration Procedure');

    // SOP 2: Safety Inspection (Review)
    const sop2 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope, definitions, status, effective_date, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-002',
      'Monthly Safety Inspection',
      'Safety',
      'To ensure workplace safety through regular inspections and hazard identification.',
      'All production areas, warehouses, and office spaces within the facility.',
      'PPE: Personal Protective Equipment.\nHazard: Any condition that could cause injury or illness.\nCorrectiveAction: Steps taken to eliminate or reduce hazards.',
      'review',
      '2023-06-01',
      '2024-06-01'
    );

    const sop2Id = sop2.lastInsertRowid;

    const steps2 = [
      { step: 1, instruction: 'Review previous inspection reports and open action items.', notes: 'Bring tablet with inspection app.' },
      { step: 2, instruction: 'Walk through assigned areas using the safety checklist.', notes: 'Check fire extinguishers, exits, PPE stations.' },
      { step: 3, instruction: 'Document any hazards with photos and descriptions.', notes: 'Use standardized hazard classification.' },
      { step: 4, instruction: 'Interview workers about safety concerns.', notes: 'Maintain confidentiality as requested.' },
      { step: 5, instruction: 'Complete inspection report and submit within 24 hours.', notes: 'Include risk ratings for each finding.' },
      { step: 6, instruction: 'Follow up on critical hazards immediately.', notes: 'Escalate to Safety Manager if needed.' }
    ];

    for (const step of steps2) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, instruction, notes)
        VALUES (?, ?, ?, ?)
      `).run(sop2Id, step.step, step.instruction, step.notes);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop2Id, 'Safety Officer', 'Conduct inspections and submit reports');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop2Id, 'Safety Manager', 'Review reports and assign corrective actions');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop2Id, 'Area Supervisors', 'Implement corrective actions in their areas');

    console.log('Created SOP-002: Monthly Safety Inspection');

    // SOP 3: New Employee Onboarding (Active)
    const sop3 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope, definitions, status, effective_date, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-003',
      'New Employee Onboarding Process',
      'Human Resources',
      'To provide a consistent and comprehensive onboarding experience for all new employees.',
      'All new hires including full-time, part-time, and contract employees.',
      'Onboarding: The process of integrating new employees into the organization.\nBuddy: Assigned peer mentor for new employee support.\nProbation: Initial employment evaluation period.',
      'active',
      '2024-03-01',
      '2025-03-01'
    );

    const sop3Id = sop3.lastInsertRowid;

    const steps3 = [
      { step: 1, instruction: 'Send welcome email with first day details and required documents.', notes: 'Include parking information and dress code.' },
      { step: 2, instruction: 'Prepare workstation, equipment, and system access credentials.', notes: 'Coordinate with IT 3 days in advance.' },
      { step: 3, instruction: 'Conduct HR orientation covering policies, benefits, and safety.', notes: 'Use standard presentation deck.' },
      { step: 4, instruction: 'Introduce new employee to team members and assign buddy.', notes: 'Schedule meet-and-greet with key stakeholders.' },
      { step: 5, instruction: 'Provide department-specific training and job responsibilities overview.', notes: 'Document training completion.' },
      { step: 6, instruction: 'Schedule 30-day, 60-day, and 90-day check-in meetings.', notes: 'Add to manager and HR calendars.' },
      { step: 7, instruction: 'Complete onboarding checklist and file in employee record.', notes: 'Both employee and HR must sign.' }
    ];

    for (const step of steps3) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, instruction, notes)
        VALUES (?, ?, ?, ?)
      `).run(sop3Id, step.step, step.instruction, step.notes);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop3Id, 'HR Coordinator', 'Manage onboarding logistics and documentation');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop3Id, 'Hiring Manager', 'Ensure department-specific training is completed');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop3Id, 'IT Support', 'Setup accounts and equipment access');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop3Id, 'Assigned Buddy', 'Provide peer support during first 90 days');

    console.log('Created SOP-003: New Employee Onboarding Process');

    // SOP 4: Inventory Management (Draft)
    const sop4 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope, definitions, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-004',
      'Inventory Cycle Counting',
      'Warehouse',
      'To maintain accurate inventory records through regular cycle counting procedures.',
      'All SKUs stored in warehouse locations A through F.',
      'Cycle Count: Periodic counting of a subset of inventory.\nVariance: Difference between physical count and system records.\nABC Analysis: Inventory classification by value/importance.',
      'draft'
    );

    const sop4Id = sop4.lastInsertRowid;

    const steps4 = [
      { step: 1, instruction: 'Generate cycle count list from WMS based on ABC classification.', notes: 'A items counted monthly, B quarterly, C annually.' },
      { step: 2, instruction: 'Print count sheets and assign to warehouse team members.', notes: 'Distribute before shift start.' },
      { step: 3, instruction: 'Count items in designated locations and record quantities.', notes: 'Count twice for accuracy.' },
      { step: 4, instruction: 'Enter counts into WMS and review variances.', notes: 'Flag variances over 5%.' },
      { step: 5, instruction: 'Investigate and document root cause for significant variances.', notes: 'Common causes: receiving errors, picks without scan.' }
    ];

    for (const step of steps4) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, instruction, notes)
        VALUES (?, ?, ?, ?)
      `).run(sop4Id, step.step, step.instruction, step.notes);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop4Id, 'Warehouse Manager', 'Oversee cycle count program and accuracy metrics');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop4Id, 'Inventory Clerk', 'Perform counts and enter data');

    console.log('Created SOP-004: Inventory Cycle Counting (Draft)');

    // SOP 5: Customer Complaint Handling (Active)
    const sop5 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope, definitions, status, effective_date, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-005',
      'Customer Complaint Resolution',
      'Customer Service',
      'To ensure consistent and timely resolution of customer complaints while identifying improvement opportunities.',
      'All customer complaints received via phone, email, or web portal.',
      'Complaint: Expression of dissatisfaction regarding products or services.\nRCA: Root Cause Analysis.\nCAPA: Corrective and Preventive Action.',
      'active',
      '2024-02-01',
      '2025-02-01'
    );

    const sop5Id = sop5.lastInsertRowid;

    const steps5 = [
      { step: 1, instruction: 'Log complaint in CRM with customer details and issue description.', notes: 'Assign unique complaint number.' },
      { step: 2, instruction: 'Acknowledge receipt to customer within 4 business hours.', notes: 'Use template email/script.' },
      { step: 3, instruction: 'Categorize complaint and route to appropriate department.', notes: 'Product, Service, Billing, Shipping categories.' },
      { step: 4, instruction: 'Investigate root cause and document findings.', notes: 'Interview involved parties as needed.' },
      { step: 5, instruction: 'Determine resolution and obtain approval if credits/refunds needed.', notes: 'Follow authorization matrix.' },
      { step: 6, instruction: 'Communicate resolution to customer and confirm satisfaction.', notes: 'Document customer response.' },
      { step: 7, instruction: 'Close complaint in CRM and update metrics dashboard.', notes: 'Target: resolve within 5 business days.' },
      { step: 8, instruction: 'Identify trends monthly and initiate CAPA when warranted.', notes: 'Review in monthly quality meeting.' }
    ];

    for (const step of steps5) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, instruction, notes)
        VALUES (?, ?, ?, ?)
      `).run(sop5Id, step.step, step.instruction, step.notes);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop5Id, 'Customer Service Rep', 'Log complaints and communicate with customers');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop5Id, 'CS Manager', 'Review escalations and approve resolutions');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role, responsibility) VALUES (?, ?, ?)`).run(sop5Id, 'Quality Team', 'Conduct RCA and implement CAPA');

    console.log('Created SOP-005: Customer Complaint Resolution');

    console.log('Sample SOPs created successfully!');
  } else {
    console.log('SOPs already exist, skipping sample data');
  }

  console.log('Seed completed');
}

seed().catch(console.error);
