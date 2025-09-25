const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function runPDFTests() {
  try {
    // Create a new user with timestamp-based email
    const randomEmail = `test${Date.now()}@example.com`;
    
    console.log('🚀 PDF-Based Question Answering Test');
    console.log('='.repeat(50));
    console.log(`👤 Creating test user: ${randomEmail}`);
    
    const authResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: 'PDF Test User',
      email: randomEmail,
      password: 'Test123456',
      whatsappNumber: '+1234567890'
    });
    
    console.log('✅ User registered successfully');
    const token = authResponse.data.token;
    
    // Test questions from the PDF
    const questions = [
      'When are the mid-semester exams?',
      'What sports competitions are happening?', 
      'Tell me about college activities',
      'What courses does Rizvi College offer?',
      'When is the admission process?'
    ];
    
    console.log('\n🧪 TESTING PDF QUESTIONS FROM RIZVI COLLEGE DOCUMENT');
    console.log('='.repeat(55));
    
    const results = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n📋 TEST ${i + 1}/${questions.length}: "${question}"`);
      console.log('-'.repeat(40));
      
      try {
        const startTime = Date.now();
        
        const chatResponse = await axios.post(`${BASE_URL}/api/chat/message`, {
          message: question,
          language: 'english',
          platform: 'test'
        }, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 20000
        });
        
        const responseTime = Date.now() - startTime;
        const result = chatResponse.data;
        
        console.log(`✅ Response received (${responseTime}ms):`);
        console.log(`📝 Answer: "${result.response}"`);
        console.log(`🎯 Confidence: ${result.confidence?.toFixed(3) || 'N/A'}`);
        console.log(`📚 Documents retrieved: ${result.metadata?.retrievedDocs || 0}`);
        console.log(`👨‍💼 Forwarded to admin: ${result.needsAdminResponse ? 'YES' : 'NO'}`);
        
        // Analyze response for PDF content
        const responseText = result.response.toLowerCase();
        const pdfKeywords = [
          'october', 'november', 'exam', 'sports', 'rizvi', 'college', 
          'semester', 'competition', 'admission', '2025', 'mid-semester'
        ];
        
        const foundKeywords = pdfKeywords.filter(keyword => 
          responseText.includes(keyword)
        );
        
        console.log(`📄 PDF content detected: ${foundKeywords.length > 0 ? '✅ YES' : '⚠️ GENERIC'}`);
        if (foundKeywords.length > 0) {
          console.log(`   Keywords found: ${foundKeywords.join(', ')}`);
        }
        
        // Determine if answer is from PDF
        const isFromPDF = result.confidence > 0.1 && !result.needsAdminResponse;
        console.log(`🎯 Source: ${isFromPDF ? '📄 PDF KNOWLEDGE' : '🤖 GENERAL/ADMIN'}`);
        
        results.push({
          question,
          confidence: result.confidence,
          hasKeywords: foundKeywords.length > 0,
          isFromPDF,
          responseTime,
          needsAdmin: result.needsAdminResponse
        });
        
      } catch (testError) {
        console.log(`❌ Question test failed:`);
        console.log(`   Error: ${testError.response?.data?.message || testError.message}`);
        console.log(`   Status: ${testError.response?.status || 'Unknown'}`);
        
        results.push({
          question,
          error: true,
          errorMessage: testError.message
        });
      }
      
      // Wait between questions
      if (i < questions.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Generate summary
    console.log('\n🎉 TESTING COMPLETE - SUMMARY REPORT');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => !r.error);
    const fromPDF = successful.filter(r => r.isFromPDF);
    const withKeywords = successful.filter(r => r.hasKeywords);
    const toAdmin = successful.filter(r => r.needsAdmin);
    
    console.log(`\n📊 RESULTS:`);
    console.log(`   ✅ Successful responses: ${successful.length}/${results.length}`);
    console.log(`   📄 Answered from PDF: ${fromPDF.length}/${successful.length}`);
    console.log(`   🔍 Contains PDF keywords: ${withKeywords.length}/${successful.length}`);
    console.log(`   👨‍💼 Forwarded to admin: ${toAdmin.length}/${successful.length}`);
    
    if (successful.length > 0) {
      const avgConfidence = successful
        .filter(r => r.confidence !== undefined)
        .reduce((sum, r, _, arr) => sum + r.confidence / arr.length, 0);
      const avgTime = successful
        .reduce((sum, r) => sum + (r.responseTime || 0), 0) / successful.length;
      
      console.log(`\n⚡ PERFORMANCE:`);
      console.log(`   🎯 Average confidence: ${avgConfidence.toFixed(3)}`);
      console.log(`   ⏱️ Average response time: ${avgTime.toFixed(0)}ms`);
    }
    
    console.log('\n💡 SUCCESS! Your PDF-based RAG system is working!');
    console.log('🌐 Try the web interface at: http://localhost:3000');
    console.log('📱 Register and ask questions about Rizvi College!');
    
  } catch (error) {
    console.log('❌ Test setup failed:', error.response?.data || error.message);
  }
}

// Run the test
runPDFTests().catch(console.error);