'use client';

import React from 'react';
import { Check, MessageCircle } from 'lucide-react';
import { useGPRCalculator } from '@/hooks/useGPRCalculator';

export default function Sidebar() {
  const { currentStep, currentJobIndex, completedSteps, formData } = useGPRCalculator();

  const steps = [
    {
      number: 1,
      title: 'Number of jobs',
      description: 'Count each employment period in Germany.',
    },
    {
      number: 2,
      title: 'Job details',
      description: 'Enter the start/end months and salary for each job.',
    },
    {
      number: 3,
      title: 'Your results',
      description: 'See your estimated refund.',
    },
  ];

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.has(stepIndex)) return 'completed';
    if (currentStep === stepIndex) return 'current';
    return 'pending';
  };

  const getJobProgress = () => {
    if (currentStep === 1 && formData.numberOfJobs > 0) {
      return `(${currentJobIndex + 1}/${formData.numberOfJobs})`;
    }
    return '';
  };

  return (
    <div className="gpr-sidebar">
      <h1 className="gpr-sidebar-title">
        Germany Pension<br />Refund Calculator
      </h1>

      <div className="gpr-steps">
        {steps.map((step, index) => {
          const status = getStepStatus(index);
          const isLast = index === steps.length - 1;

          return (
            <div key={step.number} className="gpr-step-item">
              <div className="gpr-step-indicator">
                <div className={`gpr-step-circle ${status}`}>
                  {status === 'completed' ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{step.number}</span>
                  )}
                </div>
                {!isLast && <div className={`gpr-step-line ${status === 'completed' ? 'completed' : ''}`} />}
              </div>
              <div className="gpr-step-content">
                <h3 className={`gpr-step-title ${status === 'current' ? 'current' : ''}`}>
                  {step.title}
                  {index === 1 && <span className="gpr-job-progress">{getJobProgress()}</span>}
                </h3>
                <p className="gpr-step-description">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="gpr-help">
        <div className="gpr-help-content">
          <span className="gpr-help-title">Need help?</span>
          <span className="gpr-help-text">Our assistant is here for you.</span>
        </div>
        <MessageCircle className="w-5 h-5 text-indigo-500" />
      </div>
    </div>
  );
}
