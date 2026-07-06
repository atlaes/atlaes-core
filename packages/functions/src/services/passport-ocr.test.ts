import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractPassportData } from './passport-ocr';

const originalFetch = global.fetch;

describe('passport OCR service', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('uses Mistral to verify the document is a passport before extracting identity details', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'test-mistral-key');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [
              {
                markdown:
                  'PASSPORT\nSurname: Citizen\nGiven names: Alex\nPassport No: NZ123456',
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
                    isIdentityDocument: true,
                    documentType: 'passport',
                  }),
                },
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
                    firstName: 'Alex',
                    lastName: 'Citizen',
                    dateOfBirth: '1990-04-12',
                    gender: 'M',
                    placeOfBirth: 'Auckland',
                    nationality: 'New Zealand',
                    passportNumber: 'NZ123456',
                    passportIssueDate: '2020-01-15',
                    passportExpiryDate: '2030-01-15',
                    issuingCountry: 'New Zealand',
                    mrz1: 'P<NZLCITIZEN<<ALEX<<<<<<<<<<<<<<<<<<<<',
                    mrz2: 'NZ123456<0NZL9004123M3001152<<<<<<<<<<<<<<04',
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

    const result = await extractPassportData(
      Buffer.from('fake passport pdf'),
      'NewZealand.pdf',
      'application/pdf'
    );

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      firstName: 'Alex',
      lastName: 'Citizen',
      gender: 'male',
      passportNumber: 'NZ123456',
      passportIssueDate: '2020-01-15',
      passportExpiryDate: '2030-01-15',
    });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'https://api.mistral.ai/v1/ocr',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-mistral-key',
        }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://api.mistral.ai/v1/chat/completions',
      expect.objectContaining({
        body: expect.stringContaining('isIdentityDocument'),
      })
    );
  });

  it('does not extract identity details when Mistral says the upload is not a passport or national ID', async () => {
    vi.stubEnv('MISTRAL_API_KEY', 'test-mistral-key');
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            pages: [{ markdown: 'Utility bill\nAmount due: 100 EUR' }],
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
                    isIdentityDocument: false,
                    documentType: 'utility_bill',
                  }),
                },
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } }
        )
      );

    const result = await extractPassportData(
      Buffer.from('fake bill pdf'),
      'bill.pdf',
      'application/pdf'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Uploaded file is not a passport or national ID');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
