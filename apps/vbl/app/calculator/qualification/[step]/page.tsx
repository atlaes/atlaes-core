'use client';

import { useParams, useRouter } from 'next/navigation';
import { VBLCalculatorProvider } from '@/hooks/useVBLCalculator';
import QualificationStep1 from '@/components/vbl/qualification/QualificationStep1';
import QualificationStep2 from '@/components/vbl/qualification/QualificationStep2';
import QualificationStep3 from '@/components/vbl/qualification/QualificationStep3';
import QualificationStep4 from '@/components/vbl/qualification/QualificationStep4';
import QualificationStep5 from '@/components/vbl/qualification/QualificationStep5';

function QualificationPageContent() {
  const params = useParams();
  const router = useRouter();
  const currentStep = parseInt((params?.step as string) || '1');

  const handleNext = () => {
    if (currentStep < 5) {
      router.push(`/calculator/qualification/${currentStep + 1}`);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      router.push(`/calculator/qualification/${currentStep - 1}`);
    } else {
      // Go back to results
      router.push('/calculator');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <QualificationStep1 onNext={handleNext} onBack={handleBack} />;
      case 2:
        return <QualificationStep2 onNext={handleNext} onBack={handleBack} />;
      case 3:
        return <QualificationStep3 onNext={handleNext} onBack={handleBack} />;
      case 4:
        return <QualificationStep4 onNext={handleNext} onBack={handleBack} />;
      case 5:
        return <QualificationStep5 onBack={handleBack} />;
      default:
        router.push('/calculator/qualification/1');
        return null;
    }
  };

  return <div>{renderStep()}</div>;
}

export default function QualificationPage() {
  return (
    <VBLCalculatorProvider>
      <QualificationPageContent />
    </VBLCalculatorProvider>
  );
}
