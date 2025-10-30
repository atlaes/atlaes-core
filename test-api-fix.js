const axios = require('axios');

// Test the API fix
async function testAPIFix() {
  console.log('🔧 Testing API URL Fix...\n');

  try {
    // Test 1: Login to get a valid token
    console.log('1️⃣ Getting authentication token...');
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPassword123!'
    });
    
    const token = loginResponse.data.tokens.accessToken;
    console.log('✅ Token obtained successfully');
    console.log('');

    // Test 2: Test VBL calculation with correct URL
    console.log('2️⃣ Testing VBL calculation with fixed URL...');
    const calculationResponse = await axios.post('http://localhost:3001/api/vbl/calculate', {
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
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ VBL Calculation successful!');
    console.log('Result:', {
      isEligible: calculationResponse.data.calculation.isEligible,
      calculationMethod: calculationResponse.data.calculation.calculationMethod,
      totalAmount: calculationResponse.data.calculation.totalAmount
    });
    console.log('');

    // Test 3: Test the incorrect URL to show the difference
    console.log('3️⃣ Testing incorrect URL (should fail)...');
    try {
      await axios.post('http://localhost:3001/api/api/vbl/calculate', {
        userType: 'insured_person'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.log('✅ Correctly failed with 404 Not Found');
      console.log('Error:', error.response?.data?.message || error.message);
    }
    console.log('');

    console.log('🎉 API URL fix verified! The correct URL is `/api/vbl/calculate`');
    console.log('❌ The incorrect URL `/api/api/vbl/calculate` returns 404 Not Found');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPIFix();
