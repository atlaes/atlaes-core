# VBL Calculation Implementation

## Overview

This document describes the implementation of the VBL (Versorgungsanstalt des Bundes und der Länder) calculation system for the Atlaes platform. The system handles both Public Service Sector and Stage/Orchestra supplementary pension refund calculations.

## Architecture

### Backend Services

#### 1. VBLCalculationService (`packages/functions/src/services/vbl-calculation.ts`)

The core calculation service that implements all VBL refund rules and logic.

**Key Features:**
- Rule-based eligibility validation
- Multiple calculation methods (pre-2018, post-2018, stage/orchestra)
- Comprehensive input validation
- Calculation logging and audit trail
- Support for both Public Service Sector and Stage/Orchestra calculations

**Main Methods:**
- `calculateVBLRefund(input)` - Main calculation entry point
- `calculatePre2018Refund(input)` - Pre-2018 employment calculations
- `calculatePost2018Refund(input)` - Post-2018 employment calculations
- `calculateStageOrchestraRefund(input)` - Stage/Orchestra calculations
- `validateInput(input)` - Input validation
- `logCalculation(input, result)` - Audit logging

#### 2. VBL API Routes (`packages/functions/src/routes/vbl.ts`)

RESTful API endpoints for VBL calculations and application management.

**Endpoints:**
- `POST /api/vbl/calculate` - Calculate VBL refund
- `GET /api/vbl/applications` - Get user's applications
- `GET /api/vbl/applications/:id` - Get specific application
- `PUT /api/vbl/applications/:id` - Update application
- `GET /api/vbl/applications/:id/calculations` - Get calculation history
- `POST /api/vbl/applications/:id/submit` - Submit application
- `GET /api/vbl/rules` - Get calculation rules and requirements

### Frontend Components

#### 1. VBLCalculator (`apps/vbl/components/vbl/VBLCalculator.tsx`)

React component providing a comprehensive form for VBL calculations.

**Features:**
- Dynamic form validation using Zod schemas
- Conditional fields based on calculation type
- Real-time eligibility checking
- Detailed results display with calculation breakdown
- Rules and requirements display
- Currency formatting for German locale

#### 2. Calculator Page (`apps/vbl/app/calculator/page.tsx`)

Next.js page that hosts the VBL calculator component.

## Calculation Rules Implementation

### Public Service Sector - Pre 2018

**Eligibility Requirements:**
1. User left the public sector (not working in public sector in EU/EEA/UK/Switzerland)
2. Employment region: West Germany
3. Contribution period less than 60 months
4. Only VBLklassik contributions (no VBL extra)
5. User younger than 69 years old
6. Contributions not moved to another supplementary insurance

**Implementation:**
```typescript
private static calculatePre2018Refund(input: VBLCalculationInput): VBLCalculationResult {
  // Rule validation logic
  // Base refund calculation
  // VAT calculation (19%)
  // Return comprehensive result
}
```

### Public Service Sector - Post 2018

**Eligibility Requirements:**
1. User left the public sector (not working in public sector in EU/EEA/UK/Switzerland)
2. Employment region: West Germany
3. Consecutive contribution less than 36 months AND total contribution less than 60 months
4. Only VBLklassik contributions (no VBL extra)
5. User younger than 69 years old
6. Contributions not moved to another supplementary insurance

**Implementation:**
```typescript
private static calculatePost2018Refund(input: VBLCalculationInput): VBLCalculationResult {
  // Enhanced rule validation with consecutive period check
  // Same base calculation as pre-2018
  // Return comprehensive result
}
```

### Stage/Orchestra (VddB/VddKO)

**Eligibility Requirements:**
1. Minimum contribution period: 12 months
2. Maximum contribution period:
   - Employments ended before 01 Jan 2003: unlimited
   - Else: <36 months
3. User left employment with specific conditions:
   - 24 months have passed, OR
   - User has occupational disability, OR
   - Mandatory insurance no longer required, OR
   - User too old to complete 36 months before retirement, OR
   - Occupational disability less than 2 years ago (VddB only)

**Implementation:**
```typescript
private static calculateStageOrchestraRefund(input: VBLCalculationInput): VBLCalculationResult {
  // Stage/Orchestra specific rule validation
  // Complex employment end condition checking
  // Return comprehensive result
}
```

## Data Models

### VBLCalculationInput

```typescript
interface VBLCalculationInput {
  // User information
  userType: 'insured_person' | 'widow' | 'orphan';
  dateOfBirth: string; // YYYY-MM-DD format
  currentAge: number;
  
  // Employment information
  employmentStart: string; // YYYY-MM-DD format
  employmentEnd: string; // YYYY-MM-DD format
  isWestGermany: boolean;
  monthsContributed: number;
  consecutiveMonthsContributed?: number; // For post-2018 calculations
  vblInsuranceNumber?: string;
  
  // Additional information
  hasLeftPublicSector: boolean;
  isWorkingInPublicSectorEU: boolean; // EU/EEA/UK/Switzerland
  hasPaidVBLExtra: boolean; // Only VBLklassik contributions
  hasMovedContributions: boolean;
  
  // Stage/Orchestra specific
  isStageOrchestra: boolean;
  hasOccupationalDisability?: boolean;
  disabilityDate?: string; // YYYY-MM-DD format
  isMandatoryInsuranceRequired?: boolean;
  retirementAge?: number;
}
```

### VBLCalculationResult

```typescript
interface VBLCalculationResult {
  isEligible: boolean;
  eligibilityReasons: string[];
  calculationMethod: 'pre2018' | 'post2018' | 'stage_orchestra';
  baseRefundAmount: number;
  vatAmount: number;
  totalAmount: number;
  calculationDetails: {
    contributionPeriod: number;
    consecutivePeriod?: number;
    ageAtEmploymentEnd: number;
    westGermanyEligible: boolean;
    timeSinceEmploymentEnd: number; // in months
  };
  rulesApplied: string[];
  warnings: string[];
}
```

## Database Schema

### Applications Table

```sql
CREATE TABLE vbl.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES shared.users(id),
    status VARCHAR(50) DEFAULT 'draft',
    
    -- Employment data
    employer_name VARCHAR(255),
    employment_start DATE,
    employment_end DATE,
    is_west_germany BOOLEAN,
    months_contributed INTEGER,
    vbl_insurance_number VARCHAR(50),
    
    -- Calculation
    calculation_method VARCHAR(20), -- 'pre2018' or 'post2018'
    base_refund_amount DECIMAL(10,2),
    vat_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Payment and submission fields...
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Calculation Logs Table

```sql
CREATE TABLE vbl.calculation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES vbl.applications(id),
    input_data JSONB NOT NULL,
    rules_version VARCHAR(20),
    calculation_result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Usage Examples

### Calculate VBL Refund

```bash
POST /api/vbl/calculate
Content-Type: application/json
Authorization: Bearer <token>

{
  "userType": "insured_person",
  "dateOfBirth": "1985-06-15",
  "currentAge": 38,
  "employmentStart": "2020-01-01",
  "employmentEnd": "2022-12-31",
  "isWestGermany": true,
  "monthsContributed": 24,
  "consecutiveMonthsContributed": 24,
  "hasLeftPublicSector": true,
  "isWorkingInPublicSectorEU": false,
  "hasPaidVBLExtra": false,
  "hasMovedContributions": false,
  "isStageOrchestra": false
}
```

**Response:**
```json
{
  "success": true,
  "calculation": {
    "isEligible": true,
    "eligibilityReasons": [],
    "calculationMethod": "post2018",
    "baseRefundAmount": 1200.00,
    "vatAmount": 228.00,
    "totalAmount": 1428.00,
    "calculationDetails": {
      "contributionPeriod": 24,
      "consecutivePeriod": 24,
      "ageAtEmploymentEnd": 37,
      "westGermanyEligible": true,
      "timeSinceEmploymentEnd": 12
    },
    "rulesApplied": [
      "User left public sector",
      "Employment in West Germany",
      "Consecutive contribution period less than 36 months",
      "Total contribution period less than 60 months",
      "Only VBLklassik contributions",
      "User younger than 69 years old",
      "Contributions not moved to another insurance"
    ],
    "warnings": []
  },
  "applicationId": "uuid-here"
}
```

### Get Calculation Rules

```bash
GET /api/vbl/rules
```

**Response:**
```json
{
  "success": true,
  "rules": {
    "publicServiceSector": {
      "pre2018": {
        "title": "Public Service Sector - Pre 2018",
        "description": "For employments ending before 1 January 2018",
        "requirements": [...]
      },
      "post2018": {
        "title": "Public Service Sector - Post 2018",
        "description": "For employments ending after 1 January 2018",
        "requirements": [...]
      }
    },
    "stageOrchestra": {
      "title": "Stage/Orchestra (VddB/VddKO)",
      "description": "For stage and orchestra employees",
      "requirements": [...]
    },
    "westGermanyStates": [...]
  }
}
```

## Security and Validation

### Input Validation

- Comprehensive Zod schema validation
- Date format validation (YYYY-MM-DD)
- Age range validation (0-120)
- Contribution period validation
- Required field validation
- Cross-field validation (employment dates, age calculations)

### Authentication

- JWT-based authentication required for all calculation endpoints
- User-specific application access control
- Audit logging for all calculations

### Data Sanitization

- Sensitive data (insurance numbers) sanitized in logs
- Input sanitization before database storage
- SQL injection prevention through parameterized queries

## Error Handling

### Validation Errors

- Detailed field-level error messages
- Form validation with real-time feedback
- Clear error display in UI

### API Errors

- Structured error responses
- HTTP status code compliance
- Detailed error logging
- User-friendly error messages

### Calculation Errors

- Graceful handling of edge cases
- Comprehensive error logging
- Fallback error responses
- Input validation before calculation

## Testing

### Unit Tests

- Calculation logic testing
- Validation rule testing
- Edge case handling
- Error condition testing

### Integration Tests

- API endpoint testing
- Database interaction testing
- Authentication flow testing
- End-to-end calculation testing

### Manual Testing

- Frontend form validation
- Calculation accuracy verification
- User experience testing
- Cross-browser compatibility

## Future Enhancements

### Planned Features

1. **Enhanced Calculation Logic**
   - More sophisticated refund amount calculations
   - Interest rate considerations
   - Historical contribution tracking

2. **Document Management**
   - Document upload for verification
   - OCR-based data extraction
   - Document validation

3. **Workflow Management**
   - Application status tracking
   - Automated notifications
   - Progress monitoring

4. **Reporting and Analytics**
   - Calculation statistics
   - Success rate tracking
   - User behavior analytics

5. **Multi-language Support**
   - German language support
   - Localized date formats
   - Currency formatting

### Technical Improvements

1. **Performance Optimization**
   - Calculation caching
   - Database query optimization
   - Response time improvements

2. **Scalability**
   - Horizontal scaling support
   - Load balancing
   - Database sharding

3. **Monitoring and Observability**
   - Application performance monitoring
   - Error tracking and alerting
   - Usage analytics

## Conclusion

The VBL calculation system provides a comprehensive solution for determining eligibility and calculating refund amounts for VBL supplementary pension refunds. The implementation follows best practices for security, validation, and user experience while maintaining flexibility for future enhancements.

The system successfully handles both Public Service Sector and Stage/Orchestra calculations with detailed rule validation, comprehensive logging, and a user-friendly interface. The modular architecture allows for easy maintenance and future feature additions.
