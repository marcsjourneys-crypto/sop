# SOP Management App Design

## Overview
Convert ESI HTML forms (Questionnaire, Shadowing, SOP Template) into a full-stack React application with authentication, dashboard, and admin features.

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** SQLite with better-sqlite3
- **Auth:** JWT tokens with httpOnly cookies

## Architecture

```
shipyard/
├── SOP/                    # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Dashboard, SOPForm, Questionnaire, etc.
│   │   ├── hooks/          # useAuth, useAutoSave, etc.
│   │   ├── api/            # API client functions
│   │   └── types/          # TypeScript interfaces
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes (auth, sops, users, settings)
│   │   ├── db/             # SQLite setup, migrations, queries
│   │   ├── middleware/     # Auth middleware
│   │   └── index.ts        # Entry point
├── docs/                   # Original HTML references
└── database.sqlite         # SQLite file (gitignored)
```

## Data Model

### users
- id, email (unique), password_hash, name, role ('admin'|'user'), created_at, updated_at

### sops
- id, sop_number (unique, auto: "SOP-0001"), department, process_name
- status ('draft'|'active'|'review'), purpose, scope_applies_to, scope_not_applies_to
- tools, materials, time fields, quality fields, documentation fields
- safety_concerns, approved_by, review_due_date, created_by, created_at, updated_at

### sop_steps
- id, sop_id (FK), step_number, action_name, who_role, action, tools_used
- time_for_step, standard, common_mistakes, sort_order

### sop_responsibilities
- id, sop_id (FK), role_name, responsibility_description

### questionnaires
- id, sop_id (FK), employee_name, department, position, interviewer, interview_date
- All 27 question response fields, notes, created_by, created_at

### shadowing_observations
- id, sop_id (FK), employee_observed, department, position, observer
- observation_date, time_from, time_to, all observation fields, created_by, created_at

### settings
- key (PK), value

## Pages

- `/login` - Login page (public)
- `/dashboard` - Main SOP list with status badges
- `/sop/new` - Create new SOP (auto-assigns number)
- `/sop/:id` - View/Edit SOP details
- `/sop/:id/questionnaire/new` - New questionnaire for SOP
- `/sop/:id/shadowing/new` - New shadowing observation for SOP
- `/admin/settings` - Review period, system config (admin only)
- `/admin/users` - User management (admin only)

## Features

- **Auto-save:** Debounced save with visual indicator
- **Dynamic steps:** Add/remove procedure steps
- **Status badges:** Draft (yellow), Active (green), Review (red)
- **Review auto-flag:** SOPs past review_due_date flagged automatically
- **Mobile responsive:** Single-column layout, large touch targets

## User Roles

- **Admin:** Full access, manage users and settings
- **User:** View SOPs, fill out questionnaires and shadowing forms
