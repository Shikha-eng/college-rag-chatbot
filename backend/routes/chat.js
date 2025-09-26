const express = require('express');
const RAGService = require('../services/rag');
const Conversation = require('../models/Conversation');
const AdminQuestion = require('../models/AdminQuestion');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Feature flag to disable RAG for lightweight prototype
const DISABLE_RAG = (process.env.DISABLE_RAG || 'false').toLowerCase() === 'true';
let ragService = null;
if (!DISABLE_RAG) {
  ragService = new RAGService();
  (async () => {
    try {
      await ragService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize RAG service:', error);
    }
  })();
} else {
  console.log('🛑 RAG disabled via DISABLE_RAG flag. Using canned responses.');
}

/**
 * @route   POST /api/chat/message
 * @desc    Send message to chatbot
 * @access  Private
 */
// Validation middleware removed for prototype mode (no-op)
router.post('/message', authenticate, async (req, res) => {
  try {
    const { message, language = 'english', platform = 'web' } = req.body;
    const userId = req.user._id;

    console.log(`💬 Chat message from user ${userId}: "${message}"`);

    // Find or create conversation
    let conversation = await Conversation.findActiveConversation(userId, platform);
    
    if (!conversation) {
      conversation = new Conversation({
        userId: userId,
        platform: platform,
        sessionId: `web_${userId}_${Date.now()}`,
        status: 'active',
        conversationLanguage: language
      });
    }

    // Add user message to conversation
    conversation.addMessage({
      sender: 'user',
      content: {
        text: message,
        language: language
      }
    });

    await conversation.save();

    let responsePayload;
    if (DISABLE_RAG) {
      // Simple canned responses for prototype
      const lowerMsg = message.toLowerCase();
      let answer = 'This is a prototype response. The intelligent answer system is disabled.';
      if (lowerMsg.includes('admission')) answer = 'Admissions typically open in June. (Prototype)';
      else if (lowerMsg.includes('course')) answer = 'We offer multiple undergraduate courses. (Prototype)';
      else if (lowerMsg.includes('exam')) answer = 'Mid-sem exams are usually in October. (Prototype)';
      else if (lowerMsg.includes('sports')) answer = 'Sports activities occur in November. (Prototype)';

      responsePayload = {
        response: answer,
        confidence: 0,
        needsAdminResponse: false,
        conversationId: conversation._id,
        metadata: {
          detectedLanguage: language,
          strategy: 'stub',
          retrievedDocs: 0,
          ragDisabled: true
        }
      };

      conversation.addMessage({
        sender: 'bot',
        content: { text: answer, language }
      });
      await conversation.save();
      return res.json(responsePayload);
    } else {
      const ragResult = await ragService.processQuestion(message, {
        userId: userId,
        language: language,
        platform: platform,
        conversationId: conversation._id
      });

      conversation.addMessage({
        sender: 'bot',
        content: { text: ragResult.response, language: ragResult.targetLanguage },
        ragContext: ragResult.retrievalResults
      });

      if (ragResult.needsAdminResponse) {
        conversation.status = 'waiting_admin';
        const adminQuestion = new AdminQuestion({
          question: message,
          questionLanguage: language,
          detectedLanguage: ragResult.detectedLanguage,
          userId: userId,
          platform: platform,
          conversationId: conversation._id,
          ragContext: {
            retrievedDocs: ragResult.retrievalResults.retrievedDocs,
            maxSimilarityScore: ragResult.retrievalResults.maxSimilarity,
            averageSimilarityScore: ragResult.retrievalResults.averageSimilarity,
            confidenceThreshold: 0.7,
            belowThreshold: ragResult.confidence < 0.7
          },
          status: 'pending',
          priority: 'medium',
          category: 'general'
        });
        await adminQuestion.save();
      }
      await conversation.save();
      return res.json({
        response: ragResult.response,
        confidence: ragResult.confidence,
        needsAdminResponse: ragResult.needsAdminResponse,
        conversationId: conversation._id,
        metadata: {
          detectedLanguage: ragResult.detectedLanguage,
          strategy: ragResult.strategy,
            retrievedDocs: ragResult.retrievalResults.totalResults
        }
      });
    }

  } catch (error) {
    console.error('❌ Chat message processing failed:', error);
    res.status(500).json({
      error: 'Message processing failed',
      message: 'I apologize, but I encountered an error while processing your message.'
    });
  }
});

/**
 * @route   GET /api/chat/conversations
 * @desc    Get user's conversations
 * @access  Private
 */
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    const conversations = await Conversation.find({ userId })
      .select('sessionId platform status conversationLanguage startedAt lastActivity messageCount')
      .sort({ lastActivity: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Conversation.countDocuments({ userId });

    res.json({
      conversations,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch conversations:', error);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/chat/conversation/:id
 * @desc    Get specific conversation with messages
 * @access  Private
 */
router.get('/conversation/:id', authenticate, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    res.json({
      conversation: {
        id: conversation._id,
        platform: conversation.platform,
        status: conversation.status,
        language: conversation.conversationLanguage,
        startedAt: conversation.startedAt,
        lastActivity: conversation.lastActivity,
        messages: conversation.messages.map(msg => ({
          id: msg.messageId,
          sender: msg.sender,
          text: msg.content.text,
          language: msg.content.language,
          timestamp: msg.timestamp
        }))
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch conversation:', error);
    res.status(500).json({
      error: 'Failed to fetch conversation',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/chat/history
 * @desc    Get recent chat history for current user
 * @access  Private
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const userId = req.user._id;

    // Get the most recent active conversation
    const conversation = await Conversation.findOne({
      userId: userId,
      platform: 'web'
    }).sort({ lastActivity: -1 });

    if (!conversation) {
      return res.json({ messages: [] });
    }

    // Get recent messages
    const recentMessages = conversation.getRecentMessages(parseInt(limit));

    res.json({
      messages: recentMessages.map(msg => ({
        sender: msg.sender,
        text: msg.text,
        language: msg.language,
        timestamp: msg.timestamp
      })),
      conversationId: conversation._id
    });

  } catch (error) {
    console.error('❌ Failed to fetch chat history:', error);
    res.status(500).json({
      error: 'Failed to fetch chat history',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/chat/feedback
 * @desc    Submit feedback for conversation
 * @access  Private
 */
router.post('/feedback', authenticate, async (req, res) => {
  try {
    const { conversationId, rating, feedback } = req.body;
    const userId = req.user._id;

    if (!conversationId || !rating) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Conversation ID and rating are required'
      });
    }

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    // Update conversation with feedback
    conversation.userSatisfactionRating = rating;
    conversation.feedback = feedback || '';
    await conversation.save();

    res.json({
      message: 'Feedback submitted successfully',
      rating: rating
    });

  } catch (error) {
    console.error('❌ Failed to submit feedback:', error);
    res.status(500).json({
      error: 'Failed to submit feedback',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/chat/stats
 * @desc    Get chat statistics
 * @access  Private (Admin only - add middleware in production)
 */
router.get('/stats', authenticate, async (req, res) => {
  try {
    if (DISABLE_RAG) {
      return res.json({
        overall: {},
        byPlatform: [],
        byLanguage: [],
        ragServiceStats: { disabled: true }
      });
    }
    const stats = await Conversation.aggregate([{ $group: { _id: null, totalConversations: { $sum: 1 }, totalMessages: { $sum: '$messageCount' }, averageRating: { $avg: '$userSatisfactionRating' }, activeConversations: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }, waitingAdminConversations: { $sum: { $cond: [{ $eq: ['$status', 'waiting_admin'] }, 1, 0] } } } }]);
    const platformStats = await Conversation.aggregate([{ $group: { _id: '$platform', count: { $sum: 1 } } }]);
    const languageStats = await Conversation.aggregate([{ $group: { _id: '$conversationLanguage', count: { $sum: 1 } } }]);
    res.json({ overall: stats[0] || {}, byPlatform: platformStats, byLanguage: languageStats, ragServiceStats: ragService.getStats() });

  } catch (error) {
    console.error('❌ Failed to fetch chat stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

/**
 * @route   DELETE /api/chat/conversation/:id
 * @desc    Delete/close conversation
 * @access  Private
 */
router.delete('/conversation/:id', authenticate, async (req, res) => {
  try {
    const conversationId = req.params.id;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: userId
    });

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    // Close conversation instead of deleting
    conversation.status = 'closed';
    conversation.closedAt = new Date();
    await conversation.save();

    res.json({
      message: 'Conversation closed successfully'
    });

  } catch (error) {
    console.error('❌ Failed to close conversation:', error);
    res.status(500).json({
      error: 'Failed to close conversation',
      message: error.message
    });
  }
});

module.exports = router;