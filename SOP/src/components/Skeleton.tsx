interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200 animate-skeleton bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]';

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton patterns for common use cases
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm border-l-4 border-l-gray-300 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton width={80} height={20} />
        <Skeleton width={60} height={24} variant="rectangular" className="rounded-full" />
      </div>
      <Skeleton width="70%" height={16} />
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton width={100} height={14} />
      </div>
    </div>
  );
}

export function SkeletonKanbanColumn() {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton width={100} height={20} />
        <Skeleton variant="circular" width={24} height={24} />
      </div>
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-gray-50">
        <div className="flex gap-4">
          <Skeleton width="15%" height={16} />
          <Skeleton width="25%" height={16} />
          <Skeleton width="20%" height={16} />
          <Skeleton width="15%" height={16} />
          <Skeleton width="10%" height={16} />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b last:border-b-0">
          <div className="flex gap-4 items-center">
            <Skeleton width="15%" height={14} />
            <Skeleton width="25%" height={14} />
            <Skeleton width="20%" height={14} />
            <Skeleton width="15%" height={14} />
            <Skeleton width={60} height={28} variant="rectangular" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton width={100} height={14} />
        <Skeleton height={40} variant="rectangular" />
      </div>
      <div className="space-y-2">
        <Skeleton width={120} height={14} />
        <Skeleton height={40} variant="rectangular" />
      </div>
      <div className="space-y-2">
        <Skeleton width={80} height={14} />
        <Skeleton height={100} variant="rectangular" />
      </div>
    </div>
  );
}
