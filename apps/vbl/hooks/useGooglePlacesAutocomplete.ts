'use client';

import { useEffect, useRef } from 'react';

// Client #13: Google Places Autocomplete integration for the address step.
// Lazy-loads the Google Maps JS SDK once per session. If the API key is
// missing or the script fails to load, the hook is a no-op and the plain
// text input continues to work unchanged — no hard dependency.

export interface ParsedPlace {
  streetAndNumber: string;
  postalCode: string;
  city: string;
  // ISO 3166-1 alpha-2 — matches the value format used by the country list.
  countryCode: string;
}

interface Options {
  onPlaceSelected: (place: ParsedPlace) => void;
}

// Hoist loader state so multiple mounts share a single script tag.
let loaderPromise: Promise<void> | null = null;

const loadGoogleMapsSdk = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-sdk]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('script load')));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsSdk = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('script load'));
    document.head.appendChild(script);
  });
  return loaderPromise;
};

const parseAddressComponents = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  place: any
): ParsedPlace => {
  const parts: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (place.address_components ?? []).forEach((c: any) => {
    c.types.forEach((t: string) => {
      parts[t] = c.long_name;
      parts[`${t}__short`] = c.short_name;
    });
  });

  const streetAndNumber = [parts.street_number, parts.route]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    streetAndNumber,
    postalCode: parts.postal_code ?? '',
    city: parts.locality || parts.postal_town || parts.sublocality || '',
    countryCode: (parts.country__short ?? '').toUpperCase(),
  };
};

export const useGooglePlacesAutocomplete = (
  inputRef: React.RefObject<HTMLInputElement>,
  { onPlaceSelected }: Options
) => {
  // Keep the latest callback without re-running the attach effect.
  const callbackRef = useRef(onPlaceSelected);
  useEffect(() => {
    callbackRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let autocomplete: any = null;

    loadGoogleMapsSdk(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (!google?.maps?.places?.Autocomplete) return;

        autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        });

        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (!place?.address_components) return;
          callbackRef.current(parseAddressComponents(place));
        });
      })
      .catch(() => {
        // Silent fallback — the input still works as a plain text field.
      });

    return () => {
      cancelled = true;
      if (listener && listener.remove) listener.remove();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      if (google?.maps?.event && autocomplete) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [inputRef]);
};
