# Approval Dashboard Design

**Date:** 2026-02-11
**Status:** Approved

## Overview

Create a dedicated Approval Dashboard page for admins to review and approve/reject pending SOPs. This replaces the current workflow where admins scroll through the SOP wizard to Step 9 without context about what changed.

## Problem

Currently, when an SOP is submitted for approval:
1. Admin sees a "pending approval" badge
2. Admin scrolls through all 9 steps to reach the approval controls
3. At Step 9, admin has no summary of what changed - they may have seen highlights while scrolling but have no consolidated view
4. This makes informed approval decisions difficult

## Solution

A dedicated `/approvals` page that shows:
- List of all pending approvals with context
- Detailed change summary for each SOP
- Clear approve/reject actions with comments

## Design Decisions

| Aspect | Decision |
|--------|----------|
| Audience | Admins only |
| Entry point | New "Approvals" nav item with pending count badge |
| List view | Cards with SOP details and change preview |
| Detail view | Expandable before/after diffs |
| Change detection | Backend compares current vs previous version |
| Tab structure | List and Kanban tabs (Kanban is placeholder for future) |

## Page Structure

### Navigation

The "Approvals" link appears in the main navigation, visible only to admin users:

```
Dashboard
SOPs
Approvals (3)    ← admin only, badge shows pending count
Settings
```

Badge behavior:
- Shows count of pending approvals
- Hidden or no number when count is zero
- Updates when approvals are submitted or processed

### List View

```
┌─────────────────────────────────────────────────────┐
│  Approvals                          [3 pending]     │
├─────────────────────────────────────────────────────┤
│  [List]  [Kanban]                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ SOP-0012 · Forklift Safety Procedure        │   │
│  │ Department: Warehouse · 4 changes           │   │
│  │ Submitted by John Smith · 2 hours ago       │   │
│  │ "Updated safety requirements for section 3" │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ SOP-0008 · Quality Check Process            │   │
│  │ Department: Quality · 2 changes             │   │
│  │ Submitted by Jane Doe · 1 day ago           │   │
│  │ "Fixed typo in step 2"                      │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

List card shows:
- SOP number and process name
- Department
- Number of changes
- Who submitted and when (relative time)
- Change summary preview (first line of submitter's description)

Empty state: "No pending approvals" with checkmark icon

### Kanban Tab (Placeholder)

```
┌─────────────────────────────────────────────────────┐
│  [List]  [Kanban]                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│     Kanban view coming soon                         │
│                                                     │
│     This will include:                              │
│     - Visual pipeline (Pending → In Review → Done)  │
│     - Assign reviews to team members                │
│     - Drag-and-drop workflow                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Detail View

Clicking a card opens the focused review screen:

```
┌─────────────────────────────────────────────────────┐
│  ← Back to Approvals                                │
├─────────────────────────────────────────────────────┤
│  SOP-0012 · Forklift Safety Procedure      v3      │
│  Submitted by John Smith · Feb 11, 2026 at 2:34 PM │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CHANGES IN THIS VERSION (4)                        │
│                                                     │
│  ▶ Step 3: Description updated                     │
│  ▶ Step 5: New substep added                       │
│  ▶ Safety Concerns: Modified                       │
│  ▶ Materials: Added "Safety goggles"               │
│                                                     │
├─────────────────────────────────────────────────────┤
│  [View Full SOP]                                    │
├─────────────────────────────────────────────────────┤
│  Comments (optional)                                │
│  ┌───────────────────────────────────────────────┐ │
│  │                                               │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  [Reject]                            [Approve]      │
└─────────────────────────────────────────────────────┘
```

Expandable changes - clicking any item shows before/after:
```
▼ Step 3: Description updated
  Before: "Inspect forklift visually"
  After:  "Inspect forklift visually and check fluid levels"
```

"View Full SOP" button opens the SOP in a new tab for full context.

## Change Detection Logic

Compare current SOP data against the previous version snapshot stored in `sop_versions`.

### Fields Compared

**SOP metadata:**
- purpose, scope (applies_to, not_applies_to)
- tools, materials
- safety_concerns
- documentation fields
- quality fields (during, final, completion_criteria)
- time fields

**Steps:**
- action_name, action (description)
- who_role
- tools_used, time_for_step
- standard, common_mistakes

**Responsibilities:**
- role and responsibility text

### Change Types

| Change Type | Example Display |
|-------------|-----------------|
| Field modified | "Purpose: Updated" |
| Step modified | "Step 3: Description updated" |
| Step added | "Step 7: New step added" |
| Step removed | "Step 4: Removed" |
| Step reordered | "Steps reordered" |
| Responsibility added | "Responsibility: Quality Lead added" |
| Responsibility modified | "Responsibility: Quality Lead modified" |
| Responsibility removed | "Responsibility: Operator removed" |

### Implementation

Comparison happens on the backend. New endpoint returns structured diff:

```typescript
interface ChangeItem {
  type: 'added' | 'modified' | 'removed' | 'reordered';
  category: 'metadata' | 'step' | 'responsibility';
  field: string;
  label: string;  // Human-readable: "Step 3: Description updated"
  before?: string;
  after?: string;
}
```

## API Endpoints

### New Endpoints

| Method | Route | Description | Access |
|--------|-------|-------------|--------|
| GET | `/api/approvals` | List pending approvals with SOP summary | Admin |
| GET | `/api/approvals/:id` | Get approval with full SOP details | Admin |
| GET | `/api/approvals/:id/changes` | Get structured diff for approval | Admin |

### Response Examples

**GET /api/approvals**
```json
{
  "approvals": [
    {
      "id": 1,
      "sop_id": 12,
      "sop_number": "SOP-0012",
      "process_name": "Forklift Safety Procedure",
      "department": "Warehouse",
      "requested_by": { "id": 5, "name": "John Smith" },
      "requested_at": "2026-02-11T14:34:00Z",
      "change_count": 4,
      "change_summary": "Updated safety requirements for section 3"
    }
  ]
}
```

**GET /api/approvals/:id/changes**
```json
{
  "approval_id": 1,
  "sop_id": 12,
  "version": 3,
  "previous_version": 2,
  "changes": [
    {
      "type": "modified",
      "category": "step",
      "field": "step_3_action",
      "label": "Step 3: Description updated",
      "before": "Inspect forklift visually",
      "after": "Inspect forklift visually and check fluid levels"
    }
  ]
}
```

## Access Control

| Route | Access |
|-------|--------|
| `/approvals` | Admin only - redirect non-admins to dashboard |
| `/approvals/:id` | Admin only |
| `GET /api/approvals` | Admin only - 403 for non-admins |
| `GET /api/approvals/:id` | Admin only |
| `GET /api/approvals/:id/changes` | Admin only |

## Changes to Existing Step 9

The current Step 9 ("History & Approvals") will be simplified:

### Stays in Step 9
- Version history list (view/restore past versions)
- "Save Version" button
- "Submit for Approval" button (for draft/review SOPs)
- Approval history log (past approvals/rejections with comments)

### Removed from Step 9
- Approve/Reject buttons (admins now use Approval Dashboard)
- The "Pending Approval" card with admin actions

### Changes
- When status is `pending_approval`, show read-only notice: "This SOP is pending approval. An admin will review it shortly."
- Submitter can view but not edit while pending

## Files to Create/Modify

### New Files
- `SOP/src/pages/Approvals.tsx` - List view with tabs
- `SOP/src/pages/ApprovalDetail.tsx` - Single SOP review page
- `server/src/routes/approvals.ts` - New API routes

### Modified Files
- `SOP/src/App.tsx` - Add routes for `/approvals` and `/approvals/:id`
- `SOP/src/components/Layout.tsx` or navigation component - Add "Approvals" nav link (admin only)
- `SOP/src/pages/SOPDetail.tsx` - Remove admin approval controls from Step 9
- `SOP/src/api/client.ts` - Add approval API methods

## Post-Approval Behavior

- Show success toast: "SOP-0012 approved" or "SOP-0012 rejected"
- Return to approvals list
- List automatically refreshes (removed the processed item)

## Future Enhancements (Kanban Phase)

The Kanban tab placeholder sets up for:
- Visual pipeline columns: Pending → In Review → Approved/Rejected
- Assignment: "Assign SOP-001 review to Marc"
- `assigned_to` field on approvals
- "In Review" status when assigned
- Drag-and-drop between columns
- Filter by assignee
