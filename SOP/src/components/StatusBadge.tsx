interface StatusBadgeProps {
  status: 'draft' | 'active' | 'review';
}

const statusConfig = {
  draft: {
    label: 'Draft',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-800 border-green-300',
  },
  review: {
    label: 'Review',
    className: 'bg-red-100 text-red-800 border-red-300',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}
