import React from 'react';
import Image from 'next/image';

export const CompanyPensionLogo: React.FC<{ className?: string }> = ({
  className,
}) => (
  <Image
    src="/companypension-cashouts-refunds.svg?v=20260706"
    alt="Company Pension Cash-outs & Refunds"
    width={260}
    height={56}
    className={className ?? 'h-auto w-[244px]'}
    unoptimized
    priority
  />
);

export default CompanyPensionLogo;
