const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'TestPassword123!';

// Test data for VBL calculation
const testCalculationData = {
  userType: 'insured_person',
  dateOfBirth: '1985-06-15',
  currentAge: 38,
  employmentStart: '2020-01-01',
  employmentEnd: '2022-12-31',
  isWestGermany: true,
  monthsContributed: 24,
  consecutiveMonthsContributed: 24,
  hasLeftPublicSector: true,
  isWorkingInPublicSectorEU: false,
  hasPaidVBLExtra: false,
  hasMovedContributions: false,
  isStageOrchestra: false,
  retirementAge: 67
};

let authToken = '';

async function testAPI() {
  console.log('🧪 Starting VBL API Tests...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health Check:', healthResponse.data);
    console.log('');

    // Test 2: Register User
    console.log('2️⃣ Testing User Registration...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
        dateOfBirth: '1985-06-15',
        nationality: 'DE',
        phone: '+49123456789'
      });
      console.log('✅ User Registration:', registerResponse.data.message);
      authToken = registerResponse.data.tokens.accessToken;
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.error === 'Email already registered') {
        console.log('ℹ️ User already exists, attempting login...');
        // Try to login instead
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });
        console.log('✅ User Login:', loginResponse.data.message);
        authToken = loginResponse.data.tokens.accessToken;
      } else {
        throw error;
      }
    }
    console.log('');

    // Test 3: Get VBL Rules
    console.log('3️⃣ Testing VBL Rules Endpoint...');
    const rulesResponse = await axios.get(`${BASE_URL}/api/vbl/rules`);
    console.log('✅ VBL Rules Retrieved:', {
      publicServiceSector: Object.keys(rulesResponse.data.rules.publicServiceSector),
      stageOrchestra: rulesResponse.data.rules.stageOrchestra.title,
      westGermanyStates: rulesResponse.data.rules.westGermanyStates.length
    });
    console.log('');

    // Test 4: Calculate VBL Refund (Post-2018)
    console.log('4️⃣ Testing VBL Calculation (Post-2018)...');
    const calculationResponse = await axios.post(`${BASE_URL}/api/vbl/calculate?save=true`, testCalculationData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ VBL Calculation Result:', {
      isEligible: calculationResponse.data.calculation.isEligible,
      calculationMethod: calculationResponse.data.calculation.calculationMethod,
      totalAmount: calculationResponse.data.calculation.totalAmount,
      applicationId: calculationResponse.data.applicationId
    });
    console.log('');

    // Test 5: Get User Applications
    console.log('5️⃣ Testing Get User Applications...');
    const applicationsResponse = await axios.get(`${BASE_URL}/api/vbl/applications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ User Applications:', {
      count: applicationsResponse.data.applications.length,
      applications: applicationsResponse.data.applications.map(app => ({
        id: app.id,
        status: app.status,
        calculationMethod: app.calculation_method,
        totalAmount: app.total_amount
      }))
    });
    console.log('');

    console.log('🎉 All VBL API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });
    process.exit(1);
  }
}

// Run the tests
testAPI();
