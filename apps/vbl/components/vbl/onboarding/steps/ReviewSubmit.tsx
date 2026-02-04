'use client';

import React, { useState } from 'react';
import { ArrowRight, User, CreditCard as CardIcon, MapPin, Landmark, PenTool, FileText, Check } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useRouter } from 'next/navigation';

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Germany',
  AT: 'Austria',
  CH: 'Switzerland',
  NL: 'Netherlands',
  BE: 'Belgium',
  FR: 'France',
  GB: 'United Kingdom',
  US: 'United States',
  OTHER: 'Other',
};

export const ReviewSubmit: React.FC = () => {
  const router = useRouter();
  const { data } = useOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // In real implementation, this would submit to backend API
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setIsSubmitted(true);

      // Redirect to success/dashboard after a delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error) {
      console.error('Submission error:', error);
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-20 h-20 bg-[#9FE870] rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-10 h-10 text-[#163300]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Claim submitted successfully!
        </h2>
        <p className="text-gray-600 mb-8">
          We've received your refund claim. You'll receive updates via email as we process your application.
        </p>
        <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Review your claim
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Please review your information before submitting your refund claim.
      </p>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Personal Details */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Personal Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="text-gray-500">Name:</span>{' '}
              <span className="font-medium">{data.identity.fullName || 'Not provided'}</span>
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Date of birth:</span>{' '}
              <span className="font-medium">{formatDate(data.identity.dateOfBirth) || 'Not provided'}</span>
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Gender:</span>{' '}
              <span className="font-medium">{GENDER_LABELS[data.identity.gender] || 'Not provided'}</span>
            </p>
          </div>
        </div>

        {/* Membership */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <CardIcon className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Membership</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <span className="text-gray-500">Scheme:</span>{' '}
              <span className="font-medium">{data.membership.pensionProvider || 'Not provided'}</span>
            </p>
            <p className="text-gray-700">
              <span className="text-gray-500">Membership number:</span>{' '}
              <span className="font-medium">{data.membership.membershipNumber || 'Not provided'}</span>
            </p>
          </div>
        </div>

        {/* Address */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Address</h3>
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{data.address.streetAndNumber || 'Not provided'}</p>
            <p>
              {data.address.postalCode} {data.address.city}
            </p>
            <p>{COUNTRY_LABELS[data.address.country] || data.address.country}</p>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <Landmark className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Bank Details</h3>
          </div>
          <div className="text-sm text-gray-700">
            {data.bankDetails.iban ? (
              <p>
                <span className="text-gray-500">IBAN:</span>{' '}
                <span className="font-medium">{data.bankDetails.iban}</span>
              </p>
            ) : (
              <p className="font-medium">
                {data.bankDetails.accountOption === 'open_free_account' && 'Will open free EUR account'}
                {data.bankDetails.accountOption === 'trusted_third_party' && 'Using third-party account'}
                {data.bankDetails.accountOption === 'add_later' && 'Will add IBAN later'}
              </p>
            )}
          </div>
        </div>

        {/* Signature */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <PenTool className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Signature</h3>
          </div>
          {data.signature.signatureData ? (
            <img
              src={data.signature.signatureData}
              alt="Your signature"
              className="max-h-16 object-contain"
            />
          ) : (
            <p className="text-sm text-gray-500">No signature provided</p>
          )}
        </div>

        {/* Documents */}
        <div className="bg-[#F0FDE4] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-[#9FE870] rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#163300]" />
            </div>
            <h3 className="font-semibold text-[#163300]">Documents to be submitted</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-[#9FE870]" />
              <span>Identity document</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Check className="w-4 h-4 text-[#9FE870]" />
              <span>Signed authorization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-4 px-6 bg-[#9FE870] text-[#163300] font-semibold rounded-lg flex items-center justify-center gap-2 hover:bg-[#8AD860] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <div className="w-5 h-5 border-2 border-[#163300] border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            Submit Refund Claim
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};

export default ReviewSubmit;
