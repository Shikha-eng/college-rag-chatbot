// Process documents for vector embeddings
const mongoose = require('mongoose');
const Document = require('./models/Document');

async function checkAndProcessDocuments() {
  try {
    console.log('🔍 Checking documents in database...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-chatbot');
    console.log('✅ Connected to MongoDB');
    
    // Find all documents
    const documents = await Document.find({ source: 'scraped' });
    console.log(`📊 Found ${documents.length} documents:`);
    
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title} (${doc.metadata?.wordCount || 0} words)`);
    });
    
    console.log('\n✅ Documents are ready for vector processing!');
    console.log('💡 The vector processing will happen when you ask questions through the chat interface.');
    
    // Close connection
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndProcessDocuments();