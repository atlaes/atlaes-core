'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import accountApi, {
  AccountCase,
  UploadLetterInput,
  httpStatus,
} from '@/lib/account-api';

export const accountKeys = {
  all: ['account'] as const,
  case: () => [...accountKeys.all, 'case'] as const,
};

export function useAccountCaseQuery(enabled: boolean) {
  return useQuery({
    queryKey: accountKeys.case(),
    queryFn: () => accountApi.getCase(),
    enabled,
    retry: (count, error) => {
      const status = httpStatus(error);
      if (status === 401 || status === 404) return false;
      return count < 2;
    },
  });
}

export type AccountView =
  | { state: 'loading' }
  | { state: 'unauthenticated' }
  | { state: 'empty' }
  | { state: 'error'; error: unknown; retry: () => void }
  | { state: 'ready'; data: AccountCase; refetch: () => void };

/**
 * Auth gate + case query for every `/account` screen. Redirects to `/auth`
 * like the dashboard when the session is gone; 404 (no case yet) becomes
 * the `empty` state.
 */
export function useAccountView(redirectTo = '/account'): AccountView {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const query = useAccountCaseQuery(!authLoading && !!user);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth?redirect=' + encodeURIComponent(redirectTo));
    }
  }, [authLoading, user, router, redirectTo]);

  if (authLoading) return { state: 'loading' };
  if (!user) return { state: 'unauthenticated' };
  if (query.isLoading || query.isPending) return { state: 'loading' };
  if (query.isError) {
    const status = httpStatus(query.error);
    if (status === 401) return { state: 'unauthenticated' };
    if (status === 404) return { state: 'empty' };
    return {
      state: 'error',
      error: query.error,
      retry: () => {
        void query.refetch();
      },
    };
  }
  if (!query.data) return { state: 'empty' };
  return {
    state: 'ready',
    data: query.data,
    refetch: () => {
      void query.refetch();
    },
  };
}

export function useUploadLetterMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadLetterInput) => accountApi.uploadLetter(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}

export function useUploadTaskDocumentsMutation(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) =>
      accountApi.uploadTaskDocuments(taskId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
