export type OnboardingVariant = 'default' | 'calculator';

export const isCalculatorVariant = (variant: OnboardingVariant): boolean =>
  variant === 'calculator';
