const fs = require('fs').promises;
const path = require('path');
const Document = require('../models/Document');

/**
 * Simple Local Vector Database Service
 * Uses TF-IDF and cosine similarity for document retrieval without external APIs
 */
class LocalVectorDatabaseService {
  constructor() {
    this.vectorStorePath = process.env.VECTOR_DB_PATH || './data/vectors';
    this.embeddingDimension = 100; // Simplified local embedding dimension
    
    // In-memory vector index for development
    this.vectorIndex = new Map(); // documentId -> embedding
    this.documentIndex = new Map(); // documentId -> document metadata
    this.vocabulary = new Map(); // word -> index
    this.idf = new Map(); // word -> inverse document frequency
    this.processedDocuments = new Set();
  }

  /**
   * Initialize the vector database
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Local Vector Database Service...');
      
      // Create vector store directory
      await fs.mkdir(this.vectorStorePath, { recursive: true });
      
      // Load existing vectors if they exist
      await this.loadVectorIndex();
      
      console.log('✅ Local Vector Database Service initialized');
      console.log(`📊 Loaded ${this.vectorIndex.size} vectors`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Local Vector Database Service:', error);
      return false;
    }
  }

  /**
   * Simple text preprocessing
   */
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter(word => word.length > 2); // Remove short words
  }

  /**
   * Build vocabulary from all documents
   */
  buildVocabulary(documents) {
    const wordCounts = new Map();
    let vocabIndex = 0;
    
    // Count word occurrences across all documents
    for (const doc of documents) {
      const words = this.preprocessText(doc.content);
      const uniqueWords = new Set(words);
      
      for (const word of uniqueWords) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }
    
    // Build vocabulary (only include words that appear in at least 2 documents)
    for (const [word, count] of wordCounts) {
      if (count >= 2 && !this.vocabulary.has(word)) {
        this.vocabulary.set(word, vocabIndex++);
      }
    }
    
    // Calculate IDF for each word
    const totalDocs = documents.length;
    for (const [word, docCount] of wordCounts) {
      if (this.vocabulary.has(word)) {
        this.idf.set(word, Math.log(totalDocs / docCount));
      }
    }
    
    console.log(`📚 Built vocabulary with ${this.vocabulary.size} words`);
  }

  /**
   * Generate TF-IDF vector for text
   */
  generateTFIDFVector(text) {
    const words = this.preprocessText(text);
    const wordCounts = new Map();
    
    // Count word frequencies in this text
    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
    
    // Create TF-IDF vector
    const vector = new Array(this.vocabulary.size).fill(0);
    const totalWords = words.length;
    
    for (const [word, count] of wordCounts) {
      if (this.vocabulary.has(word)) {
        const index = this.vocabulary.get(word);
        const tf = count / totalWords; // Term frequency
        const idf = this.idf.get(word) || 1; // Inverse document frequency
        vector[index] = tf * idf;
      }
    }
    
    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude;
      }
    }
    
    return vector;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Add document to vector database
   */
  async addDocument(documentData) {
    try {
      const { title, content, metadata } = documentData;
      const docId = metadata.documentId || Date.now().toString();
      
      // Store document metadata
      this.documentIndex.set(docId, {
        title,
        content: content.substring(0, 500), // Store preview
        fullContent: content,
        metadata,
        addedAt: new Date()
      });
      
      console.log(`📄 Added document: ${title} (ID: ${docId})`);
      this.processedDocuments.add(docId);
      
      return {
        documentId: docId,
        chunkCount: 1,
        success: true
      };
      
    } catch (error) {
      console.error('❌ Failed to add document:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build vectors after all documents are added
   */
  async buildVectors() {
    try {
      console.log('🔧 Building TF-IDF vectors...');
      
      const documents = Array.from(this.documentIndex.values());
      if (documents.length === 0) {
        console.log('⚠️ No documents to process');
        return;
      }
      
      // Build vocabulary
      this.buildVocabulary(documents);
      
      // Generate vectors for all documents
      for (const [docId, doc] of this.documentIndex) {
        const vector = this.generateTFIDFVector(doc.fullContent);
        this.vectorIndex.set(docId, vector);
      }
      
      console.log(`✅ Generated ${this.vectorIndex.size} document vectors`);
      
      // Save to disk
      await this.saveVectorIndex();
      
    } catch (error) {
      console.error('❌ Failed to build vectors:', error);
    }
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(query, options = {}) {
    try {
      const { topK = 5, threshold = 0.1 } = options;
      
      if (this.vectorIndex.size === 0) {
        console.log('⚠️ No vectors in database, building now...');
        await this.buildVectors();
      }
      
      // Generate query vector
      const queryVector = this.generateTFIDFVector(query);
      const results = [];
      
      // Calculate similarity with all documents
      for (const [docId, docVector] of this.vectorIndex) {
        const similarity = this.cosineSimilarity(queryVector, docVector);
        
        if (similarity >= threshold) {
          const docInfo = this.documentIndex.get(docId);
          results.push({
            documentId: docId,
            documentTitle: docInfo?.title || 'Unknown',
            content: docInfo?.content || '',
            fullContent: docInfo?.fullContent || '',
            similarity: similarity,
            metadata: docInfo?.metadata || {}
          });
        }
      }
      
      // Sort by similarity and take top K
      results.sort((a, b) => b.similarity - a.similarity);
      const topResults = results.slice(0, topK);
      
      const maxSimilarity = topResults.length > 0 ? topResults[0].similarity : 0;
      const avgSimilarity = topResults.length > 0 
        ? topResults.reduce((sum, r) => sum + r.similarity, 0) / topResults.length 
        : 0;
      
      console.log(`🔍 Found ${results.length} matches above threshold ${threshold}`);
      console.log(`📊 Max similarity: ${maxSimilarity.toFixed(3)}, Avg: ${avgSimilarity.toFixed(3)}`);
      
      return {
        query: query,
        results: topResults,
        totalResults: results.length,
        maxSimilarity: maxSimilarity,
        averageSimilarity: avgSimilarity
      };
      
    } catch (error) {
      console.error('❌ Similarity search failed:', error);
      return {
        query: query,
        results: [],
        totalResults: 0,
        maxSimilarity: 0,
        averageSimilarity: 0
      };
    }
  }

  /**
   * Save vector index to disk
   */
  async saveVectorIndex() {
    try {
      const indexPath = path.join(this.vectorStorePath, 'local-vector-index.json');
      const vocabPath = path.join(this.vectorStorePath, 'vocabulary.json');
      
      await fs.writeFile(indexPath, JSON.stringify({
        vectors: Object.fromEntries(this.vectorIndex),
        documents: Object.fromEntries(this.documentIndex),
        savedAt: new Date().toISOString()
      }), 'utf8');
      
      await fs.writeFile(vocabPath, JSON.stringify({
        vocabulary: Object.fromEntries(this.vocabulary),
        idf: Object.fromEntries(this.idf)
      }), 'utf8');
      
      console.log('💾 Vector index saved to disk');
    } catch (error) {
      console.warn('⚠️ Failed to save vector index:', error.message);
    }
  }

  /**
   * Load vector index from disk
   */
  async loadVectorIndex() {
    try {
      const indexPath = path.join(this.vectorStorePath, 'local-vector-index.json');
      const vocabPath = path.join(this.vectorStorePath, 'vocabulary.json');
      
      if (await fs.access(indexPath).then(() => true).catch(() => false)) {
        const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
        this.vectorIndex = new Map(Object.entries(indexData.vectors || {}));
        this.documentIndex = new Map(Object.entries(indexData.documents || {}));
        console.log('📁 Loaded existing vector index from disk');
      }
      
      if (await fs.access(vocabPath).then(() => true).catch(() => false)) {
        const vocabData = JSON.parse(await fs.readFile(vocabPath, 'utf8'));
        this.vocabulary = new Map(Object.entries(vocabData.vocabulary || {}));
        this.idf = new Map(Object.entries(vocabData.idf || {}));
        console.log('📚 Loaded vocabulary from disk');
      } else {
        console.log('📁 No existing vector index found, starting fresh');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to load vector index:', error.message);
      console.log('📁 Starting with empty vector index');
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalVectors: this.vectorIndex.size,
      totalDocuments: this.documentIndex.size,
      vocabularySize: this.vocabulary.size,
      indexSize: Math.round((JSON.stringify(Object.fromEntries(this.vectorIndex)).length) / 1024)
    };
  }
}

module.exports = LocalVectorDatabaseService;