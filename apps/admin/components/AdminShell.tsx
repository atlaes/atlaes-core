'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { FileText, Scale, LogOut, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getStats } from '@/lib/admin-api';

/**
 * Persistent left rail for the ops side. Queues carry their count; the
 * portal link only shows for admins who hold a firm membership (checked by
 * the portal itself, so here it is a plain link).
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: getStats });

  const items = [
    {
      href: '/claims',
      label: 'Claims',
      icon: FileText,
      count: stats.data?.submitted,
      active: pathname.startsWith('/claims'),
    },
    {
      href: '/law-firms',
      label: 'Law firms',
      icon: Scale,
      count: stats.data?.lawFirm,
      active: pathname.startsWith('/law-firms'),
    },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 flex-none flex-col border-r border-gray-200 bg-white md:flex">
        <div className="border-b border-gray-200 px-4 py-4">
          <Link href="/claims" className="block">
            <span className="block text-sm font-semibold text-brand-dark">
              CompanyPension
            </span>
            <span className="block text-xs text-gray-500">Operations</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center justify-between rounded-md px-2.5 py-2 text-sm ${
                it.active
                  ? 'bg-brand-light font-medium text-brand-dark'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <it.icon className="h-4 w-4" />
                {it.label}
              </span>
              {typeof it.count === 'number' && it.count > 0 && (
                <span className="rounded-full bg-gray-100 px-1.5 text-xs tabular-nums text-gray-600">
                  {it.count}
                </span>
              )}
            </Link>
          ))}
          <Link
            href="/portal"
            className="mt-2 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Partner portal
          </Link>
        </nav>
        <div className="border-t border-gray-200 px-4 py-3">
          <p className="truncate text-xs text-gray-500" title={user?.email}>
            {user?.email}
          </p>
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phone header */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2 md:hidden">
          <span className="text-sm font-semibold text-brand-dark">
            CompanyPension
          </span>
          <nav className="flex gap-3 text-sm">
            <Link href="/claims" className="text-gray-700">
              Claims
            </Link>
            <Link href="/law-firms" className="text-gray-700">
              Law firms
            </Link>
            <Link href="/portal" className="text-gray-700">
              Portal
            </Link>
            <button onClick={logout} className="text-gray-500">
              Sign out
            </button>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
