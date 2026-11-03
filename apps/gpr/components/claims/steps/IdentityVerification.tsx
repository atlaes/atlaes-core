'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Info,
} from 'lucide-react';
import ClaimsStepContainer from '../ClaimsStepContainer';
import AuthoritySelector from '../AuthoritySelector';
import DocumentUpload from '../DocumentUpload';
import ErrorNotice from '../ErrorNotice';
import {
  useClaimQuery,
  useClaimDocumentsQuery,
  useUpdateClaimMutation,
  useCompleteStepMutation,
  useUploadDocumentMutation,
  useRemoveDocumentMutation,
} from '@/lib/queries/claims-queries';
import { useClaimsStore } from '@/lib/stores/claims-store';
import claimsApi, { CertifyingAuthority } from '@/lib/claims-api';
import { apiErrorMessage } from '@/lib/api';

// The identity confirmation form is the DRV's A1002 (certificate of life
// and nationality): GET /claims/:id/forms/a1002 returns it with Part A
// pre-filled, in English, Spanish or Portuguese by country of residence.
// Downloading is offered, not required (a client may already have one).
type SubStep = 'download' | 'instructions' | 'authority' | 'upload';

const SUB_STEPS: { id: SubStep; title: string }[] = [
  { id: 'download', title: 'Download Form' },
  { id: 'instructions', title: 'Instructions' },
  { id: 'authority', title: 'Select Authority' },
  { id: 'upload', title: 'Upload Document' },
];

interface IdentityVerificationProps {
  claimId: string;
}

export default function IdentityVerification({
  claimId,
}: IdentityVerificationProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { data: documents } = useClaimDocumentsQuery(claimId);
  const updateMutation = useUpdateClaimMutation();
  const completeMutation = useCompleteStepMutation();
  const uploadMutation = useUploadDocumentMutation();
  const removeMutation = useRemoveDocumentMutation();
  const { goToNextStep, goToPreviousStep } = useClaimsStore();

  const [currentSubStep, setCurrentSubStep] = useState<SubStep>('download');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [selectedAuthority, setSelectedAuthority] =
    useState<CertifyingAuthority | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Initialize from claim data (identityCertifyingAuthority, separate from
  // the signature's certifyingAuthority)
  useEffect(() => {
    if (claim?.idVerificationAuthority) {
      setSelectedAuthority(claim.idVerificationAuthority);
    }
  }, [claim?.idVerificationAuthority]);

  // Find existing certified ID form document
  const certifiedIdDoc = documents?.find(
    (doc) => doc.documentRole === 'certified_id_form'
  );

  const currentSubStepIndex = SUB_STEPS.findIndex(
    (s) => s.id === currentSubStep
  );

  const handleSubStepNext = () => {
    const nextIndex = currentSubStepIndex + 1;
    if (nextIndex < SUB_STEPS.length) {
      setCurrentSubStep(SUB_STEPS[nextIndex].id);
    }
  };

  const handleSubStepBack = () => {
    const prevIndex = currentSubStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentSubStep(SUB_STEPS[prevIndex].id);
    } else {
      goToPreviousStep();
    }
  };

  const handleDownload = async () => {
    setDownloadError(null);
    setIsDownloading(true);
    try {
      const { blob, fileName } = await claimsApi.downloadA1002(claimId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloaded(true);
    } catch (error) {
      setDownloadError(
        apiErrorMessage(error, 'Could not download the form. Please try again.')
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    try {
      await uploadMutation.mutateAsync({
        claimId,
        file,
        role: 'certified_id_form',
      });
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'Upload failed'));
      throw error;
    }
  };

  // Detaches the file from the claim (DELETE /claims/:id/documents/:docId).
  const handleRemove = async () => {
    if (!certifiedIdDoc) return;
    setUploadError(null);
    try {
      await removeMutation.mutateAsync({
        claimId,
        documentId: certifiedIdDoc.documentId,
      });
    } catch (error) {
      setUploadError(apiErrorMessage(error, 'Could not remove the file'));
    }
  };

  const handleContinue = async () => {
    if (!selectedAuthority || !certifiedIdDoc) return;
    setStepError(null);

    try {
      await updateMutation.mutateAsync({
        claimId,
        data: { idVerificationAuthority: selectedAuthority },
      });

      await completeMutation.mutateAsync({
        claimId,
        stepName: 'identityConfirmationForm',
      });
      goToNextStep();
    } catch (error) {
      setStepError(
        apiErrorMessage(error, 'Could not save this step. Please try again.')
      );
    }
  };

  const isSubmitting = updateMutation.isPending || completeMutation.isPending;

  const renderSubStepContent = () => {
    switch (currentSubStep) {
      case 'download':
        return (
          <div className="claims-sign-download">
            <div className="claims-sign-form-card">
              <div className="claims-sign-form-icon">
                <FileText className="w-8 h-8" />
              </div>
              <div className="claims-sign-form-info">
                <h3>Form A1002: Certificate of Life and Nationality</h3>
                <p>
                  We fill in Part A with the details from your claim. An
                  authority in your country of residence completes Part B and
                  stamps it.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="claims-btn claims-btn-primary"
                disabled={isDownloading}
              >
                <Download className="w-4 h-4" />
                <span>{isDownloading ? 'Preparing...' : 'Download Form'}</span>
              </button>
            </div>

            {downloaded && (
              <div className="claims-success-message">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>
                  Form downloaded. Check your details in Part A before you print
                  it.
                </span>
              </div>
            )}

            <ErrorNotice message={downloadError} />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubStepNext}
                className="claims-btn claims-btn-primary"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'instructions':
        return (
          <div className="claims-sign-instructions">
            <div className="claims-warning-box">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              <div>
                <h4>Important: Section A3</h4>
                <p>
                  Sign in section A3 of the form. The certifying authority must
                  also stamp and sign the document.
                </p>
              </div>
            </div>

            <div className="claims-instructions-list">
              <h4>Instructions:</h4>
              <ol>
                <li>Print the form you downloaded (A1002)</li>
                <li>Check your personal details in Part A</li>
                <li>
                  Bring your passport or national ID to the certifying authority
                </li>
                <li>Sign the form in the presence of the official</li>
                <li>
                  The official will verify your identity and stamp the document
                </li>
                <li>Scan or photograph the completed, stamped document</li>
              </ol>
            </div>

            <div className="claims-info-box">
              <Info className="w-5 h-5 text-blue-500" />
              <p>
                This is often called "certified true copy" or "identity
                certification". The authority confirms they have verified your
                identity matches your documents.
              </p>
            </div>

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubStepNext}
                className="claims-btn claims-btn-primary"
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'authority':
        return (
          <div className="claims-sign-authority">
            <h3>Where will you get your identity certified?</h3>
            <p className="claims-section-description">
              Your identity must be verified and certified by an authorized
              official. Select where you plan to get this done.
            </p>

            <AuthoritySelector
              value={selectedAuthority}
              onChange={setSelectedAuthority}
            />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleSubStepNext}
                className="claims-btn claims-btn-primary"
                disabled={!selectedAuthority}
              >
                <span>Next</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="claims-id-upload">
            <h3>Upload Certified Identity Form</h3>
            <p className="claims-section-description">
              Upload the signed and certified identity confirmation form. Make
              sure the stamp and signatures are clearly visible.
            </p>

            <DocumentUpload
              label="Upload certified form"
              helperText="Ensure the official's stamp and signature are visible"
              accept=".pdf,.jpg,.jpeg,.png"
              maxSizeMB={10}
              currentFile={
                certifiedIdDoc?.fileName
                  ? {
                      name: certifiedIdDoc.fileName,
                      url: certifiedIdDoc.fileUrl,
                    }
                  : null
              }
              onUpload={handleUpload}
              onRemove={handleRemove}
              isUploading={uploadMutation.isPending}
              disabled={removeMutation.isPending}
              error={uploadError || undefined}
            />

            <ErrorNotice message={stepError} />

            <div className="claims-substep-nav">
              <button
                type="button"
                onClick={handleSubStepBack}
                className="claims-btn claims-btn-secondary"
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleContinue}
                className="claims-btn claims-btn-primary"
                disabled={!certifiedIdDoc || !selectedAuthority || isSubmitting}
              >
                <span>{isSubmitting ? 'Saving...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <ClaimsStepContainer
      claimId={claimId}
      stepName="identityConfirmationForm"
      title="Identity Verification"
      description="Have your identity confirmation form certified and upload it."
      hideContinue
      hideBack
    >
      <div className="claims-sign-section">
        {/* Sub-step progress */}
        <div className="claims-substep-progress">
          {SUB_STEPS.map((step, index) => {
            const isActive = step.id === currentSubStep;
            const isComplete = index < currentSubStepIndex;

            return (
              <div
                key={step.id}
                className={`claims-substep-item ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
              >
                <div className="claims-substep-number">
                  {isComplete ? <CheckCircle className="w-4 h-4" /> : index + 1}
                </div>
                <span className="claims-substep-title">{step.title}</span>
              </div>
            );
          })}
        </div>

        {/* Sub-step content */}
        {renderSubStepContent()}
      </div>
    </ClaimsStepContainer>
  );
}
