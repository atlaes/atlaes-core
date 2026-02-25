import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import claimsApi, {
  Claim,
  ClaimDocument,
  ClaimStepName,
  ClaimDocumentRole,
  UpdateClaimRequest,
  UploadDocumentResult,
  ValidationResult,
} from '../claims-api';

// ============================================================================
// Query Keys
// ============================================================================

export const claimsKeys = {
  all: ['claims'] as const,
  lists: () => [...claimsKeys.all, 'list'] as const,
  list: (filters: string) => [...claimsKeys.lists(), { filters }] as const,
  details: () => [...claimsKeys.all, 'detail'] as const,
  detail: (id: string) => [...claimsKeys.details(), id] as const,
  documents: (id: string) => [...claimsKeys.detail(id), 'documents'] as const,
  validation: (id: string) => [...claimsKeys.detail(id), 'validation'] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all claims for the current user
 */
export function useClaimsQuery() {
  return useQuery({
    queryKey: claimsKeys.lists(),
    queryFn: () => claimsApi.getClaims(),
  });
}

/**
 * Get a single claim by ID
 */
export function useClaimQuery(claimId: string | undefined) {
  return useQuery({
    queryKey: claimsKeys.detail(claimId!),
    queryFn: () => claimsApi.getClaim(claimId!),
    enabled: !!claimId,
  });
}

/**
 * Get documents for a claim
 */
export function useClaimDocumentsQuery(claimId: string | undefined) {
  return useQuery({
    queryKey: claimsKeys.documents(claimId!),
    queryFn: () => claimsApi.getDocuments(claimId!),
    enabled: !!claimId,
  });
}

/**
 * Validate a claim for submission
 */
export function useValidateClaimQuery(claimId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: claimsKeys.validation(claimId!),
    queryFn: () => claimsApi.validateClaim(claimId!),
    enabled: !!claimId && enabled,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new claim
 */
export function useCreateClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId?: string) => claimsApi.createClaim({ applicationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: claimsKeys.lists() });
    },
  });
}

/**
 * Update claim fields
 */
export function useUpdateClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data: UpdateClaimRequest }) =>
      claimsApi.updateClaim(claimId, data),
    onSuccess: (updatedClaim, { claimId }) => {
      // Update the cache with the returned claim
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
    },
  });
}

/**
 * Delete a draft claim
 */
export function useDeleteClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => claimsApi.deleteClaim(claimId),
    onSuccess: (_, claimId) => {
      queryClient.removeQueries({ queryKey: claimsKeys.detail(claimId) });
      queryClient.invalidateQueries({ queryKey: claimsKeys.lists() });
    },
  });
}

/**
 * Mark a step as complete
 */
export function useCompleteStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, stepName }: { claimId: string; stepName: ClaimStepName }) =>
      claimsApi.updateStepCompletion(claimId, stepName, true),
    onSuccess: (updatedClaim, { claimId }) => {
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
    },
  });
}

/**
 * Mark a step as incomplete
 */
export function useIncompleteStepMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, stepName }: { claimId: string; stepName: ClaimStepName }) =>
      claimsApi.updateStepCompletion(claimId, stepName, false),
    onSuccess: (updatedClaim, { claimId }) => {
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
    },
  });
}

/**
 * Upload a document (returns OCR data for passport)
 */
export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      claimId,
      file,
      role,
    }: {
      claimId: string;
      file: File;
      role: ClaimDocumentRole;
    }): Promise<UploadDocumentResult> => claimsApi.uploadDocument(claimId, file, role),
    onSuccess: (_, { claimId }) => {
      queryClient.invalidateQueries({ queryKey: claimsKeys.documents(claimId) });
    },
  });
}

/**
 * Remove a document from a claim
 */
export function useRemoveDocumentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, documentId }: { claimId: string; documentId: string }) =>
      claimsApi.removeDocument(claimId, documentId),
    onSuccess: (_, { claimId }) => {
      queryClient.invalidateQueries({ queryKey: claimsKeys.documents(claimId) });
    },
  });
}

/**
 * Attach a signature to a claim
 */
export function useAttachSignatureMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ claimId, signatureData }: { claimId: string; signatureData: string }) =>
      claimsApi.attachSignature(claimId, signatureData),
    onSuccess: (updatedClaim, { claimId }) => {
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
    },
  });
}

/**
 * Record that the identity form was downloaded
 */
export function useRecordIdentityFormDownloadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => claimsApi.recordIdentityFormDownload(claimId),
    onSuccess: (updatedClaim, claimId) => {
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
    },
  });
}

/**
 * Submit a claim
 */
export function useSubmitClaimMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (claimId: string) => claimsApi.submitClaim(claimId),
    onSuccess: (updatedClaim, claimId) => {
      queryClient.setQueryData(claimsKeys.detail(claimId), updatedClaim);
      queryClient.invalidateQueries({ queryKey: claimsKeys.lists() });
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get a document by role from the documents list
 */
export function getDocumentByRole(
  documents: ClaimDocument[] | undefined,
  role: ClaimDocumentRole
): ClaimDocument | undefined {
  return documents?.find((d) => d.documentRole === role);
}

/**
 * Check if a step is complete
 */
export function isStepComplete(
  claim: Claim | undefined,
  stepName: ClaimStepName
): boolean {
  return claim?.completedSteps[stepName] ?? false;
}

/**
 * Get section progress
 */
export function getSectionProgress(
  claim: Claim | undefined,
  sectionId: string,
  sidebarSections: { id: string; steps: { name: ClaimStepName }[] }[]
): { completed: number; total: number } {
  const section = sidebarSections.find((s) => s.id === sectionId);
  if (!section || !claim) return { completed: 0, total: 0 };

  const completed = section.steps.filter(
    (step) => claim.completedSteps[step.name]
  ).length;
  return { completed, total: section.steps.length };
}
