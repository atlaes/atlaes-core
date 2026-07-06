import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractHealthInsuranceDocumentDetails,
  HealthInsuranceDocumentExtractionConfigError,
} from './health-insurance-document-extraction';

const originalFetch = global.fetch;

describe('health insurance document extraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses Mistral OCR and JSON mode extraction for image uploads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown:
                  '# Techniker Krankenkasse\nMitgliedsnummer: 123456789\nVersichert seit: März 2015',
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
                    providerName: 'Techniker Krankenkasse',
                    providerAddress: 'Bramfelder Str. 140, 22305 Hamburg',
                    insuredSinceMonth: 'March',
                    insuredSinceYear: '2015',
                    placeOfBirth: 'Munich',
                    countryOfBirth: 'Germany',
                    insuranceNumber: '123456789',
                    confidence: {
                      type: 0.95,
                      provider: 0.9,
                      insuredSince: 0.8,
                      placeOfBirth: 0.6,
                      countryOfBirth: 0.6,
                      insuranceNumber: 0.85,
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
    global.fetch = fetchMock;

    const result = await extractHealthInsuranceDocumentDetails({
      fileBuffer: Buffer.from('fake image'),
      fileName: 'healthinsurance.jpg',
      mimeType: 'image/jpeg',
      apiKey: 'test-mistral-key',
      model: 'mistral-large-latest',
      ocrModel: 'mistral-ocr-latest',
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://api.mistral.ai/v1/ocr',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-mistral-key',
        }),
      })
    );

    const ocrBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(ocrBody).toMatchObject({
      model: 'mistral-ocr-latest',
      document: {
        type: 'image_url',
        image_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
      },
      include_image_base64: false,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://api.mistral.ai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-mistral-key',
        }),
      })
    );
    const extractionBody = JSON.parse(
      fetchMock.mock.calls[1][1].body as string
    );
    expect(extractionBody).toMatchObject({
      model: 'mistral-large-latest',
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    expect(extractionBody.messages[0].content).toContain(
      'Return only valid JSON'
    );
    expect(extractionBody.messages[1].content).toContain(
      'Techniker Krankenkasse'
    );

    expect(result.details).toMatchObject({
      type: 'statutory',
      providerName: 'Techniker Krankenkasse',
      providerAddress: 'Bramfelder Str. 140, 22305 Hamburg',
      insuredSinceMonth: 'March',
      insuredSinceYear: '2015',
      placeOfBirth: 'Munich',
      countryOfBirth: 'Germany',
      insuranceNumber: '123456789',
    });
    expect(result.missingFields).toEqual([]);
    expect(result.rawText).toContain('Techniker Krankenkasse');
  });

  it('marks fields missing when not visible and normalizes a private-insurance value', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown: '# Allianz Private Krankenversicherung\nPolicy',
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
                    type: 'private Krankenversicherung',
                    providerName: 'Allianz Private Krankenversicherung',
                    providerAddress: null,
                    insuredSinceMonth: null,
                    insuredSinceYear: null,
                    placeOfBirth: null,
                    countryOfBirth: null,
                    insuranceNumber: null,
                    confidence: {
                      type: 0.7,
                      provider: 0.8,
                    },
                    missingFields: [
                      'providerAddress',
                      'insuredSinceMonth',
                      'insuredSinceYear',
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );
    global.fetch = fetchMock;

    const result = await extractHealthInsuranceDocumentDetails({
      fileBuffer: Buffer.from('fake pdf'),
      fileName: 'policy.pdf',
      mimeType: 'application/pdf',
      apiKey: 'test-mistral-key',
    });

    expect(result.details.type).toBe('private');
    expect(result.details.providerName).toBe(
      'Allianz Private Krankenversicherung'
    );
    expect(result.details.placeOfBirth).toBeNull();
    expect(result.details.countryOfBirth).toBeNull();
    expect(result.details.insuranceNumber).toBeNull();
    expect(result.missingFields.sort()).toEqual(
      [
        'providerAddress',
        'insuredSinceMonth',
        'insuredSinceYear',
        'placeOfBirth',
        'countryOfBirth',
        'insuranceNumber',
      ].sort()
    );
  });

  it('requires a Mistral API key', async () => {
    await expect(
      extractHealthInsuranceDocumentDetails({
        fileBuffer: Buffer.from('fake image'),
        fileName: 'healthinsurance.png',
        mimeType: 'image/png',
        apiKey: '',
      })
    ).rejects.toBeInstanceOf(HealthInsuranceDocumentExtractionConfigError);
  });
});
