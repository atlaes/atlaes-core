'use client';

import React from 'react';
import {
  User,
  FileText,
  CreditCard,
  PenTool,
  Shield,
  Send,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useClaimsStore, SIDEBAR_SECTIONS } from '@/lib/stores/claims-store';
import { useClaimQuery } from '@/lib/queries/claims-queries';
import { ClaimStepName } from '@/lib/claims-api';

const SECTION_ICONS: Record<string, React.ElementType> = {
  user: User,
  file: FileText,
  'credit-card': CreditCard,
  pen: PenTool,
  shield: Shield,
  send: Send,
};

interface ClaimsSidebarProps {
  claimId: string;
  expandedSections?: string[];
}

export default function ClaimsSidebar({ claimId, expandedSections: initialExpanded }: ClaimsSidebarProps) {
  const { data: claim } = useClaimQuery(claimId);
  const { currentStep, goToStep } = useClaimsStore();

  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(initialExpanded || SIDEBAR_SECTIONS.map(s => s.id))
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const isStepComplete = (stepName: ClaimStepName): boolean => {
    return claim?.completedSteps[stepName] ?? false;
  };

  const getCurrentSectionId = () => {
    for (const section of SIDEBAR_SECTIONS) {
      if (section.steps.some(step => step.name === currentStep)) {
        return section.id;
      }
    }
    return null;
  };

  const isSectionComplete = (sectionId: string) => {
    const section = SIDEBAR_SECTIONS.find(s => s.id === sectionId);
    if (!section) return false;
    return section.steps.every(step => step.optional || isStepComplete(step.name));
  };

  // Check if any step in section has been started (visited or completed)
  const isSectionStarted = (sectionId: string) => {
    const section = SIDEBAR_SECTIONS.find(s => s.id === sectionId);
    if (!section) return false;
    return section.steps.some(step => isStepComplete(step.name));
  };

  const currentSectionId = getCurrentSectionId();

  return (
    <aside className="claims-sidebar">
      <div className="claims-sidebar-header">
        <h2 className="claims-sidebar-title">Claim Progress</h2>
        <p className="claims-sidebar-subtitle">Complete all steps to submit</p>
      </div>

      <nav className="claims-sidebar-nav">
        {SIDEBAR_SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section.icon] || FileText;
          const isExpanded = expandedSections.has(section.id);
          const isCurrent = section.id === currentSectionId;
          const isComplete = isSectionComplete(section.id);
          const isStarted = isSectionStarted(section.id);

          // Section is active (purple) if it's current, complete, or has started steps
          const isActive = isCurrent || isComplete || isStarted;

          return (
            <div key={section.id} className="claims-sidebar-section">
              {/* Section Header - Pill style button */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`claims-sidebar-section-header ${isCurrent ? 'current' : ''} ${isComplete ? 'complete' : ''}`}
              >
                <div className="claims-sidebar-section-icon">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="claims-sidebar-section-title">{section.title}</span>
                <span className="claims-sidebar-section-chevron">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {/* Section Steps - With left border indicator */}
              {isExpanded && (
                <div className="claims-sidebar-steps">
                  {section.steps.map((step) => {
                    const stepComplete = isStepComplete(step.name);
                    const stepCurrent = step.name === currentStep;

                    return (
                      <button
                        key={step.name}
                        onClick={() => goToStep(step.name)}
                        className={`claims-sidebar-step ${stepCurrent ? 'current' : ''} ${stepComplete ? 'complete' : ''}`}
                      >
                        <span className="claims-sidebar-step-indicator">
                          {stepComplete && (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="claims-sidebar-step-label">
                          {step.label}
                          {step.optional && <span className="claims-sidebar-step-optional"> (Optional)</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
