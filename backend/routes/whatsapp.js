const express = require('express');
const WhatsAppService = require('../services/whatsapp');
const { validateWhatsAppWebhook } = require('../middleware/validation');
const router = express.Router();

// Initialize WhatsApp service
const whatsappService = new WhatsAppService();

// Initialize the service on first load
(async () => {
  try {
    await whatsappService.initialize();
  } catch (error) {
    console.error('❌ Failed to initialize WhatsApp service:', error);
  }
})();

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Twilio WhatsApp webhook endpoint
 * @access  Public (Twilio webhook)
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('📨 WhatsApp webhook received:', req.body);
    
    // Handle incoming message
    await whatsappService.handleIncomingMessage(req.body);
    
    // Respond to Twilio with success
    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * @route   GET /api/whatsapp/webhook
 * @desc    Twilio webhook verification
 * @access  Public (Twilio verification)
 */
router.get('/webhook', (req, res) => {
  // Twilio webhook verification
  const { Hub } = require('twilio').webhook;
  
  // This is just a basic verification
  // In production, you should verify the webhook signature
  res.status(200).send('Webhook verified');
});

/**
 * @route   POST /api/whatsapp/send-admin-response
 * @desc    Send admin response to user via WhatsApp
 * @access  Private (Admin only)
 */
router.post('/send-admin-response', async (req, res) => {
  try {
    const { questionId, response } = req.body;
    
    if (!questionId || !response) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Question ID and response are required'
      });
    }

    // Note: In a complete implementation, you'd add authentication middleware here
    // For now, we'll create a mock admin user
    const mockAdminUser = { _id: 'admin_user_id', name: 'Admin' };

    const result = await whatsappService.sendAdminResponse(questionId, response, mockAdminUser);

    res.json({
      message: 'Admin response sent successfully',
      messageSid: result.messageSid,
      translatedResponse: result.translatedResponse
    });

  } catch (error) {
    console.error('❌ Failed to send admin response:', error);
    res.status(500).json({
      error: 'Failed to send admin response',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/whatsapp/send-message
 * @desc    Send message to WhatsApp number (for testing)
 * @access  Private (Admin only)
 */
router.post('/send-message', async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Phone number and message are required'
      });
    }

    const result = await whatsappService.sendMessage(phoneNumber, message);

    res.json({
      message: 'Message sent successfully',
      messageSid: result.sid,
      status: result.status
    });

  } catch (error) {
    console.error('❌ Failed to send message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/whatsapp/stats
 * @desc    Get WhatsApp service statistics
 * @access  Private (Admin only)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = whatsappService.getStats();
    
    res.json({
      stats: stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Failed to get WhatsApp stats:', error);
    res.status(500).json({
      error: 'Failed to get statistics',
      message: error.message
    });
  }
});

/**
 * @route   POST /api/whatsapp/clear-queues
 * @desc    Clear message rate limiting queues
 * @access  Private (Admin only)
 */
router.post('/clear-queues', async (req, res) => {
  try {
    whatsappService.clearQueues();
    
    res.json({
      message: 'Message queues cleared successfully'
    });

  } catch (error) {
    console.error('❌ Failed to clear queues:', error);
    res.status(500).json({
      error: 'Failed to clear queues',
      message: error.message
    });
  }
});

/**
 * @route   GET /api/whatsapp/test
 * @desc    Test WhatsApp service connection
 * @access  Private (Admin only)
 */
router.get('/test', async (req, res) => {
  try {
    // Test connection by getting account info
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    
    if (!accountSid || !fromNumber) {
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Twilio credentials not properly configured'
      });
    }

    res.json({
      message: 'WhatsApp service is configured correctly',
      accountSid: accountSid.substring(0, 10) + '...',
      fromNumber: fromNumber,
      serviceStats: whatsappService.getStats()
    });

  } catch (error) {
    console.error('❌ WhatsApp service test failed:', error);
    res.status(500).json({
      error: 'WhatsApp service test failed',
      message: error.message
    });
  }
});

module.exports = router;