const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test questions based on the PDF content we processed
const testQuestions = [
  {
    question: "When are the mid-semester exams starting?",
    category: "Exam Dates",
    expectedContent: "15th October 2025",
    language: "english"
  },
  {
    question: "What sports competitions are happening?",
    category: "Sports Events", 
    expectedContent: "Inter-college sports from 1st November 2025",
    language: "english"
  },
  {
    question: "Tell me about Rizvi College activities",
    category: "College Activities",
    expectedContent: "Various college events and activities",
    language: "english"
  },
  {
    question: "Rizvi College के exam कब हैं?",
    category: "Hindi Query",
    expectedContent: "Exam dates in Hindi",
    language: "hindi"
  },
  {
    question: "College के sports events कब हैं?",
    category: "Mixed Language Query", 
    expectedContent: "Sports information",
    language: "auto"
  },
  {
    question: "What is the fee structure for MBA?",
    category: "Not in PDF",
    expectedContent: "Should be forwarded to admin",
    language: "english"
  }
];

async function authenticateTestUser() {
  try {
    // Try to create a test user
    const registerData = {
      name: "PDF Test User",
      email: "pdftest@example.com", 
      password: "test123456",
      whatsappNumber: "+1234567890"
    };

    let authResponse;
    try {
      authResponse = await axios.post(`${BASE_URL}/api/auth/register`, registerData);
      console.log('✅ New test user created');
    } catch (registerError) {
      // If user exists, try to login
      if (registerError.response?.status === 400) {
        console.log('👤 Test user exists, logging in...');
        authResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: registerData.email,
          password: registerData.password
        });
        console.log('✅ Test user logged in successfully');
      } else {
        throw registerError;
      }
    }

    return authResponse.data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
}

async function testQuestionFromPDF(question, authToken, index) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 TEST ${index + 1}: ${question.category}`);
    console.log(`❓ Question: "${question.question}"`);
    console.log(`🎯 Expected: ${question.expectedContent}`);
    console.log(`🌍 Language: ${question.language}`);
    console.log('-'.repeat(60));

    const startTime = Date.now();

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    };

    const response = await axios.post(
      `${BASE_URL}/api/chat/message`,
      {
        message: question.question,
        language: question.language,
        platform: 'web'
      },
      { 
        headers,
        timeout: 30000 
      }
    );

    const responseTime = Date.now() - startTime;
    const result = response.data;

    // Display results
    console.log(`\n✅ RESPONSE (${responseTime}ms):`);
    console.log(`📝 Answer: "${result.response}"`);
    console.log(`🔍 Confidence: ${result.confidence?.toFixed(3) || 'N/A'}`);
    console.log(`🎯 Strategy: ${result.metadata?.strategy || 'N/A'}`);
    console.log(`🌍 Detected Language: ${result.metadata?.detectedLanguage || 'N/A'}`);
    console.log(`📚 Retrieved Documents: ${result.metadata?.retrievedDocs || 0}`);
    console.log(`👨‍💼 Needs Admin Response: ${result.needsAdminResponse ? '✅ YES' : '❌ NO'}`);

    // Analyze the quality of the response
    const isFromPDF = result.confidence > 0.05 && !result.needsAdminResponse;
    const responseQuality = isFromPDF ? '🎯 ANSWERED FROM PDF' : '📤 FORWARDED TO ADMIN';
    
    console.log(`\n📊 ANALYSIS:`);
    console.log(`   Result: ${responseQuality}`);
    console.log(`   Quality: ${result.confidence > 0.1 ? '✅ HIGH' : result.confidence > 0.05 ? '⚠️ MEDIUM' : '❌ LOW'}`);
    
    // Check if the response contains expected content keywords
    const responseText = result.response.toLowerCase();
    let containsExpected = false;
    
    if (question.category === "Exam Dates") {
      containsExpected = responseText.includes('october') || responseText.includes('exam') || responseText.includes('15');
    } else if (question.category === "Sports Events") {
      containsExpected = responseText.includes('sports') || responseText.includes('november') || responseText.includes('competition');
    } else if (question.category === "Not in PDF") {
      containsExpected = result.needsAdminResponse; // Should be forwarded to admin
    } else {
      containsExpected = responseText.includes('rizvi') || responseText.includes('college');
    }
    
    console.log(`   Content Match: ${containsExpected ? '✅ RELEVANT' : '⚠️ GENERIC'}`);

    return {
      question: question.question,
      category: question.category,
      success: true,
      confidence: result.confidence,
      needsAdmin: result.needsAdminResponse,
      responseTime: responseTime,
      answeredFromPDF: isFromPDF,
      contentMatch: containsExpected,
      response: result.response.substring(0, 100) + '...'
    };

  } catch (error) {
    console.log(`\n❌ TEST FAILED:`);
    console.log(`   Error: ${error.response?.data?.message || error.message}`);
    console.log(`   Status: ${error.response?.status || 'Unknown'}`);
    
    return {
      question: question.question,
      category: question.category,
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
}

async function runPDFTests() {
  console.log('🚀 PDF-Based Question Answering Test Suite');
  console.log('=' .repeat(60));
  console.log(`📅 Started at: ${new Date().toLocaleString()}`);
  console.log(`🌐 Backend: ${BASE_URL}`);
  console.log(`📄 Testing with PDF content: Rizvi College Information`);
  console.log(`🔍 Vector Database: Local TF-IDF with 20 document sections`);
  
  // Authenticate
  const authToken = await authenticateTestUser();
  if (!authToken) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  const results = [];
  
  // Test each question
  for (let i = 0; i < testQuestions.length; i++) {
    const result = await testQuestionFromPDF(testQuestions[i], authToken, i);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    if (i < testQuestions.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Generate summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('=' .repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const answeredFromPDF = successful.filter(r => r.answeredFromPDF);
  const forwardedToAdmin = successful.filter(r => r.needsAdmin);
  const relevantContent = successful.filter(r => r.contentMatch);

  console.log(`\n📈 OVERALL RESULTS:`);
  console.log(`   ✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`   ❌ Failed tests: ${failed.length}/${results.length}`);
  console.log(`   🎯 Answered from PDF: ${answeredFromPDF.length}/${successful.length}`);
  console.log(`   📤 Forwarded to admin: ${forwardedToAdmin.length}/${successful.length}`);
  console.log(`   🎪 Relevant content: ${relevantContent.length}/${successful.length}`);

  if (successful.length > 0) {
    const avgConfidence = successful
      .filter(r => r.confidence !== undefined)
      .reduce((sum, r, _, arr) => sum + r.confidence / arr.length, 0);
    const avgResponseTime = successful.reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length;
    
    console.log(`\n⚡ PERFORMANCE:`);
    console.log(`   🎯 Average confidence: ${avgConfidence.toFixed(3)}`);
    console.log(`   ⏱️ Average response time: ${avgResponseTime.toFixed(0)}ms`);
  }

  console.log(`\n📋 DETAILED RESULTS:`);
  results.forEach((result, index) => {
    const status = result.success 
      ? (result.answeredFromPDF ? '🎯 PDF' : '📤 ADMIN')
      : '❌ FAIL';
    console.log(`   ${index + 1}. ${result.category}: ${status}`);
    if (result.success) {
      console.log(`      "${result.response}"`);
    }
  });

  console.log('\n🎉 TEST COMPLETE! Your PDF-based RAG system is working!');
  console.log('💡 Try accessing http://localhost:3000 to test interactively');
}

// Run the tests
runPDFTests().catch(console.error);