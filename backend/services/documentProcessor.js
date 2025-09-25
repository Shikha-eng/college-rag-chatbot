const Document = require('../models/Document');
const VectorDatabaseService = require('./vectorDatabase');

/**
 * Document Processor Service
 * Handles processing of documents for embedding and chunking
 */
class DocumentProcessor {
  constructor() {
    this.vectorService = new VectorDatabaseService();
    this.isProcessing = false;
    this.processedCount = 0;
    this.failedCount = 0;
  }

  /**
   * Initialize the document processor
   */
  async initialize() {
    console.log('🚀 Initializing Document Processor...');
    await this.vectorService.initialize();
    console.log('✅ Document Processor initialized');
  }

  /**
   * Process all pending documents
   */
  async processPendingDocuments() {
    if (this.isProcessing) {
      console.log('⚠️ Document processing already in progress');
      return;
    }

    this.isProcessing = true;
    this.processedCount = 0;
    this.failedCount = 0;

    try {
      console.log('📄 Finding pending documents...');
      
      // Find documents that need processing
      const pendingDocuments = await Document.find({
        status: { $in: ['pending', 'processing'] },
        isActive: true
      }).select('_id title status');

      console.log(`📋 Found ${pendingDocuments.length} documents to process`);

      if (pendingDocuments.length === 0) {
        console.log('✅ No pending documents to process');
        return;
      }

      // Process documents in batches
      const batchSize = 5;
      
      for (let i = 0; i < pendingDocuments.length; i += batchSize) {
        const batch = pendingDocuments.slice(i, i + batchSize);
        
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pendingDocuments.length / batchSize)}`);
        
        await this.processBatch(batch);
        
        // Delay between batches to avoid overwhelming the system
        if (i + batchSize < pendingDocuments.length) {
          await this.delay(2000);
        }
      }

      console.log(`✅ Document processing completed. Processed: ${this.processedCount}, Failed: ${this.failedCount}`);

    } catch (error) {
      console.error('❌ Document processing failed:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process new documents (recently scraped or uploaded)
   */
  async processNewDocuments() {
    try {
      console.log('🔄 Processing new documents...');
      
      // Find documents that need reprocessing or are new
      const newDocuments = await Document.find({
        $or: [
          { status: 'pending' },
          { needsReprocessing: true }
        ],
        isActive: true
      }).select('_id title status needsReprocessing');

      console.log(`🆕 Found ${newDocuments.length} new/updated documents`);

      if (newDocuments.length === 0) {
        return;
      }

      // Mark documents as processing
      await Document.updateMany(
        { _id: { $in: newDocuments.map(d => d._id) } },
        { 
          status: 'processing',
          needsReprocessing: false
        }
      );

      // Process each document
      for (const doc of newDocuments) {
        try {
          await this.vectorService.processDocument(doc._id);
          this.processedCount++;
          console.log(`✅ Processed: ${doc.title}`);
        } catch (error) {
          this.failedCount++;
          console.error(`❌ Failed to process ${doc.title}:`, error.message);
        }
      }

      console.log(`🔄 New document processing completed. Processed: ${this.processedCount}, Failed: ${this.failedCount}`);

    } catch (error) {
      console.error('❌ New document processing failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of documents
   */
  async processBatch(documents) {
    const promises = documents.map(async (doc) => {
      try {
        // Mark as processing
        await Document.findByIdAndUpdate(doc._id, { status: 'processing' });
        
        // Process the document
        await this.vectorService.processDocument(doc._id);
        
        this.processedCount++;
        console.log(`✅ Processed: ${doc.title}`);
        
      } catch (error) {
        this.failedCount++;
        console.error(`❌ Failed to process ${doc.title}:`, error.message);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Reprocess a specific document
   */
  async reprocessDocument(documentId) {
    try {
      console.log(`🔄 Reprocessing document: ${documentId}`);
      
      const document = await Document.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Mark as processing
      document.status = 'processing';
      document.needsReprocessing = false;
      document.isEmbedded = false;
      document.chunks = [];
      await document.save();

      // Process the document
      const result = await this.vectorService.processDocument(documentId);
      
      console.log(`✅ Reprocessed document: ${document.title}`);
      return result;

    } catch (error) {
      console.error(`❌ Failed to reprocess document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * Get processing statistics
   */
  async getProcessingStats() {
    try {
      const stats = await Document.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const embeddingStats = await Document.aggregate([
        {
          $group: {
            _id: '$isEmbedded',
            count: { $sum: 1 }
          }
        }
      ]);

      const chunkStats = await Document.aggregate([
        {
          $group: {
            _id: null,
            totalChunks: { $sum: '$metadata.chunkCount' },
            totalDocuments: { $sum: 1 },
            averageChunksPerDocument: { $avg: '$metadata.chunkCount' }
          }
        }
      ]);

      return {
        documentsByStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        embeddingStatus: embeddingStats.reduce((acc, stat) => {
          acc[stat._id ? 'embedded' : 'not_embedded'] = stat.count;
          return acc;
        }, {}),
        chunkStatistics: chunkStats[0] || {},
        vectorDatabaseStats: this.vectorService.getStats(),
        currentProcessing: {
          isProcessing: this.isProcessing,
          processedCount: this.processedCount,
          failedCount: this.failedCount
        }
      };

    } catch (error) {
      console.error('❌ Failed to get processing stats:', error);
      throw error;
    }
  }

  /**
   * Clean up failed documents
   */
  async cleanupFailedDocuments() {
    try {
      console.log('🧹 Cleaning up failed documents...');
      
      // Find old failed documents (older than 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const failedDocs = await Document.find({
        status: 'failed',
        updatedAt: { $lt: oneDayAgo }
      }).select('_id title');

      if (failedDocs.length === 0) {
        console.log('✅ No failed documents to clean up');
        return;
      }

      console.log(`🗑️ Found ${failedDocs.length} failed documents to clean up`);

      // Delete failed documents
      const result = await Document.deleteMany({
        _id: { $in: failedDocs.map(d => d._id) }
      });

      console.log(`✅ Cleaned up ${result.deletedCount} failed documents`);
      
      return result.deletedCount;

    } catch (error) {
      console.error('❌ Failed to cleanup failed documents:', error);
      throw error;
    }
  }

  /**
   * Validate document embeddings
   */
  async validateEmbeddings() {
    try {
      console.log('🔍 Validating document embeddings...');
      
      const documents = await Document.find({
        isEmbedded: true,
        status: 'processed'
      }).select('_id title chunks');

      let validCount = 0;
      let invalidCount = 0;

      for (const doc of documents) {
        let docValid = true;
        
        for (const chunk of doc.chunks) {
          if (!chunk.embedding || chunk.embedding.length !== this.vectorService.embeddingDimension) {
            docValid = false;
            break;
          }
        }

        if (docValid) {
          validCount++;
        } else {
          invalidCount++;
          console.log(`❌ Invalid embeddings found in: ${doc.title}`);
          
          // Mark for reprocessing
          await Document.findByIdAndUpdate(doc._id, {
            needsReprocessing: true,
            isEmbedded: false
          });
        }
      }

      console.log(`✅ Embedding validation completed. Valid: ${validCount}, Invalid: ${invalidCount}`);
      
      return { valid: validCount, invalid: invalidCount };

    } catch (error) {
      console.error('❌ Embedding validation failed:', error);
      throw error;
    }
  }

  /**
   * Utility delay function
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get processing status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      processedCount: this.processedCount,
      failedCount: this.failedCount
    };
  }
}

module.exports = DocumentProcessor;