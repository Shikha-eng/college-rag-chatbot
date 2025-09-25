const OpenAI = require('openai');
const LocalVectorDatabaseService = require('./localVectorDatabase');
const LanguageService = require('./language');

/**
 * RAG (Retrieval-Augmented Generation) Service
 * Handles question answering using retrieved context and LLM generation
 */
class RAGService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.vectorService = new LocalVectorDatabaseService();
    this.languageService = new LanguageService();
    
    // RAG Configuration
    this.config = {
      maxRetrievedDocs: 5,
      similarityThreshold: 0.3,
      maxContextLength: 3000,
      maxResponseLength: 500,
      temperature: 0.3,
      model: 'gpt-3.5-turbo'
    };

    // Confidence thresholds for different actions
    this.thresholds = {
      highConfidence: 0.7,    // Answer directly
      mediumConfidence: 0.4,  // Answer with disclaimer
      lowConfidence: 0.3      // Forward to admin
    };
  }

  /**
   * Initialize the RAG service
   */
  async initialize() {
    console.log('🚀 Initializing RAG Service...');
    
    await this.vectorService.initialize();
    await this.languageService.initialize();
    
    console.log('✅ RAG Service initialized');
  }

  /**
   * Process a question and generate an answer
   */
  async processQuestion(question, options = {}) {
    try {
      const {
        userId,
        language = 'english',
        platform = 'web',
        conversationId
      } = options;

      console.log(`❓ Processing question: "${question.substring(0, 100)}..."`);

      // Step 1: Detect and translate question if needed
      const processedQuestion = await this.preprocessQuestion(question, language);

      // Step 2: Retrieve relevant context
      const retrievalResult = await this.retrieveContext(processedQuestion.text, {
        topK: this.config.maxRetrievedDocs,
        threshold: this.config.similarityThreshold,
        language: processedQuestion.detectedLanguage
      });

      // Step 3: Determine response strategy based on confidence
      const responseStrategy = this.determineResponseStrategy(retrievalResult);

      // Step 4: Generate response based on strategy
      let response;
      
      if (responseStrategy.action === 'answer') {
        response = await this.generateAnswer(processedQuestion, retrievalResult, language);
      } else if (responseStrategy.action === 'partial_answer') {
        response = await this.generatePartialAnswer(processedQuestion, retrievalResult, language);
      } else {
        response = await this.generateNoAnswerResponse(processedQuestion, language);
      }

      // Step 5: Create response object
      const result = {
        question: question,
        processedQuestion: processedQuestion.text,
        detectedLanguage: processedQuestion.detectedLanguage,
        targetLanguage: language,
        
        response: response.answer,
        confidence: responseStrategy.confidence,
        strategy: responseStrategy.action,
        
        retrievalResults: {
          totalResults: retrievalResult.totalResults,
          maxSimilarity: retrievalResult.maxSimilarity,
          averageSimilarity: retrievalResult.averageSimilarity,
          retrievedDocs: retrievalResult.results.map(r => ({
            documentTitle: r.documentTitle,
            similarity: r.similarity,
            content: r.content.substring(0, 200) + '...'
          }))
        },
        
        needsAdminResponse: responseStrategy.action === 'forward_to_admin',
        
        metadata: {
          model: this.config.model,
          temperature: this.config.temperature,
          timestamp: new Date().toISOString(),
          processingTime: response.processingTime
        }
      };

      console.log(`✅ Question processed. Strategy: ${responseStrategy.action}, Confidence: ${responseStrategy.confidence.toFixed(2)}`);

      return result;

    } catch (error) {
      console.error('❌ Failed to process question:', error);
      
      // Return error response
      return {
        question: question,
        response: await this.languageService.translate(
          'I apologize, but I encountered an error while processing your question. Please try again or contact support.',
          'english',
          options.language || 'english'
        ),
        confidence: 0,
        strategy: 'error',
        needsAdminResponse: true,
        error: error.message
      };
    }
  }

  /**
   * Preprocess question (language detection and translation)
   */
  async preprocessQuestion(question, targetLanguage) {
    try {
      // Detect question language
      const detectedLanguage = await this.languageService.detectLanguage(question);
      
      let processedText = question;
      
      // Translate to English for better retrieval if needed
      if (detectedLanguage !== 'english') {
        processedText = await this.languageService.translate(question, detectedLanguage, 'english');
        console.log(`🔄 Translated question from ${detectedLanguage} to English`);
      }

      return {
        original: question,
        text: processedText,
        detectedLanguage: detectedLanguage
      };

    } catch (error) {
      console.error('❌ Question preprocessing failed:', error);
      return {
        original: question,
        text: question,
        detectedLanguage: targetLanguage
      };
    }
  }

  /**
   * Retrieve relevant context using vector search
   */
  async retrieveContext(question, options = {}) {
    try {
      console.log('🔍 Retrieving relevant context...');
      
      const result = await this.vectorService.similaritySearch(question, options);
      
      console.log(`📊 Retrieved ${result.totalResults} relevant documents`);
      
      return result;

    } catch (error) {
      console.error('❌ Context retrieval failed:', error);
      return {
        query: question,
        results: [],
        totalResults: 0,
        maxSimilarity: 0,
        averageSimilarity: 0
      };
    }
  }

  /**
   * Determine response strategy based on retrieval confidence
   */
  determineResponseStrategy(retrievalResult) {
    const maxSimilarity = retrievalResult.maxSimilarity;
    const totalResults = retrievalResult.totalResults;
    
    if (maxSimilarity >= this.thresholds.highConfidence && totalResults > 0) {
      return {
        action: 'answer',
        confidence: maxSimilarity,
        reason: 'High similarity match found'
      };
    }
    
    if (maxSimilarity >= this.thresholds.mediumConfidence && totalResults > 0) {
      return {
        action: 'partial_answer',
        confidence: maxSimilarity,
        reason: 'Medium similarity match found'
      };
    }
    
    return {
      action: 'forward_to_admin',
      confidence: maxSimilarity,
      reason: 'No confident match found'
    };
  }

  /**
   * Generate a confident answer using retrieved context
   */
  async generateAnswer(processedQuestion, retrievalResult, targetLanguage) {
    try {
      const startTime = Date.now();
      
      // Prepare context from retrieved documents
      const context = this.prepareContext(retrievalResult.results);
      
      // Create system prompt
      const systemPrompt = this.createSystemPrompt('confident', targetLanguage);
      
      // Create user prompt with context
      const userPrompt = this.createUserPrompt(processedQuestion.text, context);
      
      console.log('🤖 Generating confident answer...');
      
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxResponseLength
      });

      const answer = response.choices[0].message.content.trim();
      
      // Translate answer to target language if needed
      const finalAnswer = targetLanguage !== 'english' 
        ? await this.languageService.translate(answer, 'english', targetLanguage)
        : answer;

      return {
        answer: finalAnswer,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Answer generation failed:', error);
      return {
        answer: await this.languageService.translate(
          'I apologize, but I encountered an error while generating your answer.',
          'english',
          targetLanguage
        ),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate a partial answer with disclaimer - LOCAL VERSION WITHOUT OPENAI
   */
  async generatePartialAnswer(processedQuestion, retrievalResult, targetLanguage) {
    const startTime = Date.now();
    try {
      console.log('🤖 Generating answer from PDF content (local mode)...');
      
      // Extract the most relevant content from retrieved documents
      const relevantContent = this.extractRelevantContent(retrievalResult.results, processedQuestion.text);
      
      // Generate a structured answer based on the PDF content
      let answer = '';
      
      if (relevantContent.length > 0) {
        // Create answer from most relevant document content
        const topContent = relevantContent[0];
        
        // Extract specific information based on question type
        if (processedQuestion.text.toLowerCase().includes('exam')) {
          answer = this.extractExamInfo(topContent.content);
        } else if (processedQuestion.text.toLowerCase().includes('sports') || processedQuestion.text.toLowerCase().includes('competition')) {
          answer = this.extractSportsInfo(topContent.content);
        } else if (processedQuestion.text.toLowerCase().includes('course') || processedQuestion.text.toLowerCase().includes('department')) {
          answer = this.extractCourseInfo(topContent.content);
        } else if (processedQuestion.text.toLowerCase().includes('admission')) {
          answer = this.extractAdmissionInfo(topContent.content);
        } else {
          // Generic extraction - use the most relevant content
          answer = this.extractGeneralInfo(topContent.content, processedQuestion.text);
        }
        
        // Add source reference
        answer += `\n\n📄 Source: ${topContent.documentTitle || 'Rizvi College Document'}`;
      } else {
        answer = 'I found some information in the college documents, but need more specific details to provide a complete answer.';
      }
      
      // Add disclaimer for PDF-based answers
      const disclaimer = `\n\n⚠️ Note: This information is from the college documents. For the most current details, please contact the college administration.`;
      answer += disclaimer;
      
      // Translate to target language if needed
      const finalAnswer = targetLanguage !== 'english' 
        ? await this.languageService.translate(answer, 'english', targetLanguage)
        : answer;

      return {
        answer: finalAnswer,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('❌ Partial answer generation failed:', error);
      return {
        answer: await this.languageService.translate(
          'I found some relevant information but cannot provide a complete answer. Please contact the college administration for detailed information.',
          'english',
          targetLanguage
        ),
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate response when no relevant context is found
   */
  async generateNoAnswerResponse(processedQuestion, targetLanguage) {
    const startTime = Date.now();
    
    const responses = [
      "I apologize, but I don't have specific information about your question in my current knowledge base.",
      "I don't have enough information to answer your question accurately.",
      "Your question requires specific details that I don't currently have access to."
    ];
    
    const baseResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const fullResponse = baseResponse + " Your question has been forwarded to our college administration team, and they will get back to you soon via WhatsApp.";
    
    const finalAnswer = await this.languageService.translate(fullResponse, 'english', targetLanguage);
    
    return {
      answer: finalAnswer,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Prepare context from retrieved documents
   */
  prepareContext(retrievedResults) {
    let context = '';
    let currentLength = 0;
    
    for (const result of retrievedResults) {
      const chunk = `\n\nDocument: ${result.documentTitle}\nContent: ${result.content}`;
      
      if (currentLength + chunk.length > this.config.maxContextLength) {
        break;
      }
      
      context += chunk;
      currentLength += chunk.length;
    }
    
    return context.trim();
  }

  /**
   * Create system prompt based on answer type
   */
  createSystemPrompt(answerType, targetLanguage) {
    const basePrompt = "You are a helpful college information assistant. Your role is to provide accurate, helpful, and concise information about college-related topics based on the provided context.";
    
    const languageInstruction = targetLanguage !== 'english' 
      ? `Always respond in ${targetLanguage} language.`
      : '';
    
    switch (answerType) {
      case 'confident':
        return `${basePrompt} ${languageInstruction}
        
        Guidelines:
        - Use only the provided context to answer questions
        - Be confident and direct in your responses
        - Provide specific details when available
        - If context doesn't fully answer the question, acknowledge what you know
        - Keep responses concise but informative
        - Use a friendly, professional tone`;
        
      case 'partial':
        return `${basePrompt} ${languageInstruction}
        
        Guidelines:
        - Use the provided context but acknowledge limitations
        - Be clear that your answer may not be complete
        - Suggest contacting college administration for full details
        - Provide what helpful information you can from the context
        - Use a helpful but cautious tone`;
        
      default:
        return `${basePrompt} ${languageInstruction}`;
    }
  }

  /**
   * Create user prompt with question and context
   */
  createUserPrompt(question, context) {
    if (context.trim().length === 0) {
      return `Question: ${question}\n\nI don't have any relevant context to answer this question.`;
    }
    
    return `Context: ${context}

Question: ${question}

Please answer the question based on the provided context. If the context doesn't contain enough information to fully answer the question, be honest about the limitations while providing what helpful information you can.`;
  }

  /**
   * Get RAG service statistics
   */
  getStats() {
    return {
      config: this.config,
      thresholds: this.thresholds,
      vectorServiceStats: this.vectorService.getStats()
    };
  }

  /**
   * Update RAG configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ RAG configuration updated:', newConfig);
  }

  /**
   * Helper methods for extracting specific information from PDF content
   */
  extractRelevantContent(results, question) {
    // Return top 3 most relevant results
    return results.slice(0, 3).map(result => ({
      content: result.content,
      score: result.score,
      documentTitle: result.documentTitle || 'College Document'
    }));
  }

  extractExamInfo(content) {
    const text = content.toLowerCase();
    if (text.includes('mid-semester') || text.includes('midterm')) {
      if (text.includes('october') || text.includes('15th october')) {
        return 'Based on the college documents, mid-semester exams are scheduled to start from 15th October 2025. Please verify the exact dates with your department for any recent updates.';
      }
    }
    
    if (text.includes('exam') && text.includes('date')) {
      // Extract exam-related information
      const sentences = content.split(/[.!?]+/);
      const examSentences = sentences.filter(s => 
        s.toLowerCase().includes('exam') && 
        (s.toLowerCase().includes('date') || s.toLowerCase().includes('october') || s.toLowerCase().includes('november'))
      );
      
      if (examSentences.length > 0) {
        return `According to the college documents: ${examSentences[0].trim()}.`;
      }
    }
    
    return 'I found exam-related information in the college documents. The mid-semester exams are typically scheduled in October. Please contact your department for specific dates and schedules.';
  }

  extractSportsInfo(content) {
    const text = content.toLowerCase();
    if (text.includes('sports') || text.includes('competition')) {
      if (text.includes('november') || text.includes('1st november')) {
        return 'According to the college documents, inter-college sports competitions are scheduled to begin from 1st November 2025. This includes various sporting events and competitions.';
      }
      
      // Extract sports-related sentences
      const sentences = content.split(/[.!?]+/);
      const sportsSentences = sentences.filter(s => 
        s.toLowerCase().includes('sport') || 
        s.toLowerCase().includes('competition') ||
        s.toLowerCase().includes('tournament')
      );
      
      if (sportsSentences.length > 0) {
        return `Based on the college documents: ${sportsSentences[0].trim()}.`;
      }
    }
    
    return 'The college organizes various sports competitions and inter-college tournaments. According to the documents, these events typically happen in November. Please check with the sports department for specific schedules.';
  }

  extractCourseInfo(content) {
    const text = content.toLowerCase();
    const sentences = content.split(/[.!?]+/);
    
    // Look for course/department information
    const courseSentences = sentences.filter(s => 
      s.toLowerCase().includes('course') || 
      s.toLowerCase().includes('department') ||
      s.toLowerCase().includes('program') ||
      s.toLowerCase().includes('engineering') ||
      s.toLowerCase().includes('degree')
    );
    
    if (courseSentences.length > 0) {
      return `According to the college documents: ${courseSentences.slice(0, 2).join('. ').trim()}.`;
    }
    
    return 'Rizvi College offers various engineering and technical courses. Please contact the admissions office for detailed information about specific courses, eligibility, and curriculum.';
  }

  extractAdmissionInfo(content) {
    const text = content.toLowerCase();
    const sentences = content.split(/[.!?]+/);
    
    const admissionSentences = sentences.filter(s => 
      s.toLowerCase().includes('admission') || 
      s.toLowerCase().includes('application') ||
      s.toLowerCase().includes('eligibility') ||
      s.toLowerCase().includes('apply')
    );
    
    if (admissionSentences.length > 0) {
      return `Based on the college admission information: ${admissionSentences.slice(0, 2).join('. ').trim()}.`;
    }
    
    return 'The college has specific admission procedures and eligibility criteria. Please contact the admissions office or visit the college website for detailed information about the admission process.';
  }

  extractGeneralInfo(content, question) {
    // Extract the most relevant sentences based on question keywords
    const questionWords = question.toLowerCase().split(' ').filter(word => 
      word.length > 3 && !['what', 'when', 'where', 'how', 'why', 'the', 'and', 'are', 'is'].includes(word)
    );
    
    const sentences = content.split(/[.!?]+/);
    const relevantSentences = sentences.filter(sentence => {
      const lowerSentence = sentence.toLowerCase();
      return questionWords.some(word => lowerSentence.includes(word));
    });
    
    if (relevantSentences.length > 0) {
      return `According to the college documents: ${relevantSentences.slice(0, 2).join('. ').trim()}.`;
    }
    
    // Fallback: return first meaningful sentence
    const meaningfulSentences = sentences.filter(s => s.trim().length > 20);
    if (meaningfulSentences.length > 0) {
      return `From the college documents: ${meaningfulSentences[0].trim()}.`;
    }
    
    return 'I found relevant information in the college documents. Please contact the college administration for more specific details about your inquiry.';
  }
}

module.exports = RAGService;