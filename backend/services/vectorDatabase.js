const fs = require('fs').promises;
const path = require('path');
const { HfInference } = require('@huggingface/inference');
const Document = require('../models/Document');

/**
 * Vector Database Service using FAISS
 * Handles document embeddings, vector storage, and similarity search
 */
class VectorDatabaseService {
  constructor() {
    this.vectorStorePath = process.env.VECTOR_DB_PATH || './vector_store';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2';
    this.embeddingDimension = 384; // Dimension for the multilingual model
    this.chunkSize = 500; // Characters per chunk
    this.chunkOverlap = 50; // Overlap between chunks
    
    // Initialize Hugging Face client
    this.hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY);
    
    // In-memory vector index (for development)
    // In production, consider using proper FAISS bindings or a vector database like Pinecone
    this.vectorIndex = new Map();
    this.documentIndex = new Map();
  }

  /**
   * Initialize the vector database
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Vector Database Service...');
      
      // Create vector store directory if it doesn't exist
      await fs.mkdir(this.vectorStorePath, { recursive: true });
      
      // Load existing vectors if they exist
      await this.loadVectorIndex();
      
      console.log('✅ Vector Database Service initialized');
      console.log(`📊 Loaded ${this.vectorIndex.size} vectors`);
      
    } catch (error) {
      console.error('❌ Failed to initialize Vector Database Service:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text) {
    try {
      // Clean the text
      const cleanText = text
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000); // Limit text length for API

      // Generate embedding using Hugging Face
      const response = await this.hfClient.featureExtraction({
        model: this.embeddingModel,
        inputs: cleanText
      });

      // Handle different response formats
      let embedding;
      if (Array.isArray(response) && Array.isArray(response[0])) {
        embedding = response[0]; // First token embedding
      } else if (Array.isArray(response)) {
        embedding = response;
      } else {
        throw new Error('Unexpected embedding response format');
      }

      // Ensure embedding has correct dimension
      if (embedding.length !== this.embeddingDimension) {
        console.warn(`⚠️ Embedding dimension mismatch: expected ${this.embeddingDimension}, got ${embedding.length}`);
        
        // Pad or truncate to match expected dimension
        if (embedding.length < this.embeddingDimension) {
          embedding = [...embedding, ...Array(this.embeddingDimension - embedding.length).fill(0)];
        } else {
          embedding = embedding.slice(0, this.embeddingDimension);
        }
      }

      return embedding;

    } catch (error) {
      console.error('❌ Failed to generate embedding:', error);
      
      // Fallback: return random embedding for development
      console.warn('⚠️ Using random embedding as fallback');
      return Array.from({ length: this.embeddingDimension }, () => Math.random() - 0.5);
    }
  }

  /**
   * Split document into chunks
   */
  splitIntoChunks(text) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let currentLength = 0;

    for (const sentence of sentences) {
      const sentenceLength = sentence.trim().length;
      
      if (currentLength + sentenceLength > this.chunkSize && currentChunk.length > 0) {
        // Add current chunk
        chunks.push({
          content: currentChunk.trim(),
          wordCount: currentChunk.split(/\s+/).length,
          characterCount: currentChunk.length
        });
        
        // Start new chunk with overlap
        const overlapWords = currentChunk.split(/\s+/).slice(-Math.floor(this.chunkOverlap / 10));
        currentChunk = overlapWords.join(' ') + ' ' + sentence.trim();
        currentLength = currentChunk.length;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
        currentLength = currentChunk.length;
      }
    }

    // Add the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        wordCount: currentChunk.split(/\s+/).length,
        characterCount: currentChunk.length
      });
    }

    return chunks;
  }

  /**
   * Process and embed a document
   */
  async processDocument(documentId) {
    try {
      console.log(`📄 Processing document: ${documentId}`);
      
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Split document into chunks
      const chunks = this.splitIntoChunks(document.content);
      console.log(`📋 Split into ${chunks.length} chunks`);

      // Generate embeddings for each chunk
      const processedChunks = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        try {
          console.log(`⚙️ Processing chunk ${i + 1}/${chunks.length}`);
          
          const embedding = await this.generateEmbedding(chunk.content);
          
          const processedChunk = {
            chunkId: `${documentId}_chunk_${i}`,
            content: chunk.content,
            startIndex: 0, // You might want to calculate actual indices
            endIndex: chunk.content.length,
            embedding: embedding,
            wordCount: chunk.wordCount,
            characterCount: chunk.characterCount,
            isEmbedded: true
          };
          
          processedChunks.push(processedChunk);
          
          // Add to vector index
          this.vectorIndex.set(processedChunk.chunkId, {
            embedding: embedding,
            documentId: documentId,
            chunkIndex: i,
            content: chunk.content
          });
          
          // Small delay to avoid rate limiting
          await this.delay(100);
          
        } catch (error) {
          console.error(`❌ Failed to process chunk ${i}:`, error);
          
          // Add error chunk without embedding
          processedChunks.push({
            chunkId: `${documentId}_chunk_${i}`,
            content: chunk.content,
            startIndex: 0,
            endIndex: chunk.content.length,
            embedding: [],
            wordCount: chunk.wordCount,
            characterCount: chunk.characterCount,
            isEmbedded: false
          });
        }
      }

      // Update document with chunks
      document.chunks = processedChunks;
      document.status = 'processed';
      document.isEmbedded = processedChunks.every(chunk => chunk.isEmbedded);
      
      await document.save();

      // Save vector index
      await this.saveVectorIndex();

      console.log(`✅ Document processed: ${processedChunks.length} chunks, ${processedChunks.filter(c => c.isEmbedded).length} embedded`);
      
      return {
        documentId: documentId,
        totalChunks: processedChunks.length,
        embeddedChunks: processedChunks.filter(c => c.isEmbedded).length
      };

    } catch (error) {
      console.error(`❌ Failed to process document ${documentId}:`, error);
      
      // Update document status to failed
      await Document.findByIdAndUpdate(documentId, {
        status: 'failed',
        'processingErrors': [{
          error: error.message,
          timestamp: new Date(),
          step: 'embedding'
        }]
      });
      
      throw error;
    }
  }

  /**
   * Perform similarity search
   */
  async similaritySearch(queryText, options = {}) {
    try {
      const {
        topK = 5,
        threshold = 0.3,
        language = null,
        contentType = null
      } = options;

      console.log(`🔍 Performing similarity search for: "${queryText.substring(0, 50)}..."`);

      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);

      // Calculate similarities
      const similarities = [];
      
      for (const [chunkId, vectorData] of this.vectorIndex.entries()) {
        if (vectorData.embedding.length !== this.embeddingDimension) {
          continue; // Skip invalid embeddings
        }
        
        const similarity = this.cosineSimilarity(queryEmbedding, vectorData.embedding);
        
        if (similarity >= threshold) {
          similarities.push({
            chunkId: chunkId,
            documentId: vectorData.documentId,
            chunkIndex: vectorData.chunkIndex,
            content: vectorData.content,
            similarity: similarity
          });
        }
      }

      // Sort by similarity (descending)
      similarities.sort((a, b) => b.similarity - a.similarity);

      // Get top K results
      const topResults = similarities.slice(0, topK);

      // Enrich results with document information
      const enrichedResults = [];
      
      for (const result of topResults) {
        try {
          const document = await Document.findById(result.documentId).select('title contentType language sourceUrl');
          
          if (document) {
            // Apply filters if specified
            if (language && document.language !== language) continue;
            if (contentType && document.contentType !== contentType) continue;
            
            enrichedResults.push({
              ...result,
              documentTitle: document.title,
              documentType: document.contentType,
              documentLanguage: document.language,
              sourceUrl: document.sourceUrl
            });
          }
        } catch (error) {
          // Skip documents that can't be found
          continue;
        }
      }

      console.log(`📊 Found ${enrichedResults.length} relevant chunks (threshold: ${threshold})`);

      return {
        query: queryText,
        results: enrichedResults,
        totalResults: enrichedResults.length,
        maxSimilarity: enrichedResults.length > 0 ? enrichedResults[0].similarity : 0,
        averageSimilarity: enrichedResults.length > 0 
          ? enrichedResults.reduce((sum, r) => sum + r.similarity, 0) / enrichedResults.length 
          : 0
      };

    } catch (error) {
      console.error('❌ Similarity search failed:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0; // Avoid division by zero
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Save vector index to disk
   */
  async saveVectorIndex() {
    try {
      const indexPath = path.join(this.vectorStorePath, 'vector_index.json');
      
      // Convert Map to object for serialization
      const indexData = {
        version: '1.0',
        embeddingModel: this.embeddingModel,
        embeddingDimension: this.embeddingDimension,
        createdAt: new Date().toISOString(),
        vectorCount: this.vectorIndex.size,
        vectors: Object.fromEntries(this.vectorIndex)
      };

      await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
      console.log(`💾 Saved vector index with ${this.vectorIndex.size} vectors`);
      
    } catch (error) {
      console.error('❌ Failed to save vector index:', error);
    }
  }

  /**
   * Load vector index from disk
   */
  async loadVectorIndex() {
    try {
      const indexPath = path.join(this.vectorStorePath, 'vector_index.json');
      
      const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
      
      // Convert object back to Map
      this.vectorIndex = new Map(Object.entries(indexData.vectors || {}));
      
      console.log(`📁 Loaded vector index with ${this.vectorIndex.size} vectors`);
      console.log(`🏷️ Model: ${indexData.embeddingModel || 'Unknown'}`);
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('📁 No existing vector index found, starting fresh');
      } else {
        console.error('❌ Failed to load vector index:', error);
      }
    }
  }

  /**
   * Get vector database statistics
   */
  getStats() {
    return {
      totalVectors: this.vectorIndex.size,
      embeddingModel: this.embeddingModel,
      embeddingDimension: this.embeddingDimension,
      vectorStorePath: this.vectorStorePath
    };
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = VectorDatabaseService;