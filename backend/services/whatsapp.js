const twilio = require('twilio');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const AdminQuestion = require('../models/AdminQuestion');
const RAGService = require('./rag');
const LanguageService = require('./language');

/**
 * WhatsApp Service using Twilio
 * Handles WhatsApp messaging integration
 */
class WhatsAppService {
  constructor() {
    // Initialize Twilio client only if credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );
        this.enabled = true;
      } catch (error) {
        console.log('⚠️  WhatsApp service disabled: Invalid Twilio credentials');
        this.enabled = false;
      }
    } else {
      console.log('⚠️  WhatsApp service disabled: Missing Twilio credentials');
      this.enabled = false;
    }
    
    this.fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    this.ragService = new RAGService();
    this.languageService = new LanguageService();
    
    // Message rate limiting
    this.messageQueue = new Map();
    this.rateLimitWindow = 60000; // 1 minute
    this.maxMessagesPerWindow = 10;

    // In-memory mode (set DISABLE_DB=true to activate)
    this.useInMemory = process.env.DISABLE_DB === 'true';
    if (this.useInMemory) {
      console.log('⚠️  WhatsAppService running with DISABLE_DB=true (in-memory storage only)');
      this.memory = {
        usersByNumber: new Map(),        // whatsappNumber -> user
        conversationsById: new Map(),    // conversationId -> conversation
        activeConversationByUser: new Map(), // userId -> conversationId
        adminQuestions: new Map()        // id -> adminQuestion
      };
      this.genId = (p='mem') => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
    }
  }

  /**
   * Initialize the WhatsApp service
   */
  async initialize() {
    console.log('📱 Initializing WhatsApp Service...');
    
    await this.ragService.initialize();
    await this.languageService.initialize();
    
    console.log('✅ WhatsApp Service initialized');
    console.log(`📞 Using WhatsApp number: ${this.fromNumber}`);
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(toNumber, messageText) {
    if (!this.enabled) {
      console.log('⚠️  WhatsApp service disabled - cannot send message');
      return { sid: 'disabled', status: 'disabled' };
    }

    try {
      const message = await this.client.messages.create({
        from: `whatsapp:${this.fromNumber}`,
        to: `whatsapp:${toNumber}`,
        body: messageText
      });

      console.log(`✅ WhatsApp message sent: ${message.sid}`);
      return message;
    } catch (error) {
      console.error('❌ Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage(messageData) {
    try {
      const { From, Body, MessageSid } = messageData;
      const whatsappNumber = From.replace('whatsapp:', '');
      const messageText = Body || '';
      
      console.log(`📨 Incoming WhatsApp message from ${whatsappNumber}: "${messageText}"`);

      // Rate limiting check
      if (!this.checkRateLimit(whatsappNumber)) {
        console.log('⚠️ Rate limit exceeded for:', whatsappNumber);
        await this.sendRateLimitMessage(whatsappNumber);
        return;
      }

      // Find or create user
      const user = await this.findOrCreateUser(whatsappNumber);
      
      // Find or create conversation
      const conversation = await this.findOrCreateConversation(user._id, whatsappNumber);
      
      // Detect message language
      const detectedLanguage = await this.languageService.detectLanguage(messageText);
      
      // Add user message to conversation
      conversation.addMessage({
        sender: 'user',
        content: {
          text: messageText,
          language: detectedLanguage,
          detectedLanguage: detectedLanguage
        },
        platform: 'whatsapp',
        whatsappMessageId: MessageSid
      });
      if (!this.useInMemory) {
        await conversation.save();
      }

      // Process the message
      await this.processMessage(messageText, user, conversation, detectedLanguage);

    } catch (error) {
      console.error('❌ Failed to handle incoming WhatsApp message:', error);
      
      // Send error message to user
      if (messageData.From) {
        await this.sendErrorMessage(messageData.From.replace('whatsapp:', ''));
      }
    }
  }

  /**
   * Process user message and generate response
   */
  async processMessage(messageText, user, conversation, language) {
    try {
      console.log(`⚙️ Processing message for user: ${user.email}`);
      
      // Handle special commands
      if (await this.handleSpecialCommands(messageText, user, conversation, language)) {
        return;
      }

      // Use RAG service to process the question
      const ragResult = await this.ragService.processQuestion(messageText, {
        userId: user._id,
        language: language,
        platform: 'whatsapp',
        conversationId: conversation._id
      });

      // Add bot response to conversation
      conversation.addMessage({
        sender: 'bot',
        content: {
          text: ragResult.response,
          language: ragResult.targetLanguage,
          originalText: ragResult.response
        },
        ragContext: {
          retrievedDocs: ragResult.retrievalResults.retrievedDocs,
          responseGenerated: true
        }
      });
      // Update conversation language
      conversation.conversationLanguage = ragResult.targetLanguage;
      
      if (ragResult.needsAdminResponse) {
        // Create admin question for manual response
        await this.createAdminQuestion(messageText, user, conversation, ragResult, language);
        conversation.status = 'waiting_admin';
        
        // Send acknowledgment message
        const ackMessage = await this.languageService.translate(
          "Your question has been forwarded to our college administration team. They will get back to you soon.",
          'english',
          language
        );
        
        await this.sendMessage(user.whatsappNumber, ackMessage);
      } else {
        // Send the bot's response
        await this.sendMessage(user.whatsappNumber, ragResult.response);
      }
      if (!this.useInMemory) {
        await conversation.save();
      }

    } catch (error) {
      console.error('❌ Failed to process message:', error);
      
      // Send error message
      const errorMessage = await this.languageService.translate(
        "I apologize, but I encountered an error while processing your message. Please try again.",
        'english',
        language
      );
      
      await this.sendMessage(user.whatsappNumber, errorMessage);
    }
  }

  /**
   * Handle special commands (help, language settings, etc.)
   */
  async handleSpecialCommands(messageText, user, conversation, language) {
    const lowerText = messageText.toLowerCase().trim();
    
    // Help command
    if (lowerText === 'help' || lowerText === 'मदद' || lowerText === 'सहायता') {
      const helpMessage = await this.getHelpMessage(language);
      await this.sendMessage(user.whatsappNumber, helpMessage);
      return true;
    }
    
    // Language selection
    if (lowerText.startsWith('language:') || lowerText.startsWith('भाषा:')) {
      const langCode = lowerText.split(':')[1]?.trim();
      if (langCode && this.languageService.getSupportedLanguages()[langCode]) {
        user.primaryLanguage = langCode;
        if (this.useInMemory) {
          // no-op save
        } else {
          await user.save();
        }
        
        const confirmMessage = await this.languageService.translate(
          `Language updated to ${langCode}`,
          'english',
          langCode
        );
        
        await this.sendMessage(user.whatsappNumber, confirmMessage);
        return true;
      }
    }
    
    // Status command
    if (lowerText === 'status' || lowerText === 'स्थिति') {
      const statusMessage = await this.getStatusMessage(user, language);
      await this.sendMessage(user.whatsappNumber, statusMessage);
      return true;
    }
    
    return false;
  }

  /**
   * Create admin question for manual response
   */
  async createAdminQuestion(question, user, conversation, ragResult, language) {
    if (this.useInMemory) {
      const _id = this.genId('aq');
      const adminQuestion = {
        _id,
        question,
        originalQuestion: question,
        questionLanguage: language,
        detectedLanguage: ragResult.detectedLanguage,
        languageConfidence: 0.8,
        userId: user._id,
        userWhatsappNumber: user.whatsappNumber,
        platform: 'whatsapp',
        conversationId: conversation._id,
        ragContext: {
          retrievedDocs: (ragResult.retrievalResults.retrievedDocs || []).map(d => ({
            score: d.similarity,
            content: d.content,
            reason: `Low similarity score: ${d.similarity}`
          })),
          searchQuery: question,
          maxSimilarityScore: ragResult.retrievalResults.maxSimilarity,
          averageSimilarityScore: ragResult.retrievalResults.averageSimilarity,
          confidenceThreshold: 0.7,
          belowThreshold: ragResult.confidence < 0.7
        },
        status: 'pending',
        priority: 'medium',
        category: 'general',
        createdAt: new Date()
      };
      this.memory.adminQuestions.set(_id, adminQuestion);
      console.log(`❓ (memory) Created admin question: ${_id}`);
      return adminQuestion;
    }

    try {
      const adminQuestion = new AdminQuestion({
        question: question,
        originalQuestion: question,
        questionLanguage: language,
        detectedLanguage: ragResult.detectedLanguage,
        languageConfidence: 0.8, // Default confidence
        
        userId: user._id,
        userWhatsappNumber: user.whatsappNumber,
        platform: 'whatsapp',
        conversationId: conversation._id,
        
        ragContext: {
          retrievedDocs: ragResult.retrievalResults.retrievedDocs.map(doc => ({
            score: doc.similarity,
            content: doc.content,
            reason: `Low similarity score: ${doc.similarity}`
          })),
          searchQuery: question,
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
      
      console.log(`❓ Created admin question: ${adminQuestion._id}`);
      
      return adminQuestion;

    } catch (error) {
      console.error('❌ Failed to create admin question:', error);
      throw error;
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendMessage(toNumber, message) {
    try {
      // Ensure phone number format
      const formattedNumber = toNumber.startsWith('+') ? toNumber : `+${toNumber}`;
      const whatsappNumber = `whatsapp:${formattedNumber}`;
      
      console.log(`📤 Sending WhatsApp message to ${formattedNumber}: "${message.substring(0, 50)}..."`);
      
      const result = await this.client.messages.create({
        from: this.fromNumber,
        to: whatsappNumber,
        body: message
      });

      console.log(`✅ Message sent successfully: ${result.sid}`);
      return result;

    } catch (error) {
      console.error('❌ Failed to send WhatsApp message:', error);
      throw error;
    }
  }

  /**
   * Send admin response to user
   */
  async sendAdminResponse(adminQuestionId, response, adminUser) {
    if (this.useInMemory) {
      const aq = this.memory.adminQuestions.get(adminQuestionId);
      if (!aq) throw new Error('Admin question not found');
      const user = this.memory.usersByNumber.get(aq.userWhatsappNumber);
      const conversation = this.memory.conversationsById.get(aq.conversationId);
      const userLanguage = (user && user.primaryLanguage) || aq.questionLanguage || 'english';
      let finalResponse = response;
      if (userLanguage !== 'english') {
        finalResponse = await this.languageService.translate(response, 'english', userLanguage);
      }
      await this.sendMessage(user.whatsappNumber, finalResponse);
      aq.adminResponse = {
        response,
        responseLanguage: 'english',
        translatedResponse: finalResponse,
        respondedBy: (adminUser && adminUser._id) || 'in_memory_admin',
        respondedAt: new Date(),
        responseMethod: 'manual'
      };
      aq.status = 'answered';
      aq.deliveryStatus = {
        whatsappMessageId: this.genId('msg'),
        whatsappDeliveryStatus: 'sent',
        deliveredAt: new Date()
      };
      if (conversation) {
        conversation.addMessage({
          sender: 'admin',
          content: { text: finalResponse, language: userLanguage, originalText: response }
        });
        conversation.status = 'resolved';
      }
      console.log(`✅ (memory) Admin response sent for question: ${adminQuestionId}`);
      return { messageSid: aq.deliveryStatus.whatsappMessageId, translatedResponse: finalResponse };
    }

    try {
      const adminQuestion = await AdminQuestion.findById(adminQuestionId)
        .populate('userId')
        .populate('conversationId');

      if (!adminQuestion) {
        throw new Error('Admin question not found');
      }

      const user = adminQuestion.userId;
      const conversation = adminQuestion.conversationId;
      
      // Translate response to user's language if needed
      const userLanguage = user.primaryLanguage || adminQuestion.questionLanguage;
      let finalResponse = response;
      
      if (userLanguage !== 'english') {
        finalResponse = await this.languageService.translate(response, 'english', userLanguage);
      }

      // Send the response
      const messageResult = await this.sendMessage(user.whatsappNumber, finalResponse);

      // Update admin question
      adminQuestion.adminResponse = {
        response: response,
        responseLanguage: 'english',
        translatedResponse: finalResponse,
        respondedBy: adminUser._id,
        respondedAt: new Date(),
        responseMethod: 'manual'
      };
      
      adminQuestion.status = 'answered';
      adminQuestion.deliveryStatus = {
        whatsappMessageId: messageResult.sid,
        whatsappDeliveryStatus: 'sent',
        deliveredAt: new Date()
      };

      await adminQuestion.save();

      // Update conversation
      if (conversation) {
        conversation.addMessage({
          sender: 'admin',
          content: {
            text: finalResponse,
            language: userLanguage,
            originalText: response
          }
        });
        
        conversation.status = 'resolved';
        await conversation.save();
      }

      console.log(`✅ Admin response sent for question: ${adminQuestionId}`);
      
      return {
        messageSid: messageResult.sid,
        translatedResponse: finalResponse
      };

    } catch (error) {
      console.error('❌ Failed to send admin response:', error);
      throw error;
    }
  }

  /**
   * Find or create user by WhatsApp number
   */
  async findOrCreateUser(whatsappNumber) {
    if (this.useInMemory) {
      let user = this.memory.usersByNumber.get(whatsappNumber);
      if (user) return user;
      user = {
        _id: this.genId('usr'),
        email: `whatsapp_${whatsappNumber.replace('+','')}@temp.college.edu`,
        password: 'temporary_password_' + Math.random().toString(36).substring(7),
        name: `WhatsApp User ${whatsappNumber.slice(-4)}`,
        role: 'student',
        whatsappNumber,
        primaryLanguage: 'english',
        isVerified: false,
        save: async () => {}
      };
      this.memory.usersByNumber.set(whatsappNumber, user);
      console.log(`👤 (memory) Created new user: ${whatsappNumber}`);
      return user;
    }

    try {
      // Try to find existing user
      let user = await User.findOne({ whatsappNumber: whatsappNumber });
      
      if (user) {
        return user;
      }

      // Create new user
      user = new User({
        email: `whatsapp_${whatsappNumber.replace('+', '')}@temp.college.edu`,
        password: 'temporary_password_' + Math.random().toString(36).substring(7),
        name: `WhatsApp User ${whatsappNumber.slice(-4)}`,
        role: 'student',
        whatsappNumber: whatsappNumber,
        primaryLanguage: 'english',
        isVerified: false
      });

      await user.save();
      
      console.log(`👤 Created new user for WhatsApp: ${whatsappNumber}`);
      
      return user;

    } catch (error) {
      console.error('❌ Failed to find/create user:', error);
      throw error;
    }
  }

  /**
   * Find or create conversation
   */
  async findOrCreateConversation(userId, whatsappNumber) {
    if (this.useInMemory) {
      const existingId = this.memory.activeConversationByUser.get(userId);
      if (existingId) {
        return this.memory.conversationsById.get(existingId);
      }
      const convo = {
        _id: this.genId('convo'),
        userId,
        whatsappNumber,
        platform: 'whatsapp',
        sessionId: `whatsapp_${userId}_${Date.now()}`,
        status: 'active',
        messages: [],
        conversationLanguage: 'english',
        addMessage(msg) {
          this.messages.push({ ...msg, timestamp: new Date() });
        },
        save: async () => {}
      };
      this.memory.conversationsById.set(convo._id, convo);
      this.memory.activeConversationByUser.set(userId, convo._id);
      console.log(`💬 (memory) Created conversation: ${convo._id}`);
      return convo;
    }

    try {
      // Try to find active conversation
      let conversation = await Conversation.findOne({
        userId: userId,
        platform: 'whatsapp',
        status: { $in: ['active', 'waiting_admin'] }
      });

      if (conversation) {
        return conversation;
      }

      // Create new conversation
      conversation = new Conversation({
        userId: userId,
        whatsappNumber: whatsappNumber,
        platform: 'whatsapp',
        sessionId: `whatsapp_${userId}_${Date.now()}`,
        status: 'active'
      });

      await conversation.save();
      
      console.log(`💬 Created new conversation: ${conversation._id}`);
      
      return conversation;

    } catch (error) {
      console.error('❌ Failed to find/create conversation:', error);
      throw error;
    }
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(whatsappNumber) {
    const now = Date.now();
    const userQueue = this.messageQueue.get(whatsappNumber) || [];
    
    // Remove old messages outside the window
    const recentMessages = userQueue.filter(timestamp => now - timestamp < this.rateLimitWindow);
    
    if (recentMessages.length >= this.maxMessagesPerWindow) {
      return false;
    }
    
    // Add current message
    recentMessages.push(now);
    this.messageQueue.set(whatsappNumber, recentMessages);
    
    return true;
  }

  /**
   * Send rate limit message
   */
  async sendRateLimitMessage(whatsappNumber) {
    const message = "You're sending messages too quickly. Please wait a moment before sending another message.";
    await this.sendMessage(whatsappNumber, message);
  }

  /**
   * Send error message
   */
  async sendErrorMessage(whatsappNumber) {
    const message = "I apologize, but I encountered an error. Please try again later or contact support.";
    await this.sendMessage(whatsappNumber, message);
  }

  /**
   * Get help message
   */
  async getHelpMessage(language) {
    const helpText = `🏫 College Chatbot Help

Available commands:
• Ask any question about the college
• Type "help" for this message
• Type "status" to check your question status
• Type "language:hindi" to change language

Supported languages:
• English, हिंदी, मराठी
• मारवाड़ी, मेवाड़ी, ढूंढाड़ी

For urgent matters, contact college administration directly.`;

    return await this.languageService.translate(helpText, 'english', language);
  }

  /**
   * Get status message
   */
  async getStatusMessage(user, language) {
    if (this.useInMemory) {
      const pending = [...this.memory.adminQuestions.values()].filter(q =>
        q.userId === user._id && ['pending','assigned','in_progress'].includes(q.status)
      ).length;
      let statusText = `📊 Your Status:
• Pending questions: ${pending}
• Language: ${user.primaryLanguage}
• Account: ${user.isVerified ? 'Verified' : 'Unverified'}`;
      if (pending > 0) statusText += '\n\nYour questions are being reviewed by college staff.';
      return await this.languageService.translate(statusText, 'english', language);
    }

    try {
      const pendingQuestions = await AdminQuestion.countDocuments({
        userId: user._id,
        status: { $in: ['pending', 'assigned', 'in_progress'] }
      });

      let statusText = `📊 Your Status:
• Pending questions: ${pendingQuestions}
• Language: ${user.primaryLanguage}
• Account: ${user.isVerified ? 'Verified' : 'Unverified'}`;

      if (pendingQuestions > 0) {
        statusText += '\n\nYour questions are being reviewed by college staff.';
      }

      return await this.languageService.translate(statusText, 'english', language);

    } catch (error) {
      return await this.languageService.translate('Unable to fetch status at the moment.', 'english', language);
    }
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      fromNumber: this.fromNumber,
      activeQueues: this.messageQueue.size,
      rateLimitWindow: this.rateLimitWindow,
      maxMessagesPerWindow: this.maxMessagesPerWindow
    };
  }

  /**
   * Clear message queues (for cleanup)
   */
  clearQueues() {
    this.messageQueue.clear();
    console.log('🗑️ WhatsApp message queues cleared');
  }
}

module.exports = WhatsAppService;

// NOTE: The "Cannot find module './backend/routes/user'" error was resolved by creating backend/routes/user.js
// No code changes needed here.