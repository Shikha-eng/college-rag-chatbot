const mongoose = require('mongoose');

/**
 * Document Schema
 * Stores scraped and uploaded documents with embeddings
 */
const documentSchema = new mongoose.Schema({
  // Document Identification
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  // Content
  content: {
    type: String,
    required: true,
    maxlength: [50000, 'Content cannot exceed 50000 characters']
  },
  
  // Source Information
  source: {
    type: String,
    required: true,
    enum: ['scraped', 'uploaded', 'manual', 'api']
  },
  
  sourceUrl: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+/.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  
  // File Information (for uploaded documents)
  originalFileName: String,
  fileType: {
    type: String,
    enum: ['pdf', 'doc', 'docx', 'txt', 'html', 'webpage']
  },
  filePath: String,
  fileSize: Number, // in bytes
  
  // Content Processing
  contentType: {
    type: String,
    enum: ['text', 'faq', 'announcement', 'policy', 'academic', 'event', 'contact'],
    default: 'text'
  },
  
  // Language Information
  language: {
    type: String,
    enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari', 'mixed'],
    default: 'english'
  },
  
  detectedLanguages: [{
    language: String,
    confidence: Number
  }],
  
  // Document Chunks (for vector storage)
  chunks: [{
    chunkId: {
      type: String,
      required: true
    },
    content: {
      type: String,
      required: true
    },
    startIndex: Number,
    endIndex: Number,
    
    // Vector embeddings
    embedding: {
      type: [Number], // Array of numbers for vector
      validate: {
        validator: function(v) {
          return v.length === 384; // Assuming 384-dimensional embeddings
        },
        message: 'Embedding must be 384 dimensions'
      }
    },
    
    // Chunk metadata
    wordCount: Number,
    characterCount: Number,
    
    // Processing status
    isEmbedded: {
      type: Boolean,
      default: false
    }
  }],
  
  // Document Metadata
  metadata: {
    // Scraping metadata
    scrapedAt: Date,
    lastScrapedAt: Date,
    scrapeFrequency: String, // daily, weekly, monthly
    
    // Processing metadata
    wordCount: Number,
    characterCount: Number,
    chunkCount: Number,
    
    // Content analysis
    keywords: [String],
    categories: [String],
    importance: {
      type: Number,
      min: 1,
      max: 10,
      default: 5
    },
    
    // Version control
    version: {
      type: Number,
      default: 1
    },
    previousVersions: [{
      version: Number,
      content: String,
      updatedAt: Date
    }]
  },
  
  // Status and Processing
  status: {
    type: String,
    enum: ['pending', 'processing', 'processed', 'failed', 'archived'],
    default: 'pending'
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Processing flags
  isEmbedded: {
    type: Boolean,
    default: false
  },
  
  needsReprocessing: {
    type: Boolean,
    default: false
  },
  
  // Error tracking
  processingErrors: [{
    error: String,
    timestamp: Date,
    step: String // chunking, embedding, etc.
  }],
  
  // Usage Analytics
  queryCount: {
    type: Number,
    default: 0
  },
  
  lastQueried: Date,
  
  // Admin Information
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better performance
documentSchema.index({ source: 1, status: 1 });
documentSchema.index({ language: 1, isActive: 1 });
documentSchema.index({ contentType: 1 });
documentSchema.index({ 'metadata.keywords': 1 });
documentSchema.index({ sourceUrl: 1 });
documentSchema.index({ createdAt: -1 });

// Text search index
documentSchema.index({ 
  title: 'text', 
  content: 'text', 
  'metadata.keywords': 'text' 
});

// Pre-save middleware to update timestamps and metadata
documentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Update metadata
  if (this.content) {
    this.metadata.wordCount = this.content.split(/\s+/).length;
    this.metadata.characterCount = this.content.length;
    this.metadata.chunkCount = this.chunks.length;
  }
  
  next();
});

// Instance method to add chunk
documentSchema.methods.addChunk = function(chunkData) {
  const chunk = {
    chunkId: new mongoose.Types.ObjectId().toString(),
    ...chunkData,
    wordCount: chunkData.content.split(/\s+/).length,
    characterCount: chunkData.content.length
  };
  
  this.chunks.push(chunk);
  return chunk;
};

// Instance method to get embedding status
documentSchema.methods.getEmbeddingStatus = function() {
  const totalChunks = this.chunks.length;
  const embeddedChunks = this.chunks.filter(chunk => chunk.isEmbedded).length;
  
  return {
    total: totalChunks,
    embedded: embeddedChunks,
    percentage: totalChunks > 0 ? (embeddedChunks / totalChunks) * 100 : 0,
    isComplete: totalChunks > 0 && embeddedChunks === totalChunks
  };
};

// Static method to find documents needing embedding
documentSchema.statics.findNeedingEmbedding = function() {
  return this.find({
    status: 'processed',
    isActive: true,
    $or: [
      { isEmbedded: false },
      { 'chunks.isEmbedded': false }
    ]
  });
};

// Static method to search documents
documentSchema.statics.searchDocuments = function(query, options = {}) {
  const searchOptions = {
    limit: options.limit || 10,
    skip: options.skip || 0,
    language: options.language,
    contentType: options.contentType
  };
  
  let searchQuery = {
    isActive: true,
    status: 'processed',
    $text: { $search: query }
  };
  
  if (searchOptions.language) {
    searchQuery.language = searchOptions.language;
  }
  
  if (searchOptions.contentType) {
    searchQuery.contentType = searchOptions.contentType;
  }
  
  return this.find(searchQuery)
    .limit(searchOptions.limit)
    .skip(searchOptions.skip)
    .sort({ score: { $meta: 'textScore' }, updatedAt: -1 });
};

module.exports = mongoose.model('Document', documentSchema);