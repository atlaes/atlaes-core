export type OnboardingVariant = 'default' | 'calculator';
export type OnboardingSource = 'default' | 'calculator';

export const isCalculatorVariant = (variant: OnboardingVariant): boolean =>
  variant === 'calculator';
