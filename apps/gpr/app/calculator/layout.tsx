'use client';

import React from 'react';
import { GPRCalculatorProvider } from '@/hooks/useGPRCalculator';

export default function CalculatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GPRCalculatorProvider>{children}</GPRCalculatorProvider>;
}
