const axios = require('axios');

async function testFixedPDFAnswering() {
  try {
    console.log('🧪 Testing Fixed PDF Question Answering System');
    console.log('='.repeat(50));
    
    // Register test user
    const email = `pdffix${Date.now()}@test.com`;
    console.log(`👤 Registering user: ${email}`);
    
    const authResponse = await axios.post('http://localhost:5000/api/auth/register', {
      name: 'PDF Fix Test',
      email: email,
      password: 'Test123456',
      whatsappNumber: '+1234567890'
    });
    
    console.log('✅ User registered successfully');
    const token = authResponse.data.token;
    
    // Test PDF questions
    const questions = [
      'When are the mid-semester exams?',
      'What sports competitions are happening?',
      'Tell me about college activities'
    ];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\n🧪 TEST ${i + 1}: ${question}`);
      console.log('-'.repeat(40));
      
      try {
        const chatResponse = await axios.post('http://localhost:5000/api/chat/message', {
          message: question,
          language: 'english',
          platform: 'web'
        }, {
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 15000
        });
        
        const result = chatResponse.data;
        console.log('✅ SUCCESS!');
        console.log(`📝 Answer: "${result.response}"`);
        console.log(`🎯 Confidence: ${result.confidence}`);
        console.log(`📈 Strategy: ${result.metadata?.strategy}`);
        console.log(`👨‍💼 Admin needed: ${result.needsAdminResponse ? 'YES' : 'NO'}`);
        console.log(`📚 Retrieved docs: ${result.metadata?.retrievedDocs}`);
        
        // Check if answer contains PDF content
        const hasRelevantInfo = result.response.toLowerCase().includes('october') || 
                               result.response.toLowerCase().includes('november') ||
                               result.response.toLowerCase().includes('sports') ||
                               result.response.toLowerCase().includes('exam');
        
        console.log(`📄 Contains PDF info: ${hasRelevantInfo ? '✅ YES' : '⚠️ NO'}`);
        
      } catch (testError) {
        console.log(`❌ Test ${i + 1} failed:`, testError.response?.data || testError.message);
      }
    }
    
    console.log('\n🎉 PDF TESTING COMPLETE!');
    console.log('🌐 Now test interactively at: http://localhost:3000');
    
  } catch (error) {
    console.log('❌ Setup failed:', error.response?.data || error.message);
  }
}

testFixedPDFAnswering();