import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';
import type { SOPStatus } from '../types';

interface DroppableColumnProps {
  status: SOPStatus;
  title: string;
  count: number;
  badgeColor: string;
  children: ReactNode;
  isDroppable: boolean;
}

export function DroppableColumn({
  status,
  title,
  count,
  badgeColor,
  children,
  isDroppable,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { status },
    disabled: !isDroppable,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-50 rounded-lg p-4 transition-all ${
        isOver && isDroppable
          ? 'ring-2 ring-esi-blue ring-opacity-50 bg-blue-50'
          : ''
      } ${!isDroppable ? 'opacity-75' : ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className={`${badgeColor} px-2 py-0.5 rounded-full text-xs font-medium`}>
          {count}
        </span>
      </div>
      <div className="space-y-3 min-h-[100px]">{children}</div>
      {!isDroppable && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          {status === 'pending_approval'
            ? 'Use approval workflow'
            : status === 'active'
            ? 'Requires approval'
            : 'Cannot drop here'}
        </div>
      )}
    </div>
  );
}
