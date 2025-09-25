const mongoose = require('mongoose');

/**
 * Conversation Schema
 * Stores chat conversations between users and the chatbot
 */
const conversationSchema = new mongoose.Schema({
  // User Information
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // WhatsApp Integration
  whatsappNumber: {
    type: String,
    required: function() {
      return this.platform === 'whatsapp';
    }
  },
  
  // Platform (web, whatsapp)
  platform: {
    type: String,
    enum: ['web', 'whatsapp'],
    required: true,
    default: 'web'
  },
  
  // Session Management
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  
  // Messages Array
  messages: [{
    messageId: {
      type: String,
      required: true
    },
    sender: {
      type: String,
      enum: ['user', 'bot', 'admin'],
      required: true
    },
    content: {
      text: {
        type: String,
        required: true
      },
      originalText: String, // Before translation
      language: {
        type: String,
        enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'],
        default: 'english'
      },
      detectedLanguage: String,
      confidence: Number // Language detection confidence
    },
    
    // Message Metadata
    timestamp: {
      type: Date,
      default: Date.now
    },
    
    // RAG Context (for bot responses)
    ragContext: {
      retrievedDocs: [{
        documentId: String,
        score: Number,
        content: String,
        source: String
      }],
      queryEmbedding: [Number], // Vector representation
      responseGenerated: Boolean
    },
    
    // Message Status
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read', 'failed'],
      default: 'sent'
    },
    
    // WhatsApp specific
    whatsappMessageId: String,
    whatsappStatus: String,
    
    // Processing flags
    isProcessed: {
      type: Boolean,
      default: false
    },
    needsAdminResponse: {
      type: Boolean,
      default: false
    },
    adminResponseSent: {
      type: Boolean,
      default: false
    }
  }],
  
  // Conversation Status
  status: {
    type: String,
    enum: ['active', 'closed', 'waiting_admin', 'resolved'],
    default: 'active'
  },
  
  // Language Settings
  conversationLanguage: {
    type: String,
    enum: ['hindi', 'english', 'marathi', 'marwari', 'mewadi', 'dhundhari'],
    default: 'english'
  },
  
  // Admin Assignment
  assignedAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Conversation Metadata
  metadata: {
    userAgent: String,
    ipAddress: String,
    location: String,
    deviceType: String
  },
  
  // Timestamps
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  closedAt: Date,
  
  // Analytics
  messageCount: {
    type: Number,
    default: 0
  },
  userSatisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedback: String
});

// Indexes for better performance
conversationSchema.index({ userId: 1, sessionId: 1 });
conversationSchema.index({ whatsappNumber: 1 });
conversationSchema.index({ platform: 1, status: 1 });
conversationSchema.index({ 'messages.timestamp': -1 });
conversationSchema.index({ lastActivity: -1 });

// Pre-save middleware to update message count and last activity
conversationSchema.pre('save', function(next) {
  this.messageCount = this.messages.length;
  this.lastActivity = Date.now();
  next();
});

// Instance method to add message
conversationSchema.methods.addMessage = function(messageData) {
  const message = {
    messageId: new mongoose.Types.ObjectId().toString(),
    ...messageData,
    timestamp: new Date()
  };
  
  this.messages.push(message);
  this.lastActivity = new Date();
  
  return message;
};

// Instance method to get recent messages
conversationSchema.methods.getRecentMessages = function(limit = 10) {
  return this.messages
    .slice(-limit)
    .map(msg => ({
      sender: msg.sender,
      text: msg.content.text,
      language: msg.content.language,
      timestamp: msg.timestamp
    }));
};

// Static method to find active conversation
conversationSchema.statics.findActiveConversation = async function(userId, platform = 'web') {
  return this.findOne({
    userId,
    platform,
    status: 'active'
  });
};

// Static method to find by WhatsApp number
conversationSchema.statics.findByWhatsApp = async function(whatsappNumber) {
  return this.findOne({
    whatsappNumber,
    platform: 'whatsapp',
    status: { $in: ['active', 'waiting_admin'] }
  }).populate('userId');
};

module.exports = mongoose.model('Conversation', conversationSchema);