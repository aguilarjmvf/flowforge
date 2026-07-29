'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '⊞' },
  { href: '/dashboard/tasks', label: 'My Tasks', icon: '✓' },
  { href: '/dashboard/requests', label: 'My Requests', icon: '📄' },
];

const adminItems = [
  { href: '/dashboard/admin/workflows', label: 'Workflows', icon: '⚙' },
  { href: '/dashboard/admin/forms', label: 'Forms', icon: '📝' },
  { href: '/dashboard/admin/users', label: 'Users', icon: '👥' },
  { href: '/dashboard/admin/roles', label: 'Roles', icon: '🔑' },
  { href: '/dashboard/reports', label: 'Reports', icon: '📊' },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: '📋' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, hasPermission } = useAuth();

  const isAdmin = user?.isSuperAdmin || hasPermission('users.view');

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">F</div>
          <span className="font-bold text-lg tracking-tight">FlowForge</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Workflow Automation</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} />
        ))}

        {isAdmin && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Administration</p>
            </div>
            {adminItems.map((item) => (
              <NavLink key={item.href} {...item} active={pathname === item.href || pathname.startsWith(item.href + '/')} />
            ))}
          </>
        )}
      </nav>

      {/* User */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-700">
          <Link href="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-medium group-hover:bg-blue-500 transition-colors">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-gray-400 truncate">View profile</p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
}

function NavLink({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
        active
          ? 'bg-blue-600 text-white'
          : 'text-gray-300 hover:bg-gray-800 hover:text-white',
      )}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      {label}
    </Link>
  );
}
