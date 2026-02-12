import type { SOPStatus, User, SOP } from '../types';

// Status transition rules for drag-and-drop
// - Cannot drag to pending_approval (must use submit workflow)
// - Cannot drag to active (must be approved)
// - Cannot drag from pending_approval (must use approval workflow)
// - Only admins can drag from active to review

type StatusTransition = {
  from: SOPStatus;
  to: SOPStatus;
  requiresAdmin: boolean;
};

const allowedTransitions: StatusTransition[] = [
  { from: 'draft', to: 'review', requiresAdmin: false },
  { from: 'review', to: 'draft', requiresAdmin: false },
  { from: 'active', to: 'review', requiresAdmin: true },
];

export function isTransitionAllowed(
  from: SOPStatus,
  to: SOPStatus,
  isAdmin: boolean
): boolean {
  const transition = allowedTransitions.find(
    (t) => t.from === from && t.to === to
  );

  if (!transition) return false;
  if (transition.requiresAdmin && !isAdmin) return false;

  return true;
}

export function canDrag(sop: SOP, user: User | null): boolean {
  if (!user) return false;

  // Cannot drag SOPs in pending_approval status
  if (sop.status === 'pending_approval') return false;

  // Admins can drag any SOP (except pending_approval)
  if (user.role === 'admin') return true;

  // Non-admins cannot drag active SOPs
  if (sop.status === 'active') return false;

  // Non-admins can only drag SOPs they created or are assigned to
  return sop.created_by === user.id || sop.assigned_to === user.id;
}

export function getDroppableStatuses(
  fromStatus: SOPStatus,
  isAdmin: boolean
): SOPStatus[] {
  return allowedTransitions
    .filter((t) => t.from === fromStatus && (!t.requiresAdmin || isAdmin))
    .map((t) => t.to);
}

export function isDroppableColumn(
  targetStatus: SOPStatus,
  draggedSopStatus: SOPStatus,
  isAdmin: boolean
): boolean {
  return isTransitionAllowed(draggedSopStatus, targetStatus, isAdmin);
}
