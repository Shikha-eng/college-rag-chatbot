const mongoose = require('mongoose');
const VectorDatabaseService = require('./services/vectorDatabase');
const Document = require('./models/Document');
require('dotenv').config();

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-rag');
        console.log('✅ MongoDB Connected for vector processing');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function generateVectorEmbeddings() {
    try {
        console.log('🚀 Starting PDF Vector Embedding Generation...');
        console.log('=' .repeat(60));
        
        // Connect to database
        await connectDatabase();
        
        // Initialize vector service
        const vectorService = new VectorDatabaseService();
        await vectorService.initialize();
        
        // Get all PDF documents that need processing
        const documents = await Document.find({
            source: 'manual',
            fileType: 'pdf',
            status: 'processed'
        }).sort({ createdAt: 1 });
        
        console.log(`📄 Found ${documents.length} PDF documents to process`);
        
        if (documents.length === 0) {
            console.log('⚠️ No PDF documents found. Make sure you ran extract-pdf.js first.');
            return;
        }
        
        let processedCount = 0;
        let errorCount = 0;
        
        for (const doc of documents) {
            try {
                console.log(`\n📝 Processing: ${doc.title}`);
                console.log(`   Content length: ${doc.content.length} characters`);
                
                // Add document to vector database
                const result = await vectorService.addDocument({
                    title: doc.title,
                    content: doc.content,
                    metadata: {
                        ...doc.metadata,
                        documentId: doc._id.toString()
                    }
                });
                
                console.log(`✅ Added to vector database with ${result.chunkCount} chunks`);
                
                // Update document status to indicate it has embeddings
                doc.isEmbedded = true;
                doc.status = 'processed';
                doc.metadata.vectorProcessedAt = new Date();
                doc.metadata.chunkCount = result.chunkCount;
                
                await doc.save();
                processedCount++;
                
                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`❌ Error processing ${doc.title}:`, error.message);
                errorCount++;
            }
        }
        
        // Get vector database stats
        const stats = vectorService.getStats();
        
        console.log('\n' + '=' .repeat(60));
        console.log('📊 VECTOR EMBEDDING GENERATION COMPLETE');
        console.log('=' .repeat(60));
        console.log(`✅ Successfully processed: ${processedCount} documents`);
        console.log(`❌ Failed to process: ${errorCount} documents`);
        console.log(`🔍 Total vectors in database: ${stats.totalVectors}`);
        console.log(`📚 Total document chunks: ${stats.totalChunks}`);
        console.log(`💾 Vector index size: ${stats.indexSize} KB`);
        
        // Test vector search with a sample query
        console.log('\n🧪 Testing vector search...');
        const testQueries = [
            "mid semester exam dates",
            "sports competition schedule", 
            "Rizvi College information"
        ];
        
        for (const query of testQueries) {
            console.log(`\n🔍 Query: "${query}"`);
            const results = await vectorService.similaritySearch(query, { topK: 3 });
            
            console.log(`   Found ${results.totalResults} results`);
            if (results.results.length > 0) {
                console.log(`   Best match: "${results.results[0].content.substring(0, 100)}..."`);
                console.log(`   Similarity: ${results.results[0].similarity.toFixed(3)}`);
            }
        }
        
        // Close database connection
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
        console.log('🎯 PDF content is now ready for vector search!');
        
    } catch (error) {
        console.error('❌ Vector embedding generation failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Add more detailed logging for debugging
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

console.log('🚀 PDF Vector Embedding Generator');
console.log(`📅 Started at: ${new Date().toLocaleString()}`);
console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);

// Run the embedding generation
generateVectorEmbeddings();