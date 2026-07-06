import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createTestApp,
  generateTestToken,
  generateUUID,
} from '../test/helpers';
import vbl from './vbl';

const originalFetch = global.fetch;

describe('Health insurance document extraction route', () => {
  const app = createTestApp(vbl);
  const token = generateTestToken(generateUUID(), 'test@example.com');

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('POST /extract-health-insurance-document requires authentication', async () => {
    const formData = new FormData();
    formData.append(
      'file',
      new File(['fake png'], 'healthinsurance.png', { type: 'image/png' })
    );

    const res = await app.request('/extract-health-insurance-document', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(401);
  });

  it('POST /extract-health-insurance-document extracts fields from an uploaded document with Mistral', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'test-mistral-key');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown: '# AOK\nMitgliedsnummer: 987654321',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    type: 'statutory',
                    providerName: 'AOK',
                    providerAddress: null,
                    insuredSinceMonth: null,
                    insuredSinceYear: null,
                    placeOfBirth: null,
                    countryOfBirth: null,
                    insuranceNumber: '987654321',
                    confidence: { type: 0.9, provider: 0.92 },
                    missingFields: [
                      'providerAddress',
                      'insuredSinceMonth',
                      'insuredSinceYear',
                      'placeOfBirth',
                      'countryOfBirth',
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

    const formData = new FormData();
    formData.append(
      'file',
      new File(['fake png'], 'healthinsurance.png', { type: 'image/png' })
    );

    const res = await app.request('/extract-health-insurance-document', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.extraction.details).toMatchObject({
      type: 'statutory',
      providerName: 'AOK',
      insuranceNumber: '987654321',
    });
  });

  it('POST /extract-health-insurance-document rejects missing files', async () => {
    const formData = new FormData();

    const res = await app.request('/extract-health-insurance-document', {
      method: 'POST',
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('No file provided');
  });
});
