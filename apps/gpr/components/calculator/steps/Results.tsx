'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Info, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useGPRCalculator, GPRCalculationResult, MONTHS } from '@/hooks/useGPRCalculator';
import StepContainer from '../StepContainer';
import apiClient from '@/lib/api';

export default function Results() {
  const router = useRouter();
  const { formData, setCalculationResult, goToPreviousStep } = useGPRCalculator();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDrvTooltip, setShowDrvTooltip] = useState(false);
  const [showSupplementaryTooltip, setShowSupplementaryTooltip] = useState(false);

  useEffect(() => {
    const calculateRefund = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Transform jobs data for API
        const jobs = formData.jobs.map(job => {
          const startMonthIndex = MONTHS.indexOf(job.startMonth) + 1;
          const endMonthIndex = MONTHS.indexOf(job.endMonth) + 1;

          return {
            startDate: `${job.startYear}-${String(startMonthIndex).padStart(2, '0')}`,
            endDate: `${job.endYear}-${String(endMonthIndex).padStart(2, '0')}`,
            monthlySalary: job.monthlySalary,
            sector: job.sector,
            state: job.state || undefined,
            supplementaryPension: job.supplementaryPension || undefined,
          };
        });

        const response = await apiClient.post('/gpr/calculate-simple', { jobs });

        if (response.data.success) {
          setCalculationResult(response.data.calculation);
        } else {
          setError(response.data.error || 'Calculation failed');
        }
      } catch (err: any) {
        console.error('Calculation error:', err);
        setError(err.response?.data?.error || 'Failed to calculate refund. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    calculateRefund();
  }, [formData.jobs, setCalculationResult]);

  const result = formData.calculationResult;
  // Mirrors the backend: only public-sector schemes are assessed, so only
  // then is the supplementary reason worth showing next to the DRV one.
  const hasSupplementaryAnswer = formData.jobs.some(
    (job) => job.sector === 'public' && !!job.supplementaryPension
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <StepContainer showBackButton={true} showNextButton={false} onBack={goToPreviousStep}>
        <div className="gpr-results-loading">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <h2 className="gpr-question">Calculating your refund...</h2>
          <p className="gpr-description">Please wait while we analyze your employment history.</p>
        </div>
      </StepContainer>
    );
  }

  if (error) {
    return (
      <StepContainer showBackButton={true} showNextButton={false} onBack={goToPreviousStep}>
        <div className="gpr-results-error">
          <h2 className="gpr-question">Calculation Error</h2>
          <p className="gpr-description text-red-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="gpr-next-button mt-4"
          >
            Try Again
          </button>
        </div>
      </StepContainer>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <StepContainer
      showBackButton={true}
      showNextButton={false}
      onBack={goToPreviousStep}
      backText="Back to jobs"
    >
      <div className="gpr-results">
        <h2 className="gpr-question">Your German Pension Refund estimate</h2>
        <p className="gpr-description">
          Based on {formData.numberOfJobs} job{formData.numberOfJobs > 1 ? 's' : ''} and{' '}
          {result.totalMonthsContributed} months of contributions
        </p>

        <div className="gpr-results-cards">
          {/* State Pension Refund (DRV) */}
          <div className="gpr-result-card">
            <div className="gpr-result-card-header">
              <span className="gpr-result-card-title">State Pension Refund (DRV)</span>
              <div className="gpr-tooltip-wrapper">
                <button
                  type="button"
                  className="gpr-info-button"
                  onMouseEnter={() => setShowDrvTooltip(true)}
                  onMouseLeave={() => setShowDrvTooltip(false)}
                  onClick={() => setShowDrvTooltip(!showDrvTooltip)}
                >
                  <Info className="w-4 h-4" />
                </button>
                {showDrvTooltip && (
                  <div className="gpr-tooltip">
                    {result.details.drvReason}
                  </div>
                )}
              </div>
            </div>
            <p className="gpr-result-card-subtitle">German state pension authority</p>
            <p className="gpr-result-card-amount">{formatCurrency(result.statePensionRefund)}</p>
          </div>

          {/* Supplementary Pension Refund */}
          <div className="gpr-result-card">
            <div className="gpr-result-card-header">
              <span className="gpr-result-card-title">Supplementary Pension Refund</span>
              <div className="gpr-tooltip-wrapper">
                <button
                  type="button"
                  className="gpr-info-button"
                  onMouseEnter={() => setShowSupplementaryTooltip(true)}
                  onMouseLeave={() => setShowSupplementaryTooltip(false)}
                  onClick={() => setShowSupplementaryTooltip(!showSupplementaryTooltip)}
                >
                  <Info className="w-4 h-4" />
                </button>
                {showSupplementaryTooltip && (
                  <div className="gpr-tooltip">
                    {result.details.supplementaryReason}
                  </div>
                )}
              </div>
            </div>
            <p className="gpr-result-card-subtitle">Additional pension schemes</p>
            <p className="gpr-result-card-amount">{formatCurrency(result.supplementaryRefund)}</p>
          </div>
        </div>

        {result.totalRefund > 0 ? (
          /* Total Refund Banner */
          <div className="gpr-total-banner">
            <div className="gpr-total-banner-content">
              <CheckCircle className="w-5 h-5" />
              <span className="gpr-total-label">Total Estimated Refund:</span>
            </div>
            <p className="gpr-total-amount">{formatCurrency(result.totalRefund)}</p>
          </div>
        ) : (
          /* Zero estimate: say why instead of a bare "0 €" banner. The
             reasons were only reachable through the ⓘ tooltips before. */
          <div className="gpr-results-notice" role="note">
            <p className="gpr-results-notice-title">
              <AlertCircle className="w-5 h-5" aria-hidden="true" />
              <span>No refund expected from these answers</span>
            </p>
            <p>{result.details.drvReason}</p>
            {hasSupplementaryAnswer && <p>{result.details.supplementaryReason}</p>}
            <p className="gpr-results-notice-foot">
              This estimate uses simplified rules. The eligibility check looks at
              your citizenship, residence and dates, and we review every case
              individually.
            </p>
          </div>
        )}

        {/* CTA Button */}
        <button
          className="gpr-eligibility-button"
          onClick={() => router.push('/calculator/qualification')}
        >
          Check your eligibility
        </button>
      </div>
    </StepContainer>
  );
}
