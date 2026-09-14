import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DrvRefundDecisionExtractionConfigError,
  DrvRefundDecisionExtractionProviderError,
  extractDrvRefundDecisionDetails,
  normalizeDate,
  normalizeDrvOffice,
} from './drv-refund-decision-extraction';

const originalFetch = global.fetch;

const ocrResponse = (markdown: string) =>
  new Response(JSON.stringify({ pages: [{ markdown }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const chatResponse = (payload: unknown) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(payload) } }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } }
  );

describe('DRV refund decision extraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('runs OCR then JSON extraction and normalizes the result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        ocrResponse(
          '# Deutsche Rentenversicherung Bund\nDatum: 02.07.2026\nBescheid über die Erstattung von Beiträgen'
        )
      )
      .mockResolvedValueOnce(
        chatResponse({
          drvOffice: 'DRV Bund',
          decisionDate: '02.07.2026',
          insuranceNumber: '12 345678 C 123',
          refundAmount: '4.321,50',
          applicantName: 'Emily Carter',
          isRefundDecision: 'true',
          confidence: {
            drvOffice: 0.95,
            decisionDate: 0.9,
            insuranceNumber: 0.8,
            refundAmount: 0.7,
            applicantName: 0.9,
            isRefundDecision: 0.85,
          },
          missingFields: [],
        })
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await extractDrvRefundDecisionDetails({
      fileBuffer: Buffer.from('pdf'),
      fileName: 'bescheid.pdf',
      mimeType: 'application/pdf',
      apiKey: 'test-key',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const ocrBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(ocrBody.document.type).toBe('document_url');
    const chatBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(chatBody.response_format).toEqual({ type: 'json_object' });

    expect(result.details).toEqual({
      drvOffice: 'Deutsche Rentenversicherung Bund',
      decisionDate: '2026-07-02',
      insuranceNumber: '12 345678 C 123',
      refundAmount: '4321.50',
      applicantName: 'Emily Carter',
      isRefundDecision: true,
    });
    expect(result.missingFields).toEqual([]);
    expect(result.confidence.drvOffice).toBe(0.95);
    expect(result.model).toBe('mistral-ocr-latest+mistral-large-latest');
  });

  it('reports missing fields and tolerates fenced JSON', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(ocrResponse('Renteninformation'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '```json\n{"drvOffice": null, "decisionDate": "not a date", "isRefundDecision": false, "missingFields": ["drvOffice"]}\n```',
                },
              },
            ],
          }),
          { status: 200 }
        )
      ) as unknown as typeof fetch;

    const result = await extractDrvRefundDecisionDetails({
      fileBuffer: Buffer.from('img'),
      fileName: 'scan.jpg',
      mimeType: 'image/jpeg',
      apiKey: 'test-key',
    });
    expect(result.details.isRefundDecision).toBe(false);
    expect(result.details.decisionDate).toBeNull();
    expect(result.missingFields).toEqual([
      'drvOffice',
      'decisionDate',
      'insuranceNumber',
      'refundAmount',
      'applicantName',
    ]);
  });

  it('requires a Mistral API key', async () => {
    await expect(
      extractDrvRefundDecisionDetails({
        fileBuffer: Buffer.from('x'),
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        apiKey: '',
      })
    ).rejects.toBeInstanceOf(DrvRefundDecisionExtractionConfigError);
  });

  it('surfaces OCR failures as provider errors', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"message":"bad"}', { status: 500 })
      ) as unknown as typeof fetch;
    await expect(
      extractDrvRefundDecisionDetails({
        fileBuffer: Buffer.from('x'),
        fileName: 'x.pdf',
        mimeType: 'application/pdf',
        apiKey: 'k',
      })
    ).rejects.toBeInstanceOf(DrvRefundDecisionExtractionProviderError);
  });
});

describe('normalizers', () => {
  it('canonicalizes DRV office names', () => {
    expect(normalizeDrvOffice('Deutsche Rentenversicherung Bund')).toBe(
      'Deutsche Rentenversicherung Bund'
    );
    expect(normalizeDrvOffice('deutsche rentenversicherung nord')).toBe(
      'Deutsche Rentenversicherung Nord'
    );
    expect(normalizeDrvOffice('DRV Bayern Süd')).toBe(
      'Deutsche Rentenversicherung Bayern Süd'
    );
    expect(
      normalizeDrvOffice('Deutsche Rentenversicherung Berlin Brandenburg')
    ).toBe('Deutsche Rentenversicherung Berlin-Brandenburg');
    expect(normalizeDrvOffice('Some other office')).toBe('Some other office');
    expect(normalizeDrvOffice('')).toBeNull();
  });

  it('parses German and ISO dates', () => {
    expect(normalizeDate('02.07.2026')).toBe('2026-07-02');
    expect(normalizeDate('2.7.2026')).toBe('2026-07-02');
    expect(normalizeDate('2026-07-02')).toBe('2026-07-02');
    expect(normalizeDate('2026-07-02T00:00:00Z')).toBe('2026-07-02');
    expect(normalizeDate('31.02.2026')).toBe('2026-02-31');
    expect(normalizeDate('July 2, 2026')).toBeNull();
    expect(normalizeDate(null)).toBeNull();
  });
});
