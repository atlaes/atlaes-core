import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_QUERY_KEYS,
  attributionToQuery,
  parseAttributionParams,
} from './attribution';

describe('attribution helpers', () => {
  it('reads utm_*, gclid, fbclid and via from a query string', () => {
    const a = parseAttributionParams(
      '?utm_source=google&utm_medium=cpc&utm_campaign=in&utm_term=refund&utm_content=a1&gclid=G1&fbclid=F1&via=partner&other=x'
    );
    expect(a).toEqual({
      utmSource: 'google',
      utmMedium: 'cpc',
      utmCampaign: 'in',
      utmTerm: 'refund',
      utmContent: 'a1',
      gclid: 'G1',
      fbclid: 'F1',
      via: 'partner',
    });
  });

  it('ignores empty values and clips long ones', () => {
    const a = parseAttributionParams('utm_source=&gclid=' + 'x'.repeat(300));
    expect(a.utmSource).toBeUndefined();
    expect(a.gclid).toHaveLength(255);
  });

  it('round-trips into the hand-off query keys only', () => {
    const q = attributionToQuery({
      utmSource: 'google',
      via: 'partner',
      referrer: 'https://example.com/',
      landingPage: '/',
      capturedAt: '2026-09-25T00:00:00.000Z',
    });
    expect(q.toString()).toBe('utm_source=google&via=partner');
    expect(ATTRIBUTION_QUERY_KEYS).toEqual([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'via',
    ]);
    expect(attributionToQuery(null).toString()).toBe('');
  });
});
