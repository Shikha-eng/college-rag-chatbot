const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test questions that should be answered from PDF content
const testQuestions = [
  {
    question: "When are the mid-semester exams starting?",
    expectedAnswer: "Should mention 15th October 2025",
    language: "english"
  },
  {
    question: "What sports competitions are coming up?",
    expectedAnswer: "Should mention inter-college sports from 1st November 2025",
    language: "english"
  },
  {
    question: "Tell me about Rizvi College events",
    expectedAnswer: "Should provide information about college events",
    language: "english"
  }
];

async function testPDFAnswers() {
  try {
    console.log('🧪 Testing PDF-Based Question Answering');
    console.log('='.repeat(50));
    
    // Try to register/login a test user
    let authToken;
    try {
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        whatsappNumber: "+1234567890"
      });
      authToken = registerResponse.data.token;
      console.log('✅ Test user created');
    } catch (error) {
      // If user exists, try to login
      try {
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: "test@example.com",
          password: "password123"
        });
        authToken = loginResponse.data.token;
        console.log('✅ Test user logged in');
      } catch (loginError) {
        console.log('⚠️ Authentication failed, testing may be limited');
        authToken = null;
      }
    }
    
    for (let i = 0; i < testQuestions.length; i++) {
      const test = testQuestions[i];
      console.log(`\n📋 Test ${i + 1}: ${test.question}`);
      console.log('🎯 Expected:', test.expectedAnswer);
      console.log('-'.repeat(50));
      
      try {
        const startTime = Date.now();
        
        const headers = {
          'Content-Type': 'application/json'
        };
        
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await axios.post(
          `${BASE_URL}/api/chat/message`,
          {
            message: test.question,
            language: test.language,
            platform: 'web'
          },
          { headers, timeout: 30000 }
        );
        
        const responseTime = Date.now() - startTime;
        const result = response.data;
        
        console.log(`✅ Response (${responseTime}ms):`);
        console.log(`📝 Answer: ${result.response}`);
        console.log(`🔍 Confidence: ${result.confidence?.toFixed(3) || 'N/A'}`);
        console.log(`🎯 Strategy: ${result.metadata?.strategy || 'N/A'}`);
        console.log(`👨‍💼 Needs Admin: ${result.needsAdminResponse ? 'YES' : 'NO'}`);
        console.log(`📚 Retrieved Docs: ${result.metadata?.retrievedDocs || 0}`);
        
        // Check if this looks like a good answer
        const isGoodAnswer = result.confidence > 0.05 && !result.needsAdminResponse;
        console.log(`🎯 PDF Answer Quality: ${isGoodAnswer ? '✅ GOOD' : '❌ POOR'}`);
        
      } catch (error) {
        console.log(`❌ Test failed:`);
        console.log(`Error: ${error.response?.data?.message || error.message}`);
        console.log(`Status: ${error.response?.status || 'Unknown'}`);
      }
      
      // Wait between tests
      if (i < testQuestions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 PDF-based answering system test complete!');
    console.log('✨ If answers show good confidence and no admin forwarding,');
    console.log('   your PDF content is working properly!');
    
  } catch (error) {
    console.error('❌ Testing failed:', error.message);
  }
}

console.log('🚀 PDF Answer Quality Test');
console.log(`📅 Started at: ${new Date().toLocaleString()}`);

testPDFAnswers();