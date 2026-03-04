import React from 'react';
import Image from 'next/image';

export const CompanyPensionLogo: React.FC<{ className?: string }> = ({ className }) => (
  <Image
    src="/Logo - Company Pension - Calculator.svg"
    alt="Company Pension"
    width={173}
    height={71}
    className={className}
    priority
  />
);

export default CompanyPensionLogo;
