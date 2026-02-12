interface StatusBadgeProps {
  status: string;
  label?: string;
  color?: string;
}

// Color mapping for badge styles
const colorStyles: Record<string, string> = {
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  red: 'bg-red-100 text-red-800 border-red-300',
  blue: 'bg-blue-100 text-blue-800 border-blue-300',
  green: 'bg-green-100 text-green-800 border-green-300',
  gray: 'bg-gray-100 text-gray-800 border-gray-300',
  purple: 'bg-purple-100 text-purple-800 border-purple-300',
  pink: 'bg-pink-100 text-pink-800 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  teal: 'bg-teal-100 text-teal-800 border-teal-300',
  orange: 'bg-orange-100 text-orange-800 border-orange-300',
};

// Fallback configuration for when workflow config isn't loaded
const fallbackConfig: Record<string, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'yellow' },
  active: { label: 'Active', color: 'green' },
  review: { label: 'Review', color: 'red' },
  pending_approval: { label: 'Pending Approval', color: 'blue' },
};

export function StatusBadge({ status, label, color }: StatusBadgeProps) {
  // Use provided values or fall back to defaults
  const fallback = fallbackConfig[status] || { label: status, color: 'gray' };
  const displayLabel = label || fallback.label;
  const displayColor = color || fallback.color;

  const colorClass = colorStyles[displayColor] || colorStyles.gray;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      {displayLabel}
    </span>
  );
}
