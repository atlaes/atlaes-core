import React from 'react';
import Image from 'next/image';

export const CompanyPensionLogo: React.FC<{ className?: string }> = ({ className }) => (
  <Image
    src="/companypension-cashouts-refunds.svg"
    alt="CompanyPension Cash-outs & Refunds"
    width={244}
    height={50}
    className={className}
    priority
  />
);

export default CompanyPensionLogo;
