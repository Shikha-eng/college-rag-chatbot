const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test questions - some should be answerable from PDF, others should go to admin
const testQuestions = [
  {
    question: "When are the mid-semester exams starting?",
    expectedBehavior: "Should find answer in PDF (15th October 2025)",
    language: "english"
  },
  {
    question: "What sports competitions are coming up?",
    expectedBehavior: "Should find answer in PDF (Inter-college sports from 1st November)",
    language: "english"
  },
  {
    question: "Rizvi College के exams कब हैं?",
    expectedBehavior: "Should find answer and respond in Hindi",
    language: "hindi"
  },
  {
    question: "What is the fee structure for MBA course?",
    expectedBehavior: "Should NOT find answer, forward to admin",
    language: "english"
  },
  {
    question: "How do I apply for hostel accommodation?",
    expectedBehavior: "Should NOT find answer, forward to admin", 
    language: "english"
  },
  {
    question: "College का phone number क्या है?",
    expectedBehavior: "Should NOT find answer, forward to admin",
    language: "hindi"
  }
];

// Mock user authentication - normally this would come from login
const mockAuthToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token";

async function createTestUser() {
  try {
    console.log('👤 Creating test user...');
    
    const userData = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      whatsappNumber: "+1234567890"
    };
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, userData);
    console.log('✅ Test user created successfully');
    return response.data.token;
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('📝 Test user already exists, trying to login...');
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: userData.email,
          password: userData.password
        });
        console.log('✅ Test user logged in successfully');
        return loginResponse.data.token;
      } catch (loginError) {
        console.log('⚠️  Login failed, using mock token for testing');
        return null;
      }
    } else {
      console.log('⚠️  User creation failed, using mock token for testing');
      return null;
    }
  }
}

async function testPDFQuestionAnswering() {
  try {
    console.log('🧪 Testing PDF-based Question Answering System');
    console.log('=' .repeat(60));
    
    // Try to get a real auth token
    let authToken = await createTestUser();
    if (!authToken) {
      console.log('📝 Using mock authentication for testing...');
      authToken = mockAuthToken;
    } else {
      authToken = `Bearer ${authToken}`;
    }
    
    const results = [];
    
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`\n📋 Test ${i + 1}: ${test.question}`);
      console.log(`🎯 Expected: ${test.expectedBehavior}`);
      console.log('-' .repeat(50));
      
      try {
        const startTime = Date.now();
        
        const response = await axios.post(
          `${BASE_URL}/api/chat/message`,
          {
            message: test.question,
            language: test.language,
            platform: 'web'
          },
          {
            headers: {
              'Authorization': authToken,
              'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
          }
        );
        
        const responseTime = Date.now() - startTime;
        const result = response.data;
        
        console.log(`✅ Response (${responseTime}ms):`);
        console.log(`📝 Answer: ${result.response}`);
        console.log(`🔍 Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
        console.log(`🎯 Strategy: ${result.metadata?.strategy || 'N/A'}`);
        console.log(`👨‍💼 Needs Admin: ${result.needsAdminResponse ? 'YES' : 'NO'}`);
        console.log(`📚 Retrieved Docs: ${result.metadata?.retrievedDocs || 0}`);
        console.log(`🌍 Language: ${result.metadata?.detectedLanguage || 'N/A'}`);
        
        results.push({
          question: test.question,
          success: true,
          response: result.response,
          confidence: result.confidence,
          needsAdmin: result.needsAdminResponse,
          retrievedDocs: result.metadata?.retrievedDocs,
          responseTime: responseTime
        });
        
      } catch (error) {
        console.log(`❌ Test failed:`);
        console.log(`Error: ${error.response?.data?.message || error.message}`);
        console.log(`Status: ${error.response?.status || 'Unknown'}`);
        
        results.push({
          question: test.question,
          success: false,
          error: error.response?.data?.message || error.message,
          responseTime: Date.now() - startTime
        });
      }
      
      // Add delay between requests
      if (i < testQuestions.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const needingAdmin = successful.filter(r => r.needsAdmin);
    const answeredDirectly = successful.filter(r => !r.needsAdmin);
    
    console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
    console.log(`❌ Failed tests: ${failed.length}/${results.length}`);
    console.log(`📋 Direct answers: ${answeredDirectly.length}`);
    console.log(`👨‍💼 Forwarded to admin: ${needingAdmin.length}`);
    
    if (successful.length > 0) {
      const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
      console.log(`⏱️  Average response time: ${avgResponseTime.toFixed(0)}ms`);
      
      const avgConfidence = successful
        .filter(r => r.confidence !== undefined)
        .reduce((sum, r, _, arr) => sum + r.confidence / arr.length, 0);
      
      if (avgConfidence > 0) {
        console.log(`🎯 Average confidence: ${avgConfidence.toFixed(2)}`);
      }
    }
    
    console.log('\n📋 Individual Results:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.question.substring(0, 50)}...`);
      console.log(`   Status: ${result.success ? '✅' : '❌'}`);
      if (result.success) {
        console.log(`   Admin needed: ${result.needsAdmin ? 'YES' : 'NO'}`);
        console.log(`   Confidence: ${result.confidence?.toFixed(2) || 'N/A'}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Testing process failed:', error.message);
  }
}

// Run the tests
console.log('🚀 Starting PDF Question Answering System Test');
console.log(`📅 Test Date: ${new Date().toLocaleString()}`);
console.log(`🌐 Base URL: ${BASE_URL}`);

testPDFQuestionAnswering().catch(console.error);