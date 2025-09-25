const mongoose = require('mongoose');
const LocalVectorDatabaseService = require('./services/localVectorDatabase');
const Document = require('./models/Document');
require('dotenv').config();

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-rag');
        console.log('✅ MongoDB Connected for local vector processing');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function populateLocalVectors() {
    try {
        console.log('🚀 Populating Local Vector Database with PDF Content');
        console.log('=' .repeat(60));
        
        // Connect to database
        await connectDatabase();
        
        // Initialize local vector service
        const vectorService = new LocalVectorDatabaseService();
        await vectorService.initialize();
        
        // Get all PDF documents
        const documents = await Document.find({
            source: 'manual',
            fileType: 'pdf',
            status: 'processed'
        }).sort({ createdAt: 1 });
        
        console.log(`📄 Found ${documents.length} PDF documents to process`);
        
        if (documents.length === 0) {
            console.log('⚠️ No PDF documents found. Make sure you ran extract-pdf.js first.');
            await mongoose.connection.close();
            return;
        }
        
        let processedCount = 0;
        
        // Add all documents to vector service
        for (const doc of documents) {
            console.log(`\n📝 Adding: ${doc.title}`);
            console.log(`   Content length: ${doc.content.length} characters`);
            
            const result = await vectorService.addDocument({
                title: doc.title,
                content: doc.content,
                metadata: {
                    ...doc.metadata,
                    documentId: doc._id.toString(),
                    source: doc.source,
                    fileType: doc.fileType
                }
            });
            
            if (result.success) {
                console.log(`✅ Added successfully`);
                processedCount++;
                
                // Update document in MongoDB
                doc.isEmbedded = true;
                doc.metadata.localVectorProcessedAt = new Date();
                await doc.save();
            } else {
                console.log(`❌ Failed to add: ${result.error}`);
            }
        }
        
        // Build all vectors at once
        console.log('\n🔧 Building TF-IDF vectors for all documents...');
        await vectorService.buildVectors();
        
        // Test the vector search
        console.log('\n🧪 Testing vector search with sample queries...');
        const testQueries = [
            "mid semester exam dates",
            "sports competition",
            "Rizvi College activities",
            "examination schedule",
            "college events"
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Query: "${query}"`);
            const results = await vectorService.similaritySearch(query, { 
                topK: 3, 
                threshold: 0.05 // Lower threshold for better results
            });
            
            console.log(`   📊 Found ${results.totalResults} matches`);
            if (results.results.length > 0) {
                const bestMatch = results.results[0];
                console.log(`   🎯 Best match: "${bestMatch.documentTitle}"`);
                console.log(`   📝 Content: "${bestMatch.content.substring(0, 100)}..."`);
                console.log(`   🔢 Similarity: ${bestMatch.similarity.toFixed(3)}`);
            } else {
                console.log(`   ⚠️ No matches found above threshold`);
            }
        }
        
        // Get final statistics
        const stats = vectorService.getStats();
        
        console.log('\n' + '=' .repeat(60));
        console.log('✅ LOCAL VECTOR DATABASE SETUP COMPLETE!');
        console.log('=' .repeat(60));
        console.log(`📚 Documents processed: ${processedCount}`);
        console.log(`🔍 Total vectors: ${stats.totalVectors}`);
        console.log(`📖 Total documents: ${stats.totalDocuments}`);
        console.log(`📝 Vocabulary size: ${stats.vocabularySize}`);
        console.log(`💾 Index size: ${stats.indexSize} KB`);
        
        console.log('\n🎯 Your PDF content is now ready for intelligent search!');
        console.log('💬 Users can now ask questions about:');
        console.log('   - Exam dates and schedules');
        console.log('   - Sports competitions and events');
        console.log('   - College activities and announcements');
        console.log('   - Any other content from your PDF');
        
        // Close database connection
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        
    } catch (error) {
        console.error('❌ Local vector database setup failed:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

console.log('🚀 Local Vector Database Setup Tool');
console.log(`📅 Started at: ${new Date().toLocaleString()}`);
console.log('🎯 This tool will process your PDF content for intelligent search');
console.log('✨ No external APIs required - everything runs locally!');

populateLocalVectors();