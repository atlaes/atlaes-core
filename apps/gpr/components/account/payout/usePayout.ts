'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { httpStatus } from '@/lib/account-api';
import payoutApi, { type PayoutState } from '@/lib/payout-api';

export const payoutKeys = {
  all: ['payout'] as const,
  state: () => [...payoutKeys.all, 'state'] as const,
  routes: (id: string) => [...payoutKeys.all, 'routes', id] as const,
  ze: (id: string) => [...payoutKeys.all, 'ze', id] as const,
};

export function usePayoutStateQuery(enabled = true) {
  return useQuery({
    queryKey: payoutKeys.state(),
    queryFn: () => payoutApi.getState(),
    enabled,
    retry: (count, error) => {
      const s = httpStatus(error);
      if (s === 401 || s === 404) return false;
      return count < 2;
    },
  });
}

export type PayoutView =
  | { state: 'loading' }
  | { state: 'empty' }
  | { state: 'error'; error: unknown; retry: () => void }
  | { state: 'ready'; data: PayoutState };

/** Auth gate + payout state for every `/account/payout` screen. */
export function usePayoutView(redirectTo: string): PayoutView {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const query = usePayoutStateQuery(!isLoading && !!user);
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(redirectTo));
    }
  }, [isLoading, user, router, redirectTo]);
  if (isLoading || !user || query.isPending) return { state: 'loading' };
  if (query.isError) {
    if (httpStatus(query.error) === 404) return { state: 'empty' };
    return {
      state: 'error',
      error: query.error,
      retry: () => {
        void query.refetch();
      },
    };
  }
  return { state: 'ready', data: query.data };
}

export function useInvalidatePayout() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: payoutKeys.all }),
      qc.invalidateQueries({ queryKey: ['account'] }),
    ]);
}

export function useConfirmDecision() {
  const invalidate = useInvalidatePayout();
  return useMutation({
    mutationFn: (decisionId: string) => payoutApi.confirmDecision(decisionId),
    onSuccess: () => invalidate(),
  });
}

export function useReportMissing() {
  const invalidate = useInvalidatePayout();
  return useMutation({
    mutationFn: (v: {
      decisionId: string;
      description: string;
      files: File[];
    }) => payoutApi.reportMissing(v.decisionId, v.description, v.files),
    onSuccess: () => invalidate(),
  });
}
