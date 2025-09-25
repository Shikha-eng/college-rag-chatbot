const express = require('express');
const router = express.Router();

// Feature flag to disable WhatsApp entirely
const DISABLE_WHATSAPP = (process.env.DISABLE_WHATSAPP || 'false').toLowerCase() === 'true';

let whatsappService = null;
if (!DISABLE_WHATSAPP) {
  const WhatsAppService = require('../services/whatsapp');
  whatsappService = new WhatsAppService();
  (async () => {
    try {
      await whatsappService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize WhatsApp service:', error);
    }
  })();
} else {
  console.log('🛑 Skipping WhatsApp service initialization (DISABLE_WHATSAPP=true)');
}

/**
 * @route   POST /api/whatsapp/webhook
 * @desc    Twilio WhatsApp webhook endpoint
 * @access  Public (Twilio webhook)
 */
router.post('/webhook', async (req, res) => {
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
  try {
    console.log('📨 WhatsApp webhook received:', req.body);
    await whatsappService.handleIncomingMessage(req.body);
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
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
  try {
    const { questionId, response } = req.body;
    if (!questionId || !response) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Question ID and response are required'
      });
    }
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
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
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
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
  try {
    const stats = whatsappService.getStats();
    res.json({ stats, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Failed to get WhatsApp stats:', error);
    res.status(500).json({ error: 'Failed to get statistics', message: error.message });
  }
});

/**
 * @route   POST /api/whatsapp/clear-queues
 * @desc    Clear message rate limiting queues
 * @access  Private (Admin only)
 */
router.post('/clear-queues', async (req, res) => {
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
  try {
    whatsappService.clearQueues();
    res.json({ message: 'Message queues cleared successfully' });
  } catch (error) {
    console.error('❌ Failed to clear queues:', error);
    res.status(500).json({ error: 'Failed to clear queues', message: error.message });
  }
});

/**
 * @route   GET /api/whatsapp/test
 * @desc    Test WhatsApp service connection
 * @access  Private (Admin only)
 */
router.get('/test', async (req, res) => {
  if (DISABLE_WHATSAPP) {
    return res.status(503).json({ error: 'WhatsApp integration disabled' });
  }
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!accountSid || !fromNumber) {
      return res.status(500).json({ error: 'Configuration error', message: 'Twilio credentials not properly configured' });
    }
    res.json({
      message: 'WhatsApp service is configured correctly',
      accountSid: accountSid.substring(0, 10) + '...',
      fromNumber,
      serviceStats: whatsappService.getStats()
    });
  } catch (error) {
    console.error('❌ WhatsApp service test failed:', error);
    res.status(500).json({ error: 'WhatsApp service test failed', message: error.message });
  }
});

module.exports = router;