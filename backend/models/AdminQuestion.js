const mongoose = require('mongoose');

/**
 * Admin Question Schema
 * Stores questions that need manual admin response
 */
const adminQuestionSchema = new mongoose.Schema({
  // Question Information
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: [1000, 'Question cannot exceed 1000 characters']
  },
  
  // Original question details
  originalQuestion: String, // Before translation
  questionLanguage: {
    type: String,
    enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'],
    required: true
  },
  
  detectedLanguage: String,
  languageConfidence: Number,
  
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  userWhatsappNumber: {
    type: String,
    required: function() {
      return this.platform === 'whatsapp';
    }
  },
  
  // Platform Information
  platform: {
    type: String,
    enum: ['web', 'whatsapp'],
    required: true
  },
  
  // Conversation Context
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  
  sessionId: String,
  
  // RAG Context
  ragContext: {
    // What documents were retrieved but didn't answer the question
    retrievedDocs: [{
      documentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document'
      },
      score: Number,
      content: String,
      reason: String // Why this doc didn't answer
    }],
    
    // Search query used
    searchQuery: String,
    searchEmbedding: [Number],
    
    // Confidence scores
    maxSimilarityScore: Number,
    averageSimilarityScore: Number,
    
    // Threshold information
    confidenceThreshold: Number,
    belowThreshold: Boolean
  },
  
  // Admin Response
  adminResponse: {
    response: String,
    responseLanguage: {
      type: String,
      enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari']
    },
    translatedResponse: String, // Translated to user's language
    
    // Admin who responded
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    respondedAt: Date,
    
    // Response metadata
    responseTime: Number, // Time taken to respond in minutes
    responseMethod: {
      type: String,
      enum: ['manual', 'template', 'ai_assisted'],
      default: 'manual'
    }
  },
  
  // Question Status
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_progress', 'answered', 'closed', 'escalated'],
    default: 'pending'
  },
  
  // Assignment Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Admin user
  },
  
  assignedAt: Date,
  
  // Priority and Category
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  category: {
    type: String,
    enum: ['academic', 'admission', 'fees', 'hostel', 'events', 'technical', 'general', 'complaint'],
    default: 'general'
  },
  
  tags: [String],
  
  // Follow-up Information
  followUpRequired: {
    type: Boolean,
    default: false
  },
  
  followUpDate: Date,
  followUpNotes: String,
  
  // Delivery Status
  deliveryStatus: {
    whatsappMessageId: String,
    whatsappDeliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    deliveredAt: Date,
    deliveryError: String
  },
  
  // User Feedback
  userFeedback: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    feedbackDate: Date
  },
  
  // Internal Notes
  internalNotes: [{
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Analytics and Tracking
  metadata: {
    userAgent: String,
    ipAddress: String,
    location: String,
    deviceType: String,
    
    // Time tracking
    timeToFirstResponse: Number, // in minutes
    totalResolutionTime: Number, // in minutes
    
    // Escalation tracking
    escalationLevel: {
      type: Number,
      default: 0
    },
    escalationHistory: [{
      level: Number,
      escalatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      escalatedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      escalatedAt: Date,
      reason: String
    }]
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  resolvedAt: Date
});

// Indexes for better performance
adminQuestionSchema.index({ status: 1, priority: 1 });
adminQuestionSchema.index({ assignedTo: 1, status: 1 });
adminQuestionSchema.index({ userId: 1, createdAt: -1 });
adminQuestionSchema.index({ platform: 1, status: 1 });
adminQuestionSchema.index({ category: 1, status: 1 });
adminQuestionSchema.index({ createdAt: -1 });

// Text search index
adminQuestionSchema.index({ 
  question: 'text', 
  'adminResponse.response': 'text',
  tags: 'text'
});

// Pre-save middleware to update timestamps
adminQuestionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Calculate response time when answered
  if (this.isModified('adminResponse.respondedAt') && this.adminResponse.respondedAt) {
    this.metadata.timeToFirstResponse = Math.floor(
      (this.adminResponse.respondedAt - this.createdAt) / (1000 * 60)
    );
  }
  
  // Calculate total resolution time when closed
  if (this.isModified('status') && this.status === 'answered' && !this.resolvedAt) {
    this.resolvedAt = Date.now();
    this.metadata.totalResolutionTime = Math.floor(
      (this.resolvedAt - this.createdAt) / (1000 * 60)
    );
  }
  
  next();
});

// Instance method to add internal note
adminQuestionSchema.methods.addInternalNote = function(note, adminId) {
  this.internalNotes.push({
    note: note,
    addedBy: adminId,
    addedAt: new Date()
  });
};

// Instance method to assign to admin
adminQuestionSchema.methods.assignToAdmin = function(adminId) {
  this.assignedTo = adminId;
  this.assignedAt = new Date();
  this.status = 'assigned';
};

// Instance method to escalate
adminQuestionSchema.methods.escalate = function(escalatedBy, escalatedTo, reason) {
  this.metadata.escalationLevel += 1;
  this.metadata.escalationHistory.push({
    level: this.metadata.escalationLevel,
    escalatedBy: escalatedBy,
    escalatedTo: escalatedTo,
    escalatedAt: new Date(),
    reason: reason
  });
  
  this.assignedTo = escalatedTo;
  this.status = 'escalated';
  this.priority = this.priority === 'low' ? 'medium' : 
                  this.priority === 'medium' ? 'high' : 'urgent';
};

// Static method to get admin dashboard data
adminQuestionSchema.statics.getDashboardStats = async function() {
  const pipeline = [
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgResponseTime: { $avg: '$metadata.timeToFirstResponse' }
      }
    }
  ];
  
  const stats = await this.aggregate(pipeline);
  
  return {
    total: await this.countDocuments(),
    pending: stats.find(s => s._id === 'pending')?.count || 0,
    inProgress: stats.find(s => s._id === 'in_progress')?.count || 0,
    answered: stats.find(s => s._id === 'answered')?.count || 0,
    avgResponseTime: stats.find(s => s._id === 'answered')?.avgResponseTime || 0
  };
};

// Static method to find questions needing attention
adminQuestionSchema.statics.findNeedingAttention = function() {
  const urgentDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  const normalDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
  
  return this.find({
    status: { $in: ['pending', 'assigned'] },
    $or: [
      { priority: 'urgent', createdAt: { $lt: urgentDate } },
      { priority: 'high', createdAt: { $lt: new Date(Date.now() - 4 * 60 * 60 * 1000) } },
      { createdAt: { $lt: normalDate } }
    ]
  }).populate('userId assignedTo');
};

module.exports = mongoose.model('AdminQuestion', adminQuestionSchema);