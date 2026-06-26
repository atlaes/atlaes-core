import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  extractPensionDocumentDetails,
  PensionDocumentExtractionConfigError,
} from './pension-document-extraction';

const originalFetch = global.fetch;

describe('pension document extraction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('uses Mistral OCR and JSON mode extraction for PDF uploads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown:
                  '# BVV Statement\nBVV Versicherungsverein des Bankgewerbes\nMonatliche Rente: 87,50 EUR',
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
                    provider: 'BVV',
                    statePensionRefundReceived: 'yes',
                    bavStatementValueType: 'monthly pension',
                    bavStatementAmount: '87,50 EUR',
                    confidence: {
                      provider: 0.96,
                      statePensionRefund: 0.81,
                      bavStatementValue: 0.89,
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

    const result = await extractPensionDocumentDetails({
      fileBuffer: Buffer.from('%PDF fake'),
      fileName: 'BVV statement.pdf',
      mimeType: 'application/pdf',
      pensionType: 'bav_private',
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
        type: 'document_url',
        document_url: expect.stringMatching(/^data:application\/pdf;base64,/),
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
    expect(extractionBody.messages[1].content).toContain('BVV Statement');

    expect(result.details).toMatchObject({
      provider: 'BVV',
      statePensionRefundReceived: 'yes',
      bavStatementValueType: 'monthly_pension',
      bavStatementAmount: '8750',
    });
    expect(result.missingFields).toEqual([]);
    expect(result.rawText).toContain('BVV Statement');
  });

  it('requires a Mistral API key', async () => {
    await expect(
      extractPensionDocumentDetails({
        fileBuffer: Buffer.from('fake image'),
        fileName: 'statement.png',
        mimeType: 'image/png',
        pensionType: 'vbl_zvk',
        apiKey: '',
      })
    ).rejects.toBeInstanceOf(PensionDocumentExtractionConfigError);
  });
});
