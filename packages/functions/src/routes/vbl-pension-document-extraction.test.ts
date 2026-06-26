import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../test/helpers';
import vbl from './vbl';

const originalFetch = global.fetch;

describe('VBL pension document extraction route', () => {
  const app = createTestApp(vbl);

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('POST /extract-pension-document extracts fields from an uploaded document with Mistral', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'test-mistral-key');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown:
                  '# VBL Statement\nProvider: VBL\nPlan: VBLklassik\nState: Bremen',
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
                    provider: 'VBL',
                    vblPlan: 'VBLklassik',
                    federalState: 'Bremen',
                    startMonth: 'January',
                    startYear: '2017',
                    endMonth: 'December',
                    endYear: '2019',
                    employmentEndMonth: 'January',
                    employmentEndYear: '2020',
                    averageMonthlyGrossSalary: '4200',
                    confidence: {
                      provider: 0.91,
                      vblPlan: 0.9,
                      federalState: 0.83,
                      dates: 0.87,
                      employmentEndDate: 0.86,
                      salary: 0.71,
                    },
                    missingFields: [],
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
      new File(['fake png'], 'vbl-statement.png', { type: 'image/png' })
    );
    formData.append('pensionType', 'vbl_zvk');

    const res = await app.request('/extract-pension-document', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.extraction.details).toMatchObject({
      provider: 'VBL',
      vblPlan: 'VBLklassik',
      federalState: 'Bremen',
      startMonth: 'January',
      startYear: '2017',
      endMonth: 'December',
      endYear: '2019',
      employmentEndMonth: 'January',
      employmentEndYear: '2020',
      averageMonthlyGrossSalary: '4200',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.mistral.ai/v1/ocr',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-mistral-key',
        }),
      })
    );
  });

  it('POST /extract-pension-document rejects missing files', async () => {
    const formData = new FormData();
    formData.append('pensionType', 'vbl_zvk');

    const res = await app.request('/extract-pension-document', {
      method: 'POST',
      body: formData,
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('No file provided');
  });
});
