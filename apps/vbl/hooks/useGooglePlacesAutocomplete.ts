'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Client #13: Google Places Autocomplete integration for the address step.
// Lazy-loads the Google Maps JS SDK once per session. If the API key is
// missing or the script fails to load, the hook is a no-op and the plain
// text input continues to work unchanged — no hard dependency.
//
// Task 11 (item 17): the attach effect used to run once, keyed off the
// *identity* of the RefObject passed in. A plain `useRef` never changes
// identity, so if the underlying <input> DOM node wasn't attached yet at
// the moment this effect first ran (e.g. a slower mount path, or the input
// briefly not present while a parent re-renders), the hook would silently
// no-op forever for that mount — nothing ever re-triggered the effect once
// the node actually appeared. This is now driven by a callback ref (state)
// instead of a RefObject, so the attach effect re-runs whenever the node
// itself appears/changes/disappears, and re-attaches after the async SDK
// script load resolves regardless of mount timing.

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
      existing.addEventListener('error', () =>
        reject(new Error('script load'))
      );
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

  // Task 11: track the actual DOM node via state (populated by a callback
  // ref below) instead of relying on the caller's RefObject identity, which
  // never changes and therefore can't signal when the node mounts. This
  // lets the attach effect re-run whenever the node appears — including on
  // a delayed/remounted input — while still writing through to the
  // caller's RefObject so existing consumers (e.g. Address.tsx) keep
  // working unchanged.
  const [node, setNode] = useState<HTMLInputElement | null>(
    inputRef.current ?? null
  );

  const attachNode = useCallback(
    (el: HTMLInputElement | null) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inputRef as any).current = el;
      setNode(el);
    },
    [inputRef]
  );

  // Guard against double-attaching an Autocomplete instance to the same
  // node (e.g. StrictMode double-invoke or rapid re-renders).
  const attachedNodeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !node) return;
    if (attachedNodeRef.current === node) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let autocomplete: any = null;

    loadGoogleMapsSdk(apiKey)
      .then(() => {
        if (cancelled || !node) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const google = (window as any).google;
        if (!google?.maps?.places?.Autocomplete) return;

        autocomplete = new google.maps.places.Autocomplete(node, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
        });
        attachedNodeRef.current = node;
        // Testable seam: autocomplete itself can't be e2e-tested (external
        // Google API), but this attribute lets a test or manual check
        // confirm the hook actually attached to the node.
        node.dataset.placesAutocomplete = 'attached';

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
      if (attachedNodeRef.current === node) {
        attachedNodeRef.current = null;
        delete node.dataset.placesAutocomplete;
      }
    };
  }, [node]);

  return attachNode;
};
