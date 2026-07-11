'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  useOnboarding,
  isConfirmComplete,
  type OnboardingConfirm,
} from '@/contexts/OnboardingContext';

interface ConfirmStepProps {
  // Advance to the Signature step (enabled only when the whole Confirm step is
  // complete — all four answers No and all eight boxes checked).
  onContinue: () => void;
  // Secondary "Back to review" link.
  onBackToReview: () => void;
  // Fire the backend stop endpoint. The parent handles success/failure (toast
  // on failure) — this component shows the stop screen regardless.
  onStop: (reasons: string[]) => void;
  // Reset the whole flow back to the start (from the stop screen CTA).
  onReturnToStart: () => void;
}

type StopAnswerKey =
  | 'publicSectorAfterEnd'
  | 'otherInstitutionInsurance'
  | 'previousRefund'
  | 'laterCivilServant';

const ANSWER_QUESTIONS: { key: StopAnswerKey; label: string }[] = [
  {
    key: 'publicSectorAfterEnd',
    label:
      'Public-sector employment after your compulsory pension insurance ended',
  },
  {
    key: 'otherInstitutionInsurance',
    label:
      'Insurance with another public-sector or church supplementary pension institution',
  },
  {
    key: 'previousRefund',
    label:
      'Previous refund from another public-sector or church supplementary pension institution',
  },
  {
    key: 'laterCivilServant',
    label: 'Later appointment as a German civil servant',
  },
];

type CheckboxKey = keyof OnboardingConfirm;

const DECLARATION_KEYS: CheckboxKey[] = [
  'declarationAccurate',
  'declarationRequestRefund',
  'declarationRightsEnd',
  'declarationNoRepayment',
  'declarationNoWithdrawal',
];

const AUTHORIZATION_ITEMS: { key: CheckboxKey; text: string }[] = [
  {
    key: 'authorizeComplete',
    text: 'I authorize CompanyPension to use the information I provided to complete the documents required for my refund application.',
  },
  {
    key: 'authorizeSignature',
    text: 'I authorize CompanyPension to apply the signature I provide to my refund application and to a limited power of attorney for this refund process.',
  },
  {
    key: 'authorizeCorrespondence',
    text: 'I authorize CompanyPension to receive correspondence from and communicate with my pension institution in connection with this refund application.',
  },
];

// Verbatim, client-provided original German wording per selected institution.
// Keyed by the exact provider label stored in membership.pensionProvider (see
// company-pension-providers.ts). VBL plan variants (VBLklassik / VBLextra) map
// to the VBL text via the startsWith('VBL') normalisation below.
const GERMAN_WORDING: Record<string, string> = {
  VBL: `1. Sind Sie nach Beendigung der Pflichtversicherung bei der VBL bei einem Arbeitgeber des öffentlichen Dienstes beschäftigt?
2. Waren Sie bzw. sind Sie zurzeit bei einer anderen Zusatzversorgungseinrichtung (ZVE) versichert?
3. Sind die Beiträge erstattet worden?
4. Wurden Sie verbeamtet?`,
  'ZVK Darmstadt': `Die Beitragserstattung ist nur zulässig, wenn die Wartezeit von 60 Kalendermonaten zum Ende der Pflichtversicherung noch nicht erfüllt ist.
Erstattete Beiträge können nicht wieder eingezahlt werden.
Erklärung der Antragstellerin / des Antragstellers
Ich habe die vorstehenden Erläuterungen zur Kenntnis genommen.
Ich erkläre ausdrücklich, dass ich nicht bei einer anderen Zusatzversorgungseinrichtung versichert bin.`,
  // RZVK Köln text is also used for ZVK Rheinland (per client).
  'RZVK Köln': `Erklärung:
Ich habe keine Vorversicherungszeiten bei einer anderen öffentlich-rechtlichen Zusatzversorungseinrichtigung, die bisher noch nicht zur RZVK übergeleitet wurden.
Mir ist bekannt, dass
- ich diesen Antrag nicht widerrufen kann
- Rechte aus dieser Versicherung für Zeiten, für die Beitrage erstattet werden, mit der Antragstellung erlöschen,
- erstattete Beitrage nicht wieder eingezahlt werden können.`,
  'ZVK Rheinland': `Erklärung:
Ich habe keine Vorversicherungszeiten bei einer anderen öffentlich-rechtlichen Zusatzversorungseinrichtigung, die bisher noch nicht zur RZVK übergeleitet wurden.
Mir ist bekannt, dass
- ich diesen Antrag nicht widerrufen kann
- Rechte aus dieser Versicherung für Zeiten, für die Beitrage erstattet werden, mit der Antragstellung erlöschen,
- erstattete Beitrage nicht wieder eingezahlt werden können.`,
  'ZVK (KVBW)': `Erklärung des Antragstellers
Ich versichere, dass ich keine weiteren Versicherungszeiten bei einer anderen Zusatzversorgungseinrichtung im öffentlichen oder kirchlichen Dienst habe.
Es ist mir bekannt, dass mit der Beitragserstattung die Rechte und Pflichten aus dieser Versicherung erlöschen und die Beiträge nicht wieder eingezahlt werden können.`,
  'ZVK Kassel (KVK)': `Erklärung der Antragstellerin/ des Antragstellers
Ich beantrage die Erstattung der Beiträge bzw. der erstattungsfähigen Beitragsanteile aus meiner Versicherung.
Mir ist bekannt, dass mit der Beitragserstattung sämtliche Rechte aus der Versicherung für die Zeiten erlöschen, für die Beiträge erstattet werden und diese Beiträge auch nicht wieder eingezahlt werden können.`,
  'ZVK (BayZVK / BVK)': `Erklärung der Antragstellerin/des Antragstellers
Ich versichere, dass ich nicht aufgrund eines neuen Beschäftigungsverhältnisses erneut bei einer anderen Zusatzversorgungskasse des öffentlichen oder kirchlichen Dienstes pflichtversichert bin oder war.
Mir ist bekannt, dass erstattete Beiträge bei einer erneuten (Pflicht-)Versicherung bei einer anderen Zusatzversorgungskasse des öffentlichen oder kirchlichen Dienstes nicht wieder eingezahlt werden können.
Ich beantrage die Erstattung der Beiträge.`,
  'RZVK Saar': `Beachten Sie bitte, dass der Antrag nicht widerrufen werden kann, erstattete Beiträge nicht wieder eingezahlt werden können und mit der Antragsstellung die Rechte aus der Versicherung für Zeiten, für die Beiträge erstattet werden, erlöschen`,
};

// Stage (VddB / VddKO) original German wording — client has NOT provided these
// texts yet. Slot them in here (keyed by 'VddB' / 'VddKO') when supplied; until
// then the German-wording expandable is hidden for stage claimants.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STAGE_GERMAN_WORDING: Record<string, string> = {
  // VddB: `...pending client text...`,
  // VddKO: `...pending client text...`,
};

function germanWordingForProvider(provider: string): string | null {
  if (provider.startsWith('VBL')) {
    return GERMAN_WORDING.VBL;
  }
  return GERMAN_WORDING[provider] ?? null;
}

export const ConfirmStep: React.FC<ConfirmStepProps> = ({
  onContinue,
  onBackToReview,
  onStop,
  onReturnToStart,
}) => {
  const { data, updateConfirm } = useOnboarding();
  const confirm = data.confirm;

  const provider = data.membership.pensionProvider;
  const isStage = provider === 'VddB' || provider === 'VddKO';

  const [editingKeys, setEditingKeys] = useState<Set<StopAnswerKey>>(new Set());
  const [pendingYesKey, setPendingYesKey] = useState<StopAnswerKey | null>(
    null
  );
  const [showStopScreen, setShowStopScreen] = useState(false);
  const [germanExpanded, setGermanExpanded] = useState(false);

  // Checkbox 2 adapts for stage (VddB/VddKO) claims: "public-sector pension
  // institution" → "pension institution".
  const declarationRequestRefundText = isStage
    ? 'I request the refund of the eligible contributions or contribution shares from my pension institution.'
    : 'I request the refund of the eligible contributions or contribution shares from my public-sector pension institution.';

  const declarationText: Record<CheckboxKey, string> = {
    declarationAccurate:
      'I confirm that the information provided in my refund application is correct and complete.',
    declarationRequestRefund: declarationRequestRefundText,
    declarationRightsEnd:
      'I understand that the pension rights connected with the refunded insurance periods will end.',
    declarationNoRepayment:
      'I understand that refunded contributions cannot later be paid back into the pension scheme.',
    declarationNoWithdrawal:
      'I understand that the refund application may no longer be withdrawn once it has been submitted.',
  } as Record<CheckboxKey, string>;

  const toggleEditing = (key: StopAnswerKey) => {
    setEditingKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAnswer = (key: StopAnswerKey, value: 'yes' | 'no') => {
    if (value === 'yes') {
      // Don't commit the Yes yet — confirm via the modal first.
      setPendingYesKey(key);
      return;
    }
    updateConfirm({ [key]: 'no' } as Partial<OnboardingConfirm>);
    setEditingKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const handleConfirmYes = () => {
    if (!pendingYesKey) return;
    const key = pendingYesKey;
    updateConfirm({ [key]: 'yes' } as Partial<OnboardingConfirm>);
    setPendingYesKey(null);
    setShowStopScreen(true);
    // Fire-and-forget backend stop (parent toasts on failure).
    onStop([key]);
  };

  const handleKeepAsNo = () => {
    setPendingYesKey(null);
  };

  const toggleCheckbox = (key: CheckboxKey) => {
    updateConfirm({ [key]: !confirm[key] } as Partial<OnboardingConfirm>);
  };

  const canContinue = isConfirmComplete(confirm);

  // ------------------------------------------------------------------
  // Full-screen stop state — matches the flow's rejection screens
  // (EligibilityResult not-eligible public/stage: red circle + X).
  // ------------------------------------------------------------------
  if (showStopScreen) {
    return (
      <div className="mx-auto flex min-h-[470px] max-w-[620px] flex-col items-center justify-center text-center">
        <div className="mb-9 flex h-[120px] w-[120px] items-center justify-center rounded-full bg-[#F5D4CF]">
          <div className="flex h-[78px] w-[78px] items-center justify-center rounded-full bg-[#B92513]">
            <X className="h-12 w-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <h2 className="mb-4 max-w-[520px] text-[26px] font-bold leading-tight text-[#111827]">
          This refund cannot currently be started with CompanyPension
        </h2>
        <p className="mb-8 max-w-[460px] text-[16px] leading-6 text-[#4B5563]">
          Your deposit will be refunded to the same payment method.
        </p>

        <button
          onClick={onReturnToStart}
          className="flex h-12 w-full max-w-[400px] items-center justify-center gap-2 rounded-[6px] bg-[#9FE870] px-6 text-[16px] font-bold text-[#163300] shadow-sm transition hover:bg-[#8AD860]"
        >
          Return to start
        </button>
      </div>
    );
  }

  const germanWording = germanWordingForProvider(provider);

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-2 text-center text-2xl font-bold text-gray-900">
        Confirm your refund information
      </h2>
      <div className="mx-auto mb-2 h-0.5 w-16 bg-gray-200" />
      <p className="mb-8 text-center text-gray-600">
        Please review your answers and confirm the declarations that will be
        included in your refund application.
      </p>

      {/* Section 1 — Your answers */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Your answers
        </h3>
        <div className="space-y-3">
          {ANSWER_QUESTIONS.map(({ key, label }) => {
            const value = confirm[key];
            const isEditing = editingKeys.has(key);
            return (
              <div
                key={key}
                className="rounded-xl border border-gray-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-gray-700">{label}</p>
                  <button
                    type="button"
                    onClick={() => toggleEditing(key)}
                    className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-[#163300] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>

                {!isEditing ? (
                  <p className="mt-2 text-sm font-semibold text-gray-900">
                    {value === 'yes' ? 'Yes' : 'No'}
                  </p>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {(['no', 'yes'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleSelectAnswer(key, option)}
                        className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                          value === option
                            ? 'border-[#9FE870] bg-[#F0FDE4] text-[#163300]'
                            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {option === 'yes' ? 'Yes' : 'No'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2 — Important declarations */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Important declarations
        </h3>
        <div className="space-y-3">
          {DECLARATION_KEYS.map((key) => (
            <label key={key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!confirm[key]}
                onChange={() => toggleCheckbox(key)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
              />
              <span className="text-sm text-gray-700">
                {declarationText[key]}
              </span>
            </label>
          ))}
        </div>

        {/* Original German wording — dynamic per selected institution.
            Hidden for stage (VddB/VddKO): client texts pending. */}
        {!isStage && germanWording && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setGermanExpanded((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-[#163300] hover:underline"
            >
              View the original German wording
              {germanExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {germanExpanded && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="whitespace-pre-line text-sm leading-6 text-gray-600">
                  {germanWording}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 3 — CompanyPension authorization */}
      <div className="mb-8">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          CompanyPension authorization
        </h3>
        <div className="space-y-3">
          {AUTHORIZATION_ITEMS.map(({ key, text }) => (
            <label key={key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!confirm[key]}
                onChange={() => toggleCheckbox(key)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-[#9FE870] focus:ring-[#9FE870]"
              />
              <span className="text-sm text-gray-700">{text}</span>
            </label>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onContinue}
        disabled={!canContinue}
        className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-4 font-semibold transition-colors ${
          canContinue
            ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
            : 'cursor-not-allowed bg-gray-200 text-gray-500'
        }`}
      >
        Continue to signature
        <ArrowRight className="h-4 w-4" />
      </button>
      <button
        onClick={onBackToReview}
        className="mt-4 w-full text-center text-sm font-medium text-[#163300] hover:underline"
      >
        Back to review
      </button>

      {/* Stop-confirmation modal */}
      {pendingYesKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#F5D4CF]">
                <AlertCircle className="h-5 w-5 text-[#B92513]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                This answer will stop your refund application
              </h3>
            </div>
            <p className="mb-6 text-sm leading-6 text-gray-600">
              CompanyPension cannot currently process this refund if your answer
              is Yes. Are you sure you want to change your answer?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmYes}
                className="w-full rounded-lg bg-[#B92513] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#9E1F10]"
              >
                Yes, change my answer
              </button>
              <button
                onClick={handleKeepAsNo}
                className="w-full rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Keep my answer as No
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmStep;
