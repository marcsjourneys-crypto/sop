# Approval Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a dedicated admin-only Approval Dashboard with change detection, replacing the current Step 9 approval controls.

**Architecture:** New `/approvals` route with backend API endpoints for listing pending approvals and computing diffs. Frontend uses React components following existing patterns (Layout, StatusBadge). Change detection compares current SOP against previous version snapshot stored in sop_versions.

**Tech Stack:** React, TypeScript, Express, SQLite (better-sqlite3), Tailwind CSS

---

## Task 1: Add TypeScript Types for Approvals

**Files:**
- Modify: `SOP/src/types/index.ts`

**Step 1: Add new types**

Add after `SOPApproval` type (line 34):

```typescript
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
```

**Step 2: Commit**

```bash
git add SOP/src/types/index.ts
git commit -m "feat: add TypeScript types for approval dashboard"
```

---

## Task 2: Create Backend Approvals Router

**Files:**
- Create: `server/src/routes/approvals.ts`
- Modify: `server/src/index.ts`

**Step 1: Create approvals router**

Create `server/src/routes/approvals.ts`:

```typescript
import { Router, Response } from 'express';
import { db } from '../db/schema.js';
import { AuthRequest, authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Admin-only middleware
function adminOnly(req: AuthRequest, res: Response, next: () => void) {
  if (req.user!.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

router.use(adminOnly);

interface ApprovalRow {
  id: number;
  sop_id: number;
  requested_by: number;
  requested_at: string;
  status: string;
  sop_number: string;
  process_name: string | null;
  department: string | null;
  version: number;
  requested_by_name: string;
}

interface VersionRow {
  id: number;
  version_number: number;
  snapshot: string;
  change_summary: string | null;
}

// GET /api/approvals - List all pending approvals
router.get('/', (req: AuthRequest, res: Response) => {
  const approvals = db.prepare(`
    SELECT
      a.id,
      a.sop_id,
      a.requested_by,
      a.requested_at,
      s.sop_number,
      s.process_name,
      s.department,
      s.version,
      u.name as requested_by_name
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    JOIN users u ON a.requested_by = u.id
    WHERE a.status = 'pending'
    ORDER BY a.requested_at DESC
  `).all() as ApprovalRow[];

  // Get change counts for each approval
  const result = approvals.map(approval => {
    const changes = computeChanges(approval.sop_id, approval.version);
    const latestVersion = db.prepare(`
      SELECT change_summary FROM sop_versions
      WHERE sop_id = ? AND version_number = ?
    `).get(approval.sop_id, approval.version) as { change_summary: string | null } | undefined;

    return {
      id: approval.id,
      sop_id: approval.sop_id,
      sop_number: approval.sop_number,
      process_name: approval.process_name,
      department: approval.department,
      requested_by: { id: approval.requested_by, name: approval.requested_by_name },
      requested_at: approval.requested_at,
      change_count: changes.length,
      change_summary: latestVersion?.change_summary || null,
      version: approval.version
    };
  });

  res.json({ approvals: result });
});

// GET /api/approvals/:id - Get single approval with SOP details
router.get('/:id', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const approval = db.prepare(`
    SELECT
      a.id,
      a.sop_id,
      a.requested_by,
      a.requested_at,
      s.sop_number,
      s.process_name,
      s.department,
      s.version,
      u.name as requested_by_name
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    JOIN users u ON a.requested_by = u.id
    WHERE a.id = ? AND a.status = 'pending'
  `).get(id) as ApprovalRow | undefined;

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const changes = computeChanges(approval.sop_id, approval.version);
  const latestVersion = db.prepare(`
    SELECT change_summary FROM sop_versions
    WHERE sop_id = ? AND version_number = ?
  `).get(approval.sop_id, approval.version) as { change_summary: string | null } | undefined;

  res.json({
    id: approval.id,
    sop_id: approval.sop_id,
    sop_number: approval.sop_number,
    process_name: approval.process_name,
    department: approval.department,
    requested_by: { id: approval.requested_by, name: approval.requested_by_name },
    requested_at: approval.requested_at,
    change_count: changes.length,
    change_summary: latestVersion?.change_summary || null,
    version: approval.version,
    changes
  });
});

// GET /api/approvals/:id/changes - Get structured diff
router.get('/:id/changes', (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const approval = db.prepare(`
    SELECT a.sop_id, s.version
    FROM sop_approvals a
    JOIN sops s ON a.sop_id = s.id
    WHERE a.id = ?
  `).get(id) as { sop_id: number; version: number } | undefined;

  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  const changes = computeChanges(approval.sop_id, approval.version);

  res.json({
    approval_id: parseInt(id),
    sop_id: approval.sop_id,
    version: approval.version,
    previous_version: approval.version - 1,
    changes
  });
});

// GET /api/approvals/count - Get pending approval count (for nav badge)
router.get('/count', (req: AuthRequest, res: Response) => {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM sop_approvals WHERE status = 'pending'
  `).get() as { count: number };

  res.json({ count: result.count });
});

interface ChangeItem {
  type: 'added' | 'modified' | 'removed' | 'reordered';
  category: 'metadata' | 'step' | 'responsibility';
  field: string;
  label: string;
  before?: string;
  after?: string;
}

function computeChanges(sopId: number, currentVersion: number): ChangeItem[] {
  const changes: ChangeItem[] = [];

  // Get current and previous version snapshots
  const versions = db.prepare(`
    SELECT version_number, snapshot FROM sop_versions
    WHERE sop_id = ? AND version_number IN (?, ?)
    ORDER BY version_number
  `).all(sopId, currentVersion - 1, currentVersion) as VersionRow[];

  if (versions.length < 2) {
    // No previous version to compare - first submission
    return [{ type: 'added', category: 'metadata', field: 'all', label: 'Initial submission' }];
  }

  const prevSnapshot = JSON.parse(versions[0].snapshot);
  const currSnapshot = JSON.parse(versions[1].snapshot);

  // Compare SOP metadata fields
  const metadataFields = [
    { field: 'purpose', label: 'Purpose' },
    { field: 'scope_applies_to', label: 'Scope (Applies To)' },
    { field: 'scope_not_applies_to', label: 'Scope (Does Not Apply To)' },
    { field: 'tools', label: 'Tools' },
    { field: 'materials', label: 'Materials' },
    { field: 'safety_concerns', label: 'Safety Concerns' },
    { field: 'time_total', label: 'Total Time' },
    { field: 'time_searching', label: 'Searching Time' },
    { field: 'time_changing', label: 'Changing Time' },
    { field: 'time_changeover', label: 'Changeover Time' },
    { field: 'quality_during', label: 'Quality During' },
    { field: 'quality_final', label: 'Quality Final' },
    { field: 'quality_completion_criteria', label: 'Completion Criteria' },
    { field: 'documentation_required', label: 'Documentation Required' },
    { field: 'documentation_signoff', label: 'Documentation Signoff' },
    { field: 'related_documents', label: 'Related Documents' },
  ];

  for (const { field, label } of metadataFields) {
    const prev = prevSnapshot.sop[field] || '';
    const curr = currSnapshot.sop[field] || '';
    if (prev !== curr) {
      changes.push({
        type: 'modified',
        category: 'metadata',
        field,
        label: `${label}: Updated`,
        before: prev || '(empty)',
        after: curr || '(empty)'
      });
    }
  }

  // Compare steps
  const prevSteps = prevSnapshot.steps || [];
  const currSteps = currSnapshot.steps || [];

  const prevStepMap = new Map(prevSteps.map((s: any) => [s.id, s]));
  const currStepMap = new Map(currSteps.map((s: any) => [s.id, s]));

  // Check for added/removed steps
  for (const step of currSteps) {
    if (!prevStepMap.has(step.id)) {
      changes.push({
        type: 'added',
        category: 'step',
        field: `step_${step.step_number}`,
        label: `Step ${step.step_number}: Added`,
        after: step.action_name || step.action || '(new step)'
      });
    }
  }

  for (const step of prevSteps) {
    if (!currStepMap.has(step.id)) {
      changes.push({
        type: 'removed',
        category: 'step',
        field: `step_${step.step_number}`,
        label: `Step ${step.step_number}: Removed`,
        before: step.action_name || step.action || '(step)'
      });
    }
  }

  // Check for modified steps
  for (const currStep of currSteps) {
    const prevStep = prevStepMap.get(currStep.id);
    if (prevStep) {
      const stepFields = ['action_name', 'action', 'who_role', 'tools_used', 'time_for_step', 'standard', 'common_mistakes'];
      for (const field of stepFields) {
        const prev = prevStep[field] || '';
        const curr = currStep[field] || '';
        if (prev !== curr) {
          const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
          changes.push({
            type: 'modified',
            category: 'step',
            field: `step_${currStep.step_number}_${field}`,
            label: `Step ${currStep.step_number}: ${fieldLabel} updated`,
            before: prev || '(empty)',
            after: curr || '(empty)'
          });
        }
      }
    }
  }

  // Compare responsibilities
  const prevResps = prevSnapshot.responsibilities || [];
  const currResps = currSnapshot.responsibilities || [];

  const prevRespMap = new Map(prevResps.map((r: any) => [r.id, r]));
  const currRespMap = new Map(currResps.map((r: any) => [r.id, r]));

  for (const resp of currResps) {
    if (!prevRespMap.has(resp.id)) {
      changes.push({
        type: 'added',
        category: 'responsibility',
        field: `resp_${resp.id}`,
        label: `Responsibility: ${resp.role_name || 'New role'} added`,
        after: resp.responsibility_description || ''
      });
    }
  }

  for (const resp of prevResps) {
    if (!currRespMap.has(resp.id)) {
      changes.push({
        type: 'removed',
        category: 'responsibility',
        field: `resp_${resp.id}`,
        label: `Responsibility: ${resp.role_name || 'Role'} removed`,
        before: resp.responsibility_description || ''
      });
    }
  }

  for (const currResp of currResps) {
    const prevResp = prevRespMap.get(currResp.id);
    if (prevResp) {
      if (prevResp.role_name !== currResp.role_name || prevResp.responsibility_description !== currResp.responsibility_description) {
        changes.push({
          type: 'modified',
          category: 'responsibility',
          field: `resp_${currResp.id}`,
          label: `Responsibility: ${currResp.role_name || 'Role'} modified`,
          before: `${prevResp.role_name}: ${prevResp.responsibility_description}`,
          after: `${currResp.role_name}: ${currResp.responsibility_description}`
        });
      }
    }
  }

  return changes;
}

export default router;
```

**Step 2: Register the router in server/src/index.ts**

Add import after line 12:
```typescript
import approvalsRoutes from './routes/approvals.js';
```

Add route after line 35:
```typescript
app.use('/api/approvals', approvalsRoutes);
```

**Step 3: Commit**

```bash
git add server/src/routes/approvals.ts server/src/index.ts
git commit -m "feat: add backend approvals API with change detection"
```

---

## Task 3: Add Frontend API Client Methods

**Files:**
- Modify: `SOP/src/api/client.ts`

**Step 1: Add approvals API methods**

Add after the `sops` export (after line 127):

```typescript
// Approvals (admin)
export const approvals = {
  list: () => request<{ approvals: PendingApproval[] }>('/approvals'),
  get: (id: number) => request<ApprovalDetail>(`/approvals/${id}`),
  getChanges: (id: number) => request<{ approval_id: number; sop_id: number; version: number; previous_version: number; changes: ChangeItem[] }>(`/approvals/${id}/changes`),
  getCount: () => request<{ count: number }>('/approvals/count'),
  approve: (sopId: number, approvalId: number, comments?: string) =>
    request<{ message: string }>(`/sops/${sopId}/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),
  reject: (sopId: number, approvalId: number, comments: string) =>
    request<{ message: string }>(`/sops/${sopId}/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    }),
};
```

**Step 2: Add imports at top of file**

Update import on line 1:
```typescript
import type { User, SOP, SOPStep, SOPResponsibility, SOPTroubleshooting, SOPRevision, SOPVersion, SOPApproval, Questionnaire, ShadowingObservation, Settings, PendingApproval, ApprovalDetail, ChangeItem } from '../types';
```

**Step 3: Commit**

```bash
git add SOP/src/api/client.ts
git commit -m "feat: add approvals API client methods"
```

---

## Task 4: Create Approvals List Page

**Files:**
- Create: `SOP/src/pages/Approvals.tsx`

**Step 1: Create the Approvals page component**

Create `SOP/src/pages/Approvals.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { approvals } from '../api/client';
import type { PendingApproval } from '../types';

export function Approvals() {
  const navigate = useNavigate();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'kanban'>('list');

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    try {
      setLoading(true);
      const data = await approvals.list();
      setPendingApprovals(data.approvals);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }

  function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading approvals...</div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
          {pendingApprovals.length > 0 && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {pendingApprovals.length} pending
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'list'
                  ? 'border-esi-blue text-esi-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setActiveTab('kanban')}
              className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kanban'
                  ? 'border-esi-blue text-esi-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Kanban
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'list' ? (
          pendingApprovals.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✓</div>
              <h3 className="text-lg font-medium text-gray-900">No pending approvals</h3>
              <p className="text-gray-500 mt-1">All SOPs have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovals.map((approval) => (
                <div
                  key={approval.id}
                  onClick={() => navigate(`/approvals/${approval.id}`)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:border-esi-blue hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-500">{approval.sop_number}</span>
                        <span className="text-gray-300">·</span>
                        <span className="font-medium text-gray-900">{approval.process_name || 'Untitled SOP'}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Department: {approval.department || 'Not specified'} · {approval.change_count} change{approval.change_count !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        Submitted by {approval.requested_by.name} · {formatRelativeTime(approval.requested_at)}
                      </div>
                      {approval.change_summary && (
                        <div className="text-sm text-gray-600 mt-2 italic">
                          "{approval.change_summary}"
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Kanban placeholder */
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
            <div className="text-4xl mb-4">🚧</div>
            <h3 className="text-lg font-medium text-gray-900">Kanban view coming soon</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto">
              This will include:
            </p>
            <ul className="text-gray-500 mt-2 text-sm">
              <li>• Visual pipeline (Pending → In Review → Done)</li>
              <li>• Assign reviews to team members</li>
              <li>• Drag-and-drop workflow</li>
            </ul>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

**Step 2: Commit**

```bash
git add SOP/src/pages/Approvals.tsx
git commit -m "feat: add Approvals list page with tabs"
```

---

## Task 5: Create Approval Detail Page

**Files:**
- Create: `SOP/src/pages/ApprovalDetail.tsx`

**Step 1: Create the ApprovalDetail page component**

Create `SOP/src/pages/ApprovalDetail.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { approvals } from '../api/client';
import type { ApprovalDetail as ApprovalDetailType, ChangeItem } from '../types';

export function ApprovalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [approval, setApproval] = useState<ApprovalDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApproval();
  }, [id]);

  async function loadApproval() {
    if (!id) return;
    try {
      setLoading(true);
      const data = await approvals.get(parseInt(id));
      setApproval(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!approval) return;
    try {
      setSubmitting(true);
      await approvals.approve(approval.sop_id, approval.id, comments || undefined);
      navigate('/approvals', { state: { message: `${approval.sop_number} approved` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (!approval) return;
    if (!comments.trim()) {
      setError('Comments are required when rejecting');
      return;
    }
    try {
      setSubmitting(true);
      await approvals.reject(approval.sop_id, approval.id, comments);
      navigate('/approvals', { state: { message: `${approval.sop_number} rejected` } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
      setSubmitting(false);
    }
  }

  function toggleChange(field: string) {
    setExpandedChanges(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  function getChangeIcon(type: ChangeItem['type']): string {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '−';
      case 'modified': return '~';
      case 'reordered': return '↕';
      default: return '•';
    }
  }

  function getChangeColor(type: ChangeItem['type']): string {
    switch (type) {
      case 'added': return 'text-green-600 bg-green-50';
      case 'removed': return 'text-red-600 bg-red-50';
      case 'modified': return 'text-blue-600 bg-blue-50';
      case 'reordered': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading approval...</div>
        </div>
      </Layout>
    );
  }

  if (error && !approval) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </Layout>
    );
  }

  if (!approval) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-500">
          Approval not found
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          to="/approvals"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Approvals
        </Link>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-gray-500">{approval.sop_number}</span>
                <span className="text-gray-300">·</span>
                <span className="text-xl font-medium text-gray-900">{approval.process_name || 'Untitled SOP'}</span>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">v{approval.version}</span>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Submitted by {approval.requested_by.name} · {formatDate(approval.requested_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Changes */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Changes in this version ({approval.changes.length})
          </h2>

          {approval.changes.length === 0 ? (
            <p className="text-gray-500">No changes detected.</p>
          ) : (
            <div className="space-y-2">
              {approval.changes.map((change) => (
                <div key={change.field} className="border border-gray-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleChange(change.field)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left"
                  >
                    <span className={`w-6 h-6 flex items-center justify-center rounded font-mono text-sm ${getChangeColor(change.type)}`}>
                      {getChangeIcon(change.type)}
                    </span>
                    <span className="flex-1 text-gray-900">{change.label}</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${expandedChanges.has(change.field) ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {expandedChanges.has(change.field) && (change.before || change.after) && (
                    <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        {change.before && (
                          <div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Before</div>
                            <div className="text-red-700 bg-red-50 p-2 rounded border border-red-100 whitespace-pre-wrap">
                              {change.before}
                            </div>
                          </div>
                        )}
                        {change.after && (
                          <div>
                            <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">After</div>
                            <div className="text-green-700 bg-green-50 p-2 rounded border border-green-100 whitespace-pre-wrap">
                              {change.after}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* View Full SOP */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Link
            to={`/sop/${approval.sop_id}`}
            target="_blank"
            className="inline-flex items-center text-esi-blue hover:underline"
          >
            View Full SOP
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Comments & Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comments {comments.trim() === '' && <span className="text-gray-400 font-normal">(required for rejection)</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-esi-blue focus:border-esi-blue"
            placeholder="Add comments..."
          />

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

**Step 2: Commit**

```bash
git add SOP/src/pages/ApprovalDetail.tsx
git commit -m "feat: add ApprovalDetail page with expandable diffs"
```

---

## Task 6: Add Routes to App.tsx

**Files:**
- Modify: `SOP/src/App.tsx`

**Step 1: Import new pages**

Add imports after line 9:
```typescript
import { Approvals } from './pages/Approvals';
import { ApprovalDetail } from './pages/ApprovalDetail';
```

**Step 2: Add routes**

Add after line 57 (after the admin/users route):
```typescript
      <Route path="/approvals" element={<ProtectedRoute adminOnly><Approvals /></ProtectedRoute>} />
      <Route path="/approvals/:id" element={<ProtectedRoute adminOnly><ApprovalDetail /></ProtectedRoute>} />
```

**Step 3: Commit**

```bash
git add SOP/src/App.tsx
git commit -m "feat: add routes for approval pages"
```

---

## Task 7: Add Approvals Nav Link with Badge

**Files:**
- Modify: `SOP/src/components/Layout.tsx`

**Step 1: Add state and effect for approval count**

Add imports at top:
```typescript
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
```

After line 8 (after `const location = useLocation();`), add:
```typescript
  const [approvalCount, setApprovalCount] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      fetch('/api/approvals/count', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setApprovalCount(data.count))
        .catch(() => setApprovalCount(0));
    }
  }, [isAdmin, location.pathname]);
```

**Step 2: Add Approvals link**

After the Dashboard link (after line 35), within the admin check block, add:
```typescript
              {isAdmin && (
                <>
                  <Link
                    to="/approvals"
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                      location.pathname.startsWith('/approvals') ? 'bg-white/20' : 'hover:bg-white/10'
                    }`}
                  >
                    Approvals
                    {approvalCount > 0 && (
                      <span className="bg-white/20 text-white px-1.5 py-0.5 rounded-full text-xs">
                        {approvalCount}
                      </span>
                    )}
                  </Link>
```

Move the existing Users and Settings links inside this block (they're already in an isAdmin block).

**Step 3: Commit**

```bash
git add SOP/src/components/Layout.tsx
git commit -m "feat: add Approvals nav link with pending count badge"
```

---

## Task 8: Simplify Step 9 in SOPDetail

**Files:**
- Modify: `SOP/src/pages/SOPDetail.tsx`

**Step 1: Find the Step 9 approval section**

In Step 9, locate the section that shows Approve/Reject buttons for admins (around lines 800-850).

**Step 2: Replace admin approval controls with notice**

Find the block that shows approve/reject buttons when `status === 'pending_approval' && isAdmin`, and replace with:

```typescript
{status === 'pending_approval' && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <div className="flex items-center gap-2 text-blue-700">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium">Pending Approval</span>
    </div>
    <p className="text-blue-600 text-sm mt-1">
      This SOP is pending approval. {isAdmin ? (
        <Link to="/approvals" className="underline hover:no-underline">
          Review in Approval Dashboard
        </Link>
      ) : (
        'An admin will review it shortly.'
      )}
    </p>
  </div>
)}
```

Remove the approve/reject buttons and the approval form that was previously shown to admins.

**Step 3: Add Link import if needed**

Ensure `Link` is imported from `react-router-dom` at the top of the file.

**Step 4: Commit**

```bash
git add SOP/src/pages/SOPDetail.tsx
git commit -m "feat: simplify Step 9, move approval controls to dashboard"
```

---

## Task 9: Test the Implementation

**Step 1: Build and run**

```bash
cd server && npm run build && npm start
```

In another terminal:
```bash
cd SOP && npm run dev
```

**Step 2: Manual testing checklist**

- [ ] Login as admin
- [ ] Verify "Approvals" link appears in nav
- [ ] Submit an SOP for approval (create draft, submit)
- [ ] Verify badge count increases
- [ ] Click Approvals, verify list shows the pending SOP
- [ ] Click into detail view, verify changes are shown
- [ ] Expand a change, verify before/after displays
- [ ] Click "View Full SOP", verify opens in new tab
- [ ] Add comments and approve
- [ ] Verify toast/redirect and SOP is now active
- [ ] Test rejection (requires comments)
- [ ] Login as non-admin, verify Approvals link is hidden
- [ ] Verify Step 9 shows read-only notice for pending SOPs

**Step 3: Commit final**

```bash
git add -A
git commit -m "test: verify approval dashboard implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | TypeScript types | `SOP/src/types/index.ts` |
| 2 | Backend router | `server/src/routes/approvals.ts`, `server/src/index.ts` |
| 3 | API client | `SOP/src/api/client.ts` |
| 4 | Approvals list page | `SOP/src/pages/Approvals.tsx` |
| 5 | Approval detail page | `SOP/src/pages/ApprovalDetail.tsx` |
| 6 | Routes | `SOP/src/App.tsx` |
| 7 | Nav link with badge | `SOP/src/components/Layout.tsx` |
| 8 | Simplify Step 9 | `SOP/src/pages/SOPDetail.tsx` |
| 9 | Test | Manual verification |
