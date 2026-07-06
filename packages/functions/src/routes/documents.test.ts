import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  extractPassportData: vi.fn(),
}));

vi.mock('../utils/db', () => ({
  db: {
    insert: mocks.insert,
  },
}));

vi.mock('../utils/s3', () => ({
  uploadFile: mocks.uploadFile,
  deleteFile: mocks.deleteFile,
}));

vi.mock('../services/passport-ocr', () => ({
  extractPassportData: mocks.extractPassportData,
}));

import documentsRouter from './documents';

describe('documents route', () => {
  const app = new Hono();
  app.route('/api/documents', documentsRouter);

  beforeEach(() => {
    process.env.JWT_SECRET =
      'test-jwt-secret-key-for-testing-purposes-only-32-chars';
    vi.clearAllMocks();
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockReturnValue({ returning: mocks.returning });
    mocks.returning.mockResolvedValue([
      {
        id: 'doc-1',
        fileName: 'NewZealand.pdf',
        fileType: 'application/pdf',
        fileSize: 18,
        documentType: 'passport',
        status: 'completed',
        createdAt: new Date('2026-07-03T00:00:00Z').toISOString(),
      },
    ]);
  });

  it('rejects a passport upload before saving when OCR says it is not a passport or national ID', async () => {
    mocks.extractPassportData.mockResolvedValue({
      success: false,
      error: 'Uploaded file is not a passport or national ID',
    });

    const formData = new FormData();
    formData.append(
      'file',
      new File(['not a passport'], 'NewZealand.pdf', {
        type: 'application/pdf',
      })
    );
    formData.append('documentType', 'passport');

    const res = await app.fetch(
      new Request('http://localhost/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
        body: formData,
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({
      success: false,
      error: 'Uploaded file is not a passport or national ID',
    });
    expect(mocks.extractPassportData).toHaveBeenCalledOnce();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('saves a passport document only after OCR succeeds and persists extracted data', async () => {
    mocks.extractPassportData.mockResolvedValue({
      success: true,
      data: {
        firstName: 'Alex',
        lastName: 'Citizen',
        dateOfBirth: '1990-04-12',
        gender: 'male',
        placeOfBirth: 'Auckland',
        nationality: 'New Zealand',
        passportNumber: 'NZ123456',
        passportIssueDate: '2020-01-15',
        passportExpiryDate: '2030-01-15',
        issuingCountry: 'New Zealand',
        mrz1: 'P<NZLCITIZEN<<ALEX<<<<<<<<<<<<<<<<<<<<',
        mrz2: 'NZ123456<0NZL9004123M3001152<<<<<<<<<<<<<<04',
      },
    });

    const formData = new FormData();
    formData.append(
      'file',
      new File(['passport'], 'NewZealand.pdf', {
        type: 'application/pdf',
      })
    );
    formData.append('documentType', 'passport');

    const res = await app.fetch(
      new Request('http://localhost/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${createToken()}`,
        },
        body: formData,
      })
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ocr).toMatchObject({
      firstName: 'Alex',
      lastName: 'Citizen',
      passportNumber: 'NZ123456',
    });
    expect(mocks.extractPassportData).toHaveBeenCalledOnce();
    expect(mocks.uploadFile).toHaveBeenCalledOnce();
    expect(mocks.values).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: 'passport',
        ocrData: expect.objectContaining({
          passportNumber: 'NZ123456',
        }),
      })
    );
    expect(mocks.extractPassportData.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.uploadFile.mock.invocationCallOrder[0]
    );
  });
});

function createToken() {
  return sign(
    {
      userId: '11111111-1111-1111-1111-111111111111',
      email: 'test@example.com',
      emailVerified: true,
    },
    process.env.JWT_SECRET ||
      'test-jwt-secret-key-for-testing-purposes-only-32-chars'
  );
}
