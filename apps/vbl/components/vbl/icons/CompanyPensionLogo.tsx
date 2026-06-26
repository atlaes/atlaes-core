import React from 'react';
import Image from 'next/image';

export const CompanyPensionLogo: React.FC<{ className?: string }> = ({ className }) => (
  <Image
    src="/companypension-cashouts-refunds.svg"
    alt="Company Pension Cash-outs & Refunds"
    width={518}
    height={143}
    className={className ?? 'h-auto w-[244px]'}
    priority
  />
);

export default CompanyPensionLogo;
