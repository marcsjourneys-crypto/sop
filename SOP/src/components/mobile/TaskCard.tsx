import { useNavigate } from 'react-router-dom';
import type { SOP } from '../../types';
import { StatusBadge } from '../StatusBadge';

interface TaskCardProps {
  sop: SOP;
  /** Whether this card is tappable/editable or view-only */
  interactive?: boolean;
}

export function TaskCard({ sop, interactive = true }: TaskCardProps) {
  const navigate = useNavigate();

  const handleTap = () => {
    if (interactive) {
      navigate(`/sop/${sop.id}`);
    }
  };

  // Get border color based on status
  const borderColorClass = {
    draft: 'border-l-yellow-400',
    review: 'border-l-red-400',
    pending_approval: 'border-l-blue-400',
    active: 'border-l-green-400',
  }[sop.status];

  // Calculate progress if steps exist
  const stepCount = sop.steps?.length ?? 0;
  const hasSteps = stepCount > 0;

  // Format relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays === 0) {
      if (diffHours === 0) return 'Just now';
      if (diffHours === 1) return '1 hour ago';
      return `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Determine action text based on status
  const actionText = {
    draft: 'Continue editing',
    review: 'Continue review',
    pending_approval: 'View status',
    active: 'View SOP',
  }[sop.status];

  return (
    <div
      onClick={handleTap}
      className={`
        bg-white rounded-lg shadow-sm border-l-4 ${borderColorClass}
        p-4 min-h-[80px]
        ${interactive ? 'active:bg-gray-50 cursor-pointer' : ''}
        transition-colors
      `}
    >
      {/* Header row: SOP number and status */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-gray-500">{sop.sop_number}</span>
        <StatusBadge status={sop.status} />
      </div>

      {/* Process name */}
      <h3 className="font-semibold text-gray-900 text-base mb-1">
        {sop.process_name || 'Untitled Process'}
      </h3>

      {/* Department and progress */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
        <span>{sop.department || 'No department'}</span>
        {hasSteps && (
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
            {stepCount} steps
          </span>
        )}
      </div>

      {/* Footer: time and action */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {sop.status === 'pending_approval' ? 'Submitted ' : 'Updated '}
          {getRelativeTime(sop.updated_at)}
        </span>
        {interactive && (
          <span className="text-sm text-esi-blue font-medium flex items-center gap-1">
            {actionText}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
