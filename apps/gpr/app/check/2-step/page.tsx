import type { Metadata } from 'next';
import EligibilityContainer from '@/components/eligibility/EligibilityContainer';
import { geoCountryFromHeaders } from '@/lib/geo-country';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Check your eligibility | Germany Pension Refund',
  description:
    'A few quick questions on citizenship, residence and your German contributions — see whether we can file your German pension refund before you sign up.',
};

export default function CheckPage() {
  return (
    <EligibilityContainer
      flowType="2-step"
      geoCountry={geoCountryFromHeaders()}
    />
  );
}
