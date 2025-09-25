const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Document = require('./models/Document');

// PDF file path - adjust this to match your file location
const PDF_PATH = path.join(__dirname, '..', '..', 'rizvi_college_info (1).pdf');

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-rag');
        console.log('✅ MongoDB Connected for PDF processing');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        process.exit(1);
    }
}

async function extractPDFText() {
    try {
        console.log('📄 Reading PDF file:', PDF_PATH);
        
        // Check if file exists
        if (!fs.existsSync(PDF_PATH)) {
            console.error('❌ PDF file not found:', PDF_PATH);
            return null;
        }
        
        // Read the PDF file
        const dataBuffer = fs.readFileSync(PDF_PATH);
        
        // Extract text from PDF
        const data = await pdf(dataBuffer);
        
        console.log('📝 PDF Info:');
        console.log(`- Pages: ${data.numpages}`);
        console.log(`- Text length: ${data.text.length} characters`);
        
        return data.text;
    } catch (error) {
        console.error('❌ Error extracting PDF text:', error.message);
        return null;
    }
}

function chunkText(text, maxChunkSize = 1000) {
    // Split text into meaningful chunks
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const chunks = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
        const cleanParagraph = paragraph.trim().replace(/\s+/g, ' ');
        
        if (currentChunk.length + cleanParagraph.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = cleanParagraph;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + cleanParagraph;
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(chunk => chunk.length > 50); // Filter out very short chunks
}

async function clearOldRizviData() {
    try {
        console.log('🗑️ Clearing old Rizvi College data...');
        const result = await Document.deleteMany({
            $or: [
                { title: /rizvi/i },
                { content: /rizvi/i },
                { sourceUrl: /rizvi/i }
            ]
        });
        console.log(`✅ Deleted ${result.deletedCount} old documents`);
    } catch (error) {
        console.error('❌ Error clearing old data:', error.message);
    }
}

async function saveToDatabase(textChunks) {
    try {
        console.log('💾 Saving PDF content to database...');
        
        // Clear old Rizvi data first
        await clearOldRizviData();
        
        const documents = [];
        
        for (let i = 0; i < textChunks.length; i++) {
            const chunk = textChunks[i];
            
            // Generate a meaningful title based on content
            const firstLine = chunk.split('\n')[0].trim();
            const title = firstLine.length > 100 
                ? `Rizvi College Info - Section ${i + 1}` 
                : firstLine || `Rizvi College Info - Section ${i + 1}`;
            
            const document = new Document({
                title: title,
                content: chunk,
                source: 'manual',
                fileType: 'pdf',
                originalFileName: 'rizvi_college_info (1).pdf',
                contentType: 'academic',
                language: 'english',
                metadata: {
                    source: 'PDF Document',
                    section: i + 1,
                    totalSections: textChunks.length,
                    extractedAt: new Date(),
                    wordCount: chunk.split(/\s+/).length,
                    keywords: ['Rizvi College', 'Engineering', 'Education']
                },
                status: 'processed',
                isActive: true,
                isEmbedded: false
            });
            
            documents.push(document);
        }
        
        // Save all documents
        const savedDocs = await Document.insertMany(documents);
        console.log(`✅ Saved ${savedDocs.length} PDF sections to database`);
        
        return savedDocs;
    } catch (error) {
        console.error('❌ Error saving to database:', error.message);
        return [];
    }
}

async function main() {
    try {
        console.log('🚀 Starting PDF extraction process...');
        
        // Connect to database
        await connectDatabase();
        
        // Extract text from PDF
        const pdfText = await extractPDFText();
        
        if (!pdfText) {
            console.error('❌ Failed to extract PDF text');
            return;
        }
        
        // Split text into chunks
        const chunks = chunkText(pdfText);
        console.log(`📚 Created ${chunks.length} text chunks`);
        
        // Show first chunk preview
        if (chunks.length > 0) {
            console.log('\n📖 First chunk preview:');
            console.log('=' .repeat(50));
            console.log(chunks[0].substring(0, 200) + '...');
            console.log('=' .repeat(50));
        }
        
        // Save to database
        const savedDocs = await saveToDatabase(chunks);
        
        console.log('\n✅ PDF extraction completed successfully!');
        console.log(`📊 Statistics:`);
        console.log(`- Total text length: ${pdfText.length} characters`);
        console.log(`- Number of chunks: ${chunks.length}`);
        console.log(`- Saved documents: ${savedDocs.length}`);
        
        // Close database connection
        await mongoose.connection.close();
        console.log('👋 Database connection closed');
        
    } catch (error) {
        console.error('❌ Main process error:', error.message);
        process.exit(1);
    }
}

// Run the extraction
main();