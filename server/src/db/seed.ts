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
      INSERT INTO sops (sop_number, process_name, department, purpose, scope_applies_to, tools, materials, status, review_due_date, safety_concerns)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-001',
      'Equipment Calibration Procedure',
      'Quality Assurance',
      'To establish a standardized procedure for calibrating measurement equipment to ensure accuracy and compliance with ISO standards.',
      'All measurement and testing equipment used in production and quality control departments.',
      'Calibration standards, multimeter, calibration software',
      'Calibration stickers, log books, cleaning supplies',
      'active',
      '2025-01-15',
      'Ensure equipment is powered off before calibration. Follow lockout/tagout procedures.'
    );

    const sop1Id = sop1.lastInsertRowid;

    // Steps for SOP 1
    const steps1 = [
      { num: 1, name: 'Gather Equipment', role: 'Calibration Tech', action: 'Gather all equipment requiring calibration and the calibration log.', tools: 'Equipment list, calibration schedule', time: '15 min', standard: 'Check the equipment schedule for due dates.', mistakes: 'Missing equipment from schedule' },
      { num: 2, name: 'Verify Standards', role: 'Calibration Tech', action: 'Verify the calibration standards are current and traceable to NIST.', tools: 'Standards certificates', time: '10 min', standard: 'Standards must have valid certificates.', mistakes: 'Using expired standards' },
      { num: 3, name: 'Clean Equipment', role: 'Calibration Tech', action: 'Clean all equipment surfaces before calibration.', tools: 'Cleaning supplies', time: '10 min', standard: 'Use approved cleaning agents only.', mistakes: 'Using unapproved solvents' },
      { num: 4, name: 'Perform Calibration', role: 'Calibration Tech', action: 'Perform calibration according to equipment-specific procedures.', tools: 'Calibration standards, software', time: '30 min', standard: 'Refer to manufacturer guidelines.', mistakes: 'Skipping calibration points' },
      { num: 5, name: 'Record Measurements', role: 'Calibration Tech', action: 'Record all measurements and compare to tolerance specifications.', tools: 'Calibration log', time: '10 min', standard: 'Document any out-of-tolerance conditions.', mistakes: 'Incorrect data entry' },
      { num: 6, name: 'Apply Sticker', role: 'Calibration Tech', action: 'Apply calibration sticker with date and technician initials.', tools: 'Calibration stickers', time: '5 min', standard: 'Include next due date on sticker.', mistakes: 'Wrong date on sticker' },
      { num: 7, name: 'Update Records', role: 'Calibration Tech', action: 'Update the calibration log and equipment database.', tools: 'Database system', time: '10 min', standard: 'Retain records for 5 years minimum.', mistakes: 'Forgetting to update database' }
    ];

    for (const step of steps1) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sop1Id, step.num, step.name, step.role, step.action, step.tools, step.time, step.standard, step.mistakes, step.num);
    }

    // Responsibilities for SOP 1
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop1Id, 'QA Manager', 'Approve calibration procedures and schedules');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop1Id, 'Calibration Technician', 'Perform calibrations and maintain records');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop1Id, 'Department Supervisors', 'Ensure equipment is available for scheduled calibration');

    console.log('Created SOP-001: Equipment Calibration Procedure');

    // SOP 2: Safety Inspection (Review)
    const sop2 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope_applies_to, tools, status, review_due_date, safety_concerns)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-002',
      'Monthly Safety Inspection',
      'Safety',
      'To ensure workplace safety through regular inspections and hazard identification.',
      'All production areas, warehouses, and office spaces within the facility.',
      'Tablet with inspection app, safety checklist, camera, PPE',
      'review',
      '2024-06-01',
      'Wear appropriate PPE when entering production areas. Report all hazards immediately.'
    );

    const sop2Id = sop2.lastInsertRowid;

    const steps2 = [
      { num: 1, name: 'Review Reports', role: 'Safety Officer', action: 'Review previous inspection reports and open action items.', tools: 'Tablet with inspection app', time: '15 min', standard: 'All open items must be addressed.', mistakes: 'Missing previous open items' },
      { num: 2, name: 'Walk Through Areas', role: 'Safety Officer', action: 'Walk through assigned areas using the safety checklist.', tools: 'Safety checklist', time: '45 min', standard: 'Check fire extinguishers, exits, PPE stations.', mistakes: 'Skipping areas' },
      { num: 3, name: 'Document Hazards', role: 'Safety Officer', action: 'Document any hazards with photos and descriptions.', tools: 'Camera, tablet', time: '20 min', standard: 'Use standardized hazard classification.', mistakes: 'Incomplete descriptions' },
      { num: 4, name: 'Interview Workers', role: 'Safety Officer', action: 'Interview workers about safety concerns.', tools: 'Interview form', time: '20 min', standard: 'Maintain confidentiality as requested.', mistakes: 'Leading questions' },
      { num: 5, name: 'Submit Report', role: 'Safety Officer', action: 'Complete inspection report and submit within 24 hours.', tools: 'Reporting system', time: '30 min', standard: 'Include risk ratings for each finding.', mistakes: 'Late submission' },
      { num: 6, name: 'Follow Up', role: 'Safety Officer', action: 'Follow up on critical hazards immediately.', tools: 'Communication system', time: '15 min', standard: 'Escalate to Safety Manager if needed.', mistakes: 'Delaying critical items' }
    ];

    for (const step of steps2) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sop2Id, step.num, step.name, step.role, step.action, step.tools, step.time, step.standard, step.mistakes, step.num);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop2Id, 'Safety Officer', 'Conduct inspections and submit reports');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop2Id, 'Safety Manager', 'Review reports and assign corrective actions');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop2Id, 'Area Supervisors', 'Implement corrective actions in their areas');

    console.log('Created SOP-002: Monthly Safety Inspection');

    // SOP 3: New Employee Onboarding (Active)
    const sop3 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope_applies_to, tools, status, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-003',
      'New Employee Onboarding Process',
      'Human Resources',
      'To provide a consistent and comprehensive onboarding experience for all new employees.',
      'All new hires including full-time, part-time, and contract employees.',
      'HRIS system, onboarding checklist, presentation materials, IT equipment',
      'active',
      '2025-03-01'
    );

    const sop3Id = sop3.lastInsertRowid;

    const steps3 = [
      { num: 1, name: 'Send Welcome', role: 'HR Coordinator', action: 'Send welcome email with first day details and required documents.', tools: 'Email, welcome packet template', time: '15 min', standard: 'Include parking information and dress code.', mistakes: 'Missing start date' },
      { num: 2, name: 'Prepare Workstation', role: 'IT Support', action: 'Prepare workstation, equipment, and system access credentials.', tools: 'IT provisioning system', time: '2 hours', standard: 'Coordinate with IT 3 days in advance.', mistakes: 'Missing software licenses' },
      { num: 3, name: 'HR Orientation', role: 'HR Coordinator', action: 'Conduct HR orientation covering policies, benefits, and safety.', tools: 'Presentation deck, benefits forms', time: '2 hours', standard: 'Use standard presentation deck.', mistakes: 'Skipping compliance topics' },
      { num: 4, name: 'Team Introduction', role: 'Hiring Manager', action: 'Introduce new employee to team members and assign buddy.', tools: 'Org chart', time: '1 hour', standard: 'Schedule meet-and-greet with key stakeholders.', mistakes: 'No buddy assigned' },
      { num: 5, name: 'Department Training', role: 'Hiring Manager', action: 'Provide department-specific training and job responsibilities overview.', tools: 'Training materials, job description', time: '4 hours', standard: 'Document training completion.', mistakes: 'Rushing through training' },
      { num: 6, name: 'Schedule Check-ins', role: 'HR Coordinator', action: 'Schedule 30-day, 60-day, and 90-day check-in meetings.', tools: 'Calendar system', time: '10 min', standard: 'Add to manager and HR calendars.', mistakes: 'Missing calendar invites' },
      { num: 7, name: 'Complete Checklist', role: 'HR Coordinator', action: 'Complete onboarding checklist and file in employee record.', tools: 'HRIS, checklist', time: '15 min', standard: 'Both employee and HR must sign.', mistakes: 'Missing signatures' }
    ];

    for (const step of steps3) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sop3Id, step.num, step.name, step.role, step.action, step.tools, step.time, step.standard, step.mistakes, step.num);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop3Id, 'HR Coordinator', 'Manage onboarding logistics and documentation');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop3Id, 'Hiring Manager', 'Ensure department-specific training is completed');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop3Id, 'IT Support', 'Setup accounts and equipment access');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop3Id, 'Assigned Buddy', 'Provide peer support during first 90 days');

    console.log('Created SOP-003: New Employee Onboarding Process');

    // SOP 4: Inventory Management (Draft)
    const sop4 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope_applies_to, tools, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-004',
      'Inventory Cycle Counting',
      'Warehouse',
      'To maintain accurate inventory records through regular cycle counting procedures.',
      'All SKUs stored in warehouse locations A through F.',
      'WMS system, RF scanners, count sheets, clipboard',
      'draft'
    );

    const sop4Id = sop4.lastInsertRowid;

    const steps4 = [
      { num: 1, name: 'Generate List', role: 'Inventory Clerk', action: 'Generate cycle count list from WMS based on ABC classification.', tools: 'WMS system', time: '15 min', standard: 'A items counted monthly, B quarterly, C annually.', mistakes: 'Wrong classification filter' },
      { num: 2, name: 'Print & Assign', role: 'Warehouse Supervisor', action: 'Print count sheets and assign to warehouse team members.', tools: 'Printer, count sheets', time: '10 min', standard: 'Distribute before shift start.', mistakes: 'Late distribution' },
      { num: 3, name: 'Count Items', role: 'Warehouse Staff', action: 'Count items in designated locations and record quantities.', tools: 'RF scanner, clipboard', time: '2 hours', standard: 'Count twice for accuracy.', mistakes: 'Single count only' },
      { num: 4, name: 'Enter Counts', role: 'Inventory Clerk', action: 'Enter counts into WMS and review variances.', tools: 'WMS system', time: '30 min', standard: 'Flag variances over 5%.', mistakes: 'Data entry errors' },
      { num: 5, name: 'Investigate', role: 'Inventory Clerk', action: 'Investigate and document root cause for significant variances.', tools: 'Investigation form', time: '1 hour', standard: 'Common causes: receiving errors, picks without scan.', mistakes: 'Incomplete investigation' }
    ];

    for (const step of steps4) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sop4Id, step.num, step.name, step.role, step.action, step.tools, step.time, step.standard, step.mistakes, step.num);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop4Id, 'Warehouse Manager', 'Oversee cycle count program and accuracy metrics');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop4Id, 'Inventory Clerk', 'Perform counts and enter data');

    console.log('Created SOP-004: Inventory Cycle Counting (Draft)');

    // SOP 5: Customer Complaint Handling (Active)
    const sop5 = db.prepare(`
      INSERT INTO sops (sop_number, process_name, department, purpose, scope_applies_to, tools, status, review_due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'SOP-005',
      'Customer Complaint Resolution',
      'Customer Service',
      'To ensure consistent and timely resolution of customer complaints while identifying improvement opportunities.',
      'All customer complaints received via phone, email, or web portal.',
      'CRM system, email templates, phone system, escalation matrix',
      'active',
      '2025-02-01'
    );

    const sop5Id = sop5.lastInsertRowid;

    const steps5 = [
      { num: 1, name: 'Log Complaint', role: 'CS Rep', action: 'Log complaint in CRM with customer details and issue description.', tools: 'CRM system', time: '10 min', standard: 'Assign unique complaint number.', mistakes: 'Missing contact info' },
      { num: 2, name: 'Acknowledge', role: 'CS Rep', action: 'Acknowledge receipt to customer within 4 business hours.', tools: 'Email templates', time: '5 min', standard: 'Use template email/script.', mistakes: 'Late acknowledgment' },
      { num: 3, name: 'Categorize', role: 'CS Rep', action: 'Categorize complaint and route to appropriate department.', tools: 'CRM routing rules', time: '5 min', standard: 'Product, Service, Billing, Shipping categories.', mistakes: 'Wrong category' },
      { num: 4, name: 'Investigate', role: 'Assigned Owner', action: 'Investigate root cause and document findings.', tools: 'Investigation form', time: '1-2 hours', standard: 'Interview involved parties as needed.', mistakes: 'Shallow investigation' },
      { num: 5, name: 'Determine Resolution', role: 'CS Manager', action: 'Determine resolution and obtain approval if credits/refunds needed.', tools: 'Authorization matrix', time: '30 min', standard: 'Follow authorization matrix.', mistakes: 'Unauthorized refunds' },
      { num: 6, name: 'Communicate', role: 'CS Rep', action: 'Communicate resolution to customer and confirm satisfaction.', tools: 'Phone, email', time: '15 min', standard: 'Document customer response.', mistakes: 'No satisfaction check' },
      { num: 7, name: 'Close Case', role: 'CS Rep', action: 'Close complaint in CRM and update metrics dashboard.', tools: 'CRM system', time: '5 min', standard: 'Target: resolve within 5 business days.', mistakes: 'Premature closure' },
      { num: 8, name: 'Trend Analysis', role: 'Quality Team', action: 'Identify trends monthly and initiate CAPA when warranted.', tools: 'Analytics dashboard', time: '2 hours', standard: 'Review in monthly quality meeting.', mistakes: 'Missing patterns' }
    ];

    for (const step of steps5) {
      db.prepare(`
        INSERT INTO sop_steps (sop_id, step_number, action_name, who_role, action, tools_used, time_for_step, standard, common_mistakes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(sop5Id, step.num, step.name, step.role, step.action, step.tools, step.time, step.standard, step.mistakes, step.num);
    }

    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop5Id, 'Customer Service Rep', 'Log complaints and communicate with customers');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop5Id, 'CS Manager', 'Review escalations and approve resolutions');
    db.prepare(`INSERT INTO sop_responsibilities (sop_id, role_name, responsibility_description) VALUES (?, ?, ?)`).run(sop5Id, 'Quality Team', 'Conduct RCA and implement CAPA');

    console.log('Created SOP-005: Customer Complaint Resolution');

    console.log('Sample SOPs created successfully!');
  } else {
    console.log('SOPs already exist, skipping sample data');
  }

  console.log('Seed completed');
}

seed().catch(console.error);
