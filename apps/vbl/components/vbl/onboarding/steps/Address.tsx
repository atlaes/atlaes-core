'use client';

import React, { useRef } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { COUNTRIES } from '@/lib/countries';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';

interface AddressProps {
  onNext: () => void;
}

export const Address: React.FC<AddressProps> = ({ onNext }) => {
  const { data, updateAddress } = useOnboarding();
  const streetInputRef = useRef<HTMLInputElement>(null);

  // Client #13: when the user picks a Google Places suggestion, fill in all
  // four fields from the structured address components. No-ops silently if
  // the Maps SDK is not configured (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing).
  useGooglePlacesAutocomplete(streetInputRef, {
    onPlaceSelected: (place) => {
      updateAddress({
        streetAndNumber: place.streetAndNumber,
        postalCode: place.postalCode,
        city: place.city,
        country: place.countryCode || data.address.country,
      });
    },
  });

  const canProceed =
    data.address.streetAndNumber !== '' &&
    data.address.postalCode !== '' &&
    data.address.city !== '' &&
    data.address.country !== '';

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">
        Your current residential address
      </h2>
      <div className="w-16 h-0.5 bg-gray-200 mx-auto mb-2" />
      <p className="text-gray-600 text-center mb-8">
        Please enter your current residential address.
      </p>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Street and House Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Street and house number
          </label>
          <p className="mb-2 text-sm text-gray-500">
            Please enter your address using Latin characters.
          </p>
          <input
            ref={streetInputRef}
            type="text"
            value={data.address.streetAndNumber}
            onChange={(e) => updateAddress({ streetAndNumber: e.target.value })}
            placeholder="Street and house number"
            autoComplete="off"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
          />
        </div>

        {/* Postal Code and City - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal code
            </label>
            <input
              type="text"
              value={data.address.postalCode}
              onChange={(e) => updateAddress({ postalCode: e.target.value })}
              placeholder="Postal code"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <input
              type="text"
              value={data.address.city}
              onChange={(e) => updateAddress({ city: e.target.value })}
              placeholder="City"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Country — Client #13: full ISO 3166 list */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country
          </label>
          <div className="relative">
            <select
              value={data.address.country}
              onChange={(e) => updateAddress({ country: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9FE870] focus:border-transparent outline-none appearance-none bg-white"
            >
              <option value="">Select country</option>
              {COUNTRIES.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onNext}
        disabled={!canProceed}
        className={`w-full mt-8 py-4 px-6 font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${
          canProceed
            ? 'bg-[#9FE870] text-[#163300] hover:bg-[#8AD860]'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Continue
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Address;
