const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Document = require('./models/Document');

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-rag');
        console.log('✅ MongoDB Connected for verification');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function checkPDFDocuments() {
    try {
        console.log('🔍 Checking PDF documents in database...\n');
        
        // Get all documents with PDF content
        const documents = await Document.find({
            source: 'manual',
            fileType: 'pdf'
        }).sort({ createdAt: 1 });
        
        console.log(`📊 Found ${documents.length} PDF-based documents`);
        
        let totalWordCount = 0;
        
        documents.forEach((doc, index) => {
            console.log(`\n📄 Document ${index + 1}:`);
            console.log(`- Title: ${doc.title}`);
            console.log(`- Content length: ${doc.content.length} characters`);
            console.log(`- Word count: ${doc.metadata.wordCount || 'N/A'}`);
            console.log(`- Status: ${doc.status}`);
            console.log(`- Content preview: ${doc.content.substring(0, 100)}...`);
            
            totalWordCount += (doc.metadata.wordCount || 0);
        });
        
        console.log(`\n📈 Total Statistics:`);
        console.log(`- Total documents: ${documents.length}`);
        console.log(`- Total word count: ${totalWordCount}`);
        console.log(`- Average words per document: ${Math.round(totalWordCount / documents.length)}`);
        
        // Show first few titles for verification
        console.log(`\n📋 Document Titles:`);
        documents.slice(0, 5).forEach((doc, index) => {
            console.log(`${index + 1}. ${doc.title}`);
        });
        
        if (documents.length > 5) {
            console.log(`... and ${documents.length - 5} more documents`);
        }
        
    } catch (error) {
        console.error('❌ Error checking documents:', error.message);
    }
}

async function main() {
    try {
        await connectDatabase();
        await checkPDFDocuments();
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    } catch (error) {
        console.error('❌ Main process error:', error.message);
        process.exit(1);
    }
}

main();