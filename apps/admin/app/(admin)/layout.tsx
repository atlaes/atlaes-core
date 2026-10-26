'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeForRole, useAuth } from '@/contexts/AuthContext';
import { AdminShell } from '@/components/AdminShell';
import { Spinner } from '@/components/ui';

/** Ops side: admins only. Firm users are sent to their portal. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace('/');
    else if (!isAdmin) router.replace(homeForRole(user?.role));
  }, [isLoading, isAuthenticated, isAdmin, user?.role, router]);

  if (isLoading || !isAdmin) return <Spinner full />;
  return <AdminShell>{children}</AdminShell>;
}
