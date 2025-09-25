const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Simple test questions from the PDF
const testQuestions = [
  "When are the mid-semester exams?",
  "What sports competitions are happening?", 
  "Tell me about college activities",
  "What is the admission process?",
  "What courses does Rizvi College offer?"
];

async function testDirectRAG() {
  console.log('🚀 Direct RAG System Test (No Auth Required)');
  console.log('=' .repeat(50));
  
  try {
    // Test the RAG service directly by importing it
    const path = require('path');
    const ragServicePath = path.join(__dirname, 'services', 'rag.js');
    const { searchSimilarContent } = require(ragServicePath);
    
    for (let i = 0; i < testQuestions.length; i++) {
      const question = testQuestions[i];
      console.log(`\n📋 TEST ${i + 1}: "${question}"`);
      console.log('-'.repeat(40));
      
      try {
        const startTime = Date.now();
        const ragResult = await searchSimilarContent(question, 'english');
        const responseTime = Date.now() - startTime;
        
        console.log(`✅ Response (${responseTime}ms):`);
        console.log(`📝 Answer: "${ragResult.response}"`);
        console.log(`🎯 Confidence: ${ragResult.confidence?.toFixed(3) || 'N/A'}`);
        console.log(`📚 Sources: ${ragResult.sources?.length || 0} documents`);
        console.log(`👨‍💼 Needs Admin: ${ragResult.needsAdminResponse ? 'YES' : 'NO'}`);
        
        // Show source documents if available
        if (ragResult.sources && ragResult.sources.length > 0) {
          console.log('📖 Source snippets:');
          ragResult.sources.forEach((source, idx) => {
            const snippet = source.content?.substring(0, 100) || 'No content';
            console.log(`   ${idx + 1}. "${snippet}..."`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Test failed: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Direct RAG testing complete!');
    
  } catch (error) {
    console.log('❌ Could not import RAG service:', error.message);
    console.log('📝 Trying HTTP endpoint test...');
    await testHTTPEndpoint();
  }
}

async function testHTTPEndpoint() {
  console.log('\n🌐 Testing HTTP Endpoint (Public Access)');
  console.log('-'.repeat(40));
  
  for (const question of testQuestions.slice(0, 2)) { // Test first 2 questions
    try {
      console.log(`\n❓ Testing: "${question}"`);
      
      const response = await axios.post(
        `${BASE_URL}/api/chat/message`,
        {
          message: question,
          language: 'english',
          platform: 'test'
        },
        {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log(`✅ Response: "${response.data.response}"`);
      console.log(`🎯 Confidence: ${response.data.confidence?.toFixed(3) || 'N/A'}`);
      
    } catch (error) {
      console.log(`❌ HTTP test failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test vector database directly
async function testVectorDatabase() {
  console.log('\n🔍 Testing Vector Database Directly');
  console.log('-'.repeat(40));
  
  try {
    const path = require('path');
    const LocalVectorDatabaseService = require('./services/LocalVectorDatabaseService');
    
    const vectorDB = new LocalVectorDatabaseService();
    await vectorDB.initialize();
    
    const testQuery = "exam dates";
    console.log(`🔍 Searching for: "${testQuery}"`);
    
    const results = await vectorDB.search(testQuery, 3);
    
    console.log(`📊 Found ${results.length} results:`);
    results.forEach((result, index) => {
      console.log(`${index + 1}. Score: ${result.score.toFixed(3)} - "${result.content.substring(0, 150)}..."`);
    });
    
  } catch (error) {
    console.log(`❌ Vector DB test failed: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Comprehensive PDF System Testing');
  console.log('='.repeat(50));
  console.log(`📅 ${new Date().toLocaleString()}`);
  
  await testVectorDatabase();
  await testDirectRAG();
}

runAllTests().catch(console.error);