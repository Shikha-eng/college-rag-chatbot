const express = require('express');
const AdminQuestion = require('../models/AdminQuestion');
const Conversation = require('../models/Conversation');
const Document = require('../models/Document');
const User = require('../models/User');
const WhatsAppService = require('../services/whatsapp');
const { authenticate, adminOnly } = require('../middleware/auth');
// Removed validation middleware (prototype mode) - basic checks will be inline
const router = express.Router();

// Initialize WhatsApp service
const whatsappService = new WhatsAppService();

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics
 * @access  Private (Admin only)
 */
router.get('/dashboard', adminOnly, async (req, res) => {
  try {
    // Get question statistics
    const questionStats = await AdminQuestion.getDashboardStats();
    
    // Get conversation statistics
    const conversationStats = await Conversation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get user statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get document statistics
    const documentStats = await Document.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent activity
    const recentQuestions = await AdminQuestion.find({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    const recentConversations = await Conversation.find({
      startedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }).countDocuments();

    res.json({
      questions: questionStats,
      conversations: conversationStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      users: userStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      documents: documentStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      recentActivity: {
        questions: recentQuestions,
        conversations: recentConversations
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to fetch dashboard data:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/questions
 * @desc    Get all questions for admin review
 * @access  Private (Admin only)
 */
router.get('/questions', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, category, search } = req.query;

    // Build query
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Get questions with pagination
    const questions = await AdminQuestion.find(query)
      .populate('userId', 'name email whatsappNumber')
      .populate('assignedTo', 'name email')
      .select('-ragContext -internalNotes') // Exclude large fields for list view
      .sort({ 
        priority: { urgent: 1, high: 2, medium: 3, low: 4 },
        createdAt: -1 
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AdminQuestion.countDocuments(query);

    res.json({
      questions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch admin questions:', error);
    res.status(500).json({
      error: 'Failed to fetch questions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/questions/:id
 * @desc    Get specific question details
 * @access  Private (Admin only)
 */
router.get('/questions/:id', adminOnly, async (req, res) => {
  try {
    const question = await AdminQuestion.findById(req.params.id)
      .populate('userId', 'name email whatsappNumber primaryLanguage')
      .populate('assignedTo', 'name email')
      .populate('conversationId');

    if (!question) {
      return res.status(404).json({
        error: 'Question not found'
      });
    }

    res.json({ question });

  } catch (error) {
    console.error('❌ Failed to fetch question details:', error);
    res.status(500).json({
      error: 'Failed to fetch question details',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/admin/questions/:id/response
 * @desc    Submit admin response to question
 * @access  Private (Admin only)
 */
router.post('/questions/:id/response', adminOnly, async (req, res) => {
  try {
    const { response, responseLanguage = 'english' } = req.body;
    const questionId = req.params.id;
    const adminId = req.user._id;

    const question = await AdminQuestion.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        error: 'Question not found'
      });
    }

    // Send response via WhatsApp if platform is WhatsApp
    let whatsappResult = null;
    
    if (question.platform === 'whatsapp') {
      whatsappResult = await whatsappService.sendAdminResponse(
        questionId, 
        response, 
        req.user
      );
    }

    // Update question with admin response
    question.adminResponse = {
      response: response,
      responseLanguage: responseLanguage,
      respondedBy: adminId,
      respondedAt: new Date(),
      responseMethod: 'manual'
    };
    
    question.status = 'answered';
    
    if (whatsappResult) {
      question.deliveryStatus = {
        whatsappMessageId: whatsappResult.messageSid,
        whatsappDeliveryStatus: 'sent',
        deliveredAt: new Date()
      };
    }

    await question.save();

    res.json({
      message: 'Response submitted successfully',
      questionId: questionId,
      whatsappSent: !!whatsappResult,
      messageSid: whatsappResult?.messageSid
    });

  } catch (error) {
    console.error('❌ Failed to submit admin response:', error);
    res.status(500).json({
      error: 'Failed to submit response',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/questions/:id/assign
 * @desc    Assign question to admin
 * @access  Private (Admin only)
 */
router.put('/questions/:id/assign', adminOnly, async (req, res) => {
  try {
    const { adminId } = req.body;
    const questionId = req.params.id;

    const question = await AdminQuestion.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        error: 'Question not found'
      });
    }

    // Verify admin user exists
    if (adminId) {
      const admin = await User.findOne({ _id: adminId, role: 'admin' });
      if (!admin) {
        return res.status(400).json({
          error: 'Invalid admin user'
        });
      }
    }

    question.assignToAdmin(adminId || req.user._id);
    await question.save();

    res.json({
      message: 'Question assigned successfully',
      assignedTo: adminId || req.user._id
    });

  } catch (error) {
    console.error('❌ Failed to assign question:', error);
    res.status(500).json({
      error: 'Failed to assign question',
      message: error.message
    });
  }
});

/**
 * @route   PUT /api/admin/questions/:id/priority
 * @desc    Update question priority
 * @access  Private (Admin only)
 */
router.put('/questions/:id/priority', adminOnly, async (req, res) => {
  try {
    const { priority } = req.body;
    const questionId = req.params.id;

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return res.status(400).json({
        error: 'Invalid priority level'
      });
    }

    const question = await AdminQuestion.findByIdAndUpdate(
      questionId,
      { priority: priority },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({
        error: 'Question not found'
      });
    }

    res.json({
      message: 'Priority updated successfully',
      priority: priority
    });

  } catch (error) {
    console.error('❌ Failed to update priority:', error);
    res.status(500).json({
      error: 'Failed to update priority',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/admin/questions/:id/notes
 * @desc    Add internal note to question
 * @access  Private (Admin only)
 */
router.post('/questions/:id/notes', adminOnly, async (req, res) => {
  try {
    const { note } = req.body;
    const questionId = req.params.id;
    const adminId = req.user._id;

    if (!note || note.trim().length === 0) {
      return res.status(400).json({
        error: 'Note content is required'
      });
    }

    const question = await AdminQuestion.findById(questionId);
    
    if (!question) {
      return res.status(404).json({
        error: 'Question not found'
      });
    }

    question.addInternalNote(note.trim(), adminId);
    await question.save();

    res.json({
      message: 'Note added successfully'
    });

  } catch (error) {
    console.error('❌ Failed to add note:', error);
    res.status(500).json({
      error: 'Failed to add note',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users for admin management
 * @access  Private (Admin only)
 */
router.get('/users', adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;

    let query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password -resetPasswordToken -verificationToken')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
        totalItems: total
      }
    });

  } catch (error) {
    console.error('❌ Failed to fetch users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/questions/pending
 * @desc    Get questions needing attention
 * @access  Private (Admin only)
 */
router.get('/questions/pending', adminOnly, async (req, res) => {
  try {
    const questions = await AdminQuestion.findNeedingAttention();

    res.json({
      questions: questions.map(q => ({
        id: q._id,
        question: q.question.substring(0, 100) + '...',
        priority: q.priority,
        createdAt: q.createdAt,
        user: q.userId ? {
          name: q.userId.name,
          whatsappNumber: q.userWhatsappNumber
        } : null,
        assignedTo: q.assignedTo ? {
          name: q.assignedTo.name
        } : null
      })),
      count: questions.length
    });

  } catch (error) {
    console.error('❌ Failed to fetch pending questions:', error);
    res.status(500).json({
      error: 'Failed to fetch pending questions',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/admin/analytics
 * @desc    Get detailed analytics for admin
 * @access  Private (Admin only)
 */
router.get('/analytics', adminOnly, async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    
    let startDate;
    switch (period) {
      case '1d':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Questions over time
    const questionsOverTime = await AdminQuestion.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Response time statistics
    const responseTimeStats = await AdminQuestion.aggregate([
      { 
        $match: { 
          'metadata.timeToFirstResponse': { $exists: true },
          createdAt: { $gte: startDate }
        } 
      },
      {
        $group: {
          _id: null,
          averageResponseTime: { $avg: '$metadata.timeToFirstResponse' },
          minResponseTime: { $min: '$metadata.timeToFirstResponse' },
          maxResponseTime: { $max: '$metadata.timeToFirstResponse' }
        }
      }
    ]);

    // Language distribution
    const languageDistribution = await AdminQuestion.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$questionLanguage',
          count: { $sum: 1 }
        }
      }
    ]);

    // Platform distribution
    const platformDistribution = await AdminQuestion.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$platform',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      period: period,
      questionsOverTime,
      responseTime: responseTimeStats[0] || {},
      languageDistribution,
      platformDistribution
    });

  } catch (error) {
    console.error('❌ Failed to fetch analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
});

module.exports = router;