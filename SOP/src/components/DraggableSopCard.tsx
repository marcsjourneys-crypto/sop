import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import type { SOP } from '../types';

interface DraggableSopCardProps {
  sop: SOP;
  isDraggable: boolean;
  borderColor: string;
  onAssignClick?: (sop: SOP) => void;
  isAdmin?: boolean;
}

export function DraggableSopCard({
  sop,
  isDraggable,
  borderColor,
  onAssignClick,
  isAdmin,
}: DraggableSopCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sop-${sop.id}`,
    data: { sop },
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor} ${
        isDraggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'z-50' : ''}`}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
    >
      <Link
        to={`/sop/${sop.id}`}
        className="block"
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault();
          }
        }}
      >
        <div className="font-mono text-xs text-gray-500">{sop.sop_number}</div>
        <div className="font-medium text-gray-900 text-sm mt-1">
          {sop.process_name || 'Untitled'}
        </div>
        {sop.department && (
          <div className="text-xs text-gray-500 mt-1">{sop.department}</div>
        )}
      </Link>

      {/* Assigned user badge */}
      <div className="mt-2 flex items-center justify-between">
        {sop.assigned_to_name ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {sop.assigned_to_name}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}

        {isAdmin && onAssignClick && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAssignClick(sop);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="p-1 text-gray-400 hover:text-esi-blue rounded transition-colors"
            title="Assign user"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
