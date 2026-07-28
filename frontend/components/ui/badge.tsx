import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const variants: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  muted: 'bg-gray-50 text-gray-500',
};

export function Badge({
  className,
  variant = 'default',
  children,
}: {
  className?: string;
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    draft: 'muted',
    in_progress: 'info',
    completed: 'success',
    rejected: 'danger',
    cancelled: 'muted',
    pending: 'warning',
    approved: 'success',
    returned: 'warning',
    published: 'success',
    archived: 'muted',
  };
  return map[status] ?? 'default';
}
