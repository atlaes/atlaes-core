/**
 * Test fixtures for VBL Platform backend tests
 *
 * These fixtures provide consistent test data across all test suites.
 * Each fixture represents a valid example of the data type.
 */

// ============================================================
// User & Auth Fixtures
// ============================================================

export const testUser = {
  email: 'testuser@example.com',
  password: 'TestPassword123!',
  firstName: 'John',
  lastName: 'Doe',
};

export const testUserWithProfile = {
  ...testUser,
  dateOfBirth: '1990-05-15',
  nationality: 'AU',
  phone: '+61412345678',
};

// ============================================================
// GPR Calculator Fixtures
// ============================================================

export const singleJobInput = {
  jobs: [
    {
      startDate: '2020-01',
      endDate: '2022-06',
      monthlySalary: 4500,
      sector: 'private',
      state: 'bayern',
    },
  ],
};

export const multipleJobsInput = {
  jobs: [
    {
      startDate: '2018-03',
      endDate: '2020-02',
      monthlySalary: 3800,
      sector: 'private',
      state: 'berlin',
    },
    {
      startDate: '2020-03',
      endDate: '2022-12',
      monthlySalary: 5200,
      sector: 'private',
      state: 'bayern',
    },
  ],
};

export const publicSectorJobInput = {
  jobs: [
    {
      startDate: '2019-06',
      endDate: '2023-05',
      monthlySalary: 4200,
      sector: 'public',
      state: 'nordrhein-westfalen',
      supplementaryPension: 'VBL',
    },
  ],
};

export const jobWithSupplementaryPension = {
  jobs: [
    {
      startDate: '2017-01',
      endDate: '2022-12',
      monthlySalary: 4800,
      sector: 'public',
      state: 'baden-wurttemberg',
      supplementaryPension: 'ZVK',
    },
  ],
};

export const invalidJobInput = {
  jobs: [
    {
      startDate: 'invalid-date',
      endDate: '2022-06',
      monthlySalary: -1000,
      sector: 'private',
    },
  ],
};

export const emptyJobsInput = {
  jobs: [],
};

// Expected calculation result structure
export const expectedCalculationResult = {
  statePensionRefund: 3240.5,
  supplementaryRefund: 0,
  totalRefund: 3240.5,
  totalMonthsContributed: 30,
  details: {
    drvEligible: true,
    drvReason: 'Meets minimum contribution period',
    supplementaryEligible: false,
    supplementaryReason: 'No supplementary pension contributions',
  },
};

// ============================================================
// GPR Session Fixtures
// ============================================================

export const gprSessionData = {
  email: 'gpr-test@example.com',
  calculatorData: {
    numberOfJobs: 1,
    jobs: [
      {
        startMonth: '01',
        startYear: '2020',
        endMonth: '06',
        endYear: '2022',
        monthlySalary: 4500,
        sector: 'private',
        state: 'bayern',
      },
    ],
    calculationResult: {
      statePensionRefund: 3240.5,
      supplementaryRefund: 0,
      totalRefund: 3240.5,
      totalMonthsContributed: 30,
      details: {
        drvEligible: true,
        drvReason: 'Meets minimum contribution period',
        supplementaryEligible: false,
        supplementaryReason: 'No supplementary pension contributions',
      },
    },
  },
  eligibilityData: {
    citizenship: 'AU',
    residence: 'AU',
    lastEmploymentMonth: '06',
    lastEmploymentYear: '2022',
    contributionDuration: '30',
    eligibilityResult: {
      isEligible: true,
      reasons: ['All eligibility criteria met'],
    },
  },
};

// ============================================================
// Claims Fixtures
// ============================================================

export const claimPersonalInfo = {
  claimType: 'own_refund' as const,
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1990-05-15',
  gender: 'male',
  placeOfBirth: 'Sydney',
  nationality: 'Australian',
  passportNumber: 'PA1234567',
  passportIssueDate: '2020-01-15',
  passportExpiryDate: '2030-01-15',
};

export const claimCurrentAddress = {
  currentAddressLine1: '123 Test Street',
  currentAddressLine2: 'Unit 4',
  currentCity: 'Sydney',
  currentPostalCode: '2000',
  currentCountry: 'Australia',
};

export const claimGermanInfo = {
  svNummer: '12345678A123',
  germanStreet: 'Hauptstraße 42',
  germanPostalCode: '80331',
  germanCity: 'München',
  moveOutDate: '2022-06-30',
  abmeldungMethod: 'selbst',
  deregistrationServiceRequested: false,
};

export const claimBankDetails = {
  preferredCurrency: 'AUD',
  accountHolderName: 'John Doe',
  bankName: 'Commonwealth Bank',
  accountNumber: '12345678',
  bsb: '062000',
  swiftBic: 'CTBAAU2S',
  bankStreet: '48 Martin Place',
  bankCity: 'Sydney',
  bankPostalCode: '2000',
  bankCountry: 'Australia',
};

export const claimConfirmations = {
  confirmationAccuracyAccepted: true,
  confirmationAuthorizationAccepted: true,
};

export const completeClaim = {
  ...claimPersonalInfo,
  ...claimCurrentAddress,
  ...claimGermanInfo,
  ...claimBankDetails,
  ...claimConfirmations,
};

export const minimalClaimData = {
  claimType: 'own_refund' as const,
  firstName: 'Test',
  lastName: 'User',
};

// ============================================================
// Workflow State Fixtures
// ============================================================

export const claimWorkflowSteps = [
  'personal_info',
  'documents',
  'payment_details',
  'signature',
  'id_verification',
  'review',
] as const;

export const completedStepsFixture = {
  personal_info: true,
  documents: true,
  payment_details: true,
  signature: false,
  id_verification: false,
  review: false,
};

// ============================================================
// API Response Fixtures
// ============================================================

export const successResponse = {
  success: true,
};

export const errorResponse = {
  success: false,
  error: 'Error message',
};

export const validationErrorResponse = {
  success: false,
  error: 'Validation failed',
  details: [],
};

// ============================================================
// Magic Link Fixtures
// ============================================================

export const magicLinkRequest = {
  email: 'magiclink@example.com',
};

export const magicLinkWithGprData = {
  email: 'magiclink-gpr@example.com',
  gprSessionData: gprSessionData.calculatorData,
};

// ============================================================
// Document Fixtures
// ============================================================

export const testDocument = {
  documentId: '00000000-0000-0000-0000-000000000001',
  documentRole: 'passport',
};

export const testDocuments = [
  { documentRole: 'passport' },
  { documentRole: 'certified_id' },
  { documentRole: 'deregistration_certificate' },
];
