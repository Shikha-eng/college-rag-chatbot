const translate = require('google-translate-api-x');

/**
 * Language Service
 * Handles language detection and translation for multilingual support
 */
class LanguageService {
  constructor() {
    // Supported languages mapping
    this.supportedLanguages = {
      'hindi': { code: 'hi', name: 'हिंदी', native: 'Hindi' },
      'english': { code: 'en', name: 'English', native: 'English' },
      'marathi': { code: 'mr', name: 'मराठी', native: 'Marathi' },
      'marwari': { code: 'mwr', name: 'मारवाड़ी', native: 'Marwari' },
      'mewadi': { code: 'mtr', name: 'मेवाड़ी', native: 'Mewadi' },
      'dhundhari': { code: 'dhd', name: 'ढूंढाड़ी', native: 'Dhundhari' }
    };

    // Language detection patterns for regional languages
    this.languagePatterns = {
      hindi: [
        /[\u0900-\u097F]/,  // Devanagari script
        /क्या|कैसे|कहाँ|कब|क्यों|है|हैं|का|की|के|में|से|पर|तक/
      ],
      marathi: [
        /[\u0900-\u097F]/,  // Devanagari script
        /काय|कसे|कुठे|केव्हा|का|आहे|आहेत|च्या|मध्ये|वर|पासून/
      ],
      marwari: [
        /[\u0900-\u097F]/,  // Devanagari script
        /क्यूं|कैं|कठै|कद|सूं|रो|री|रा|में|नै|को|का/
      ],
      mewadi: [
        /[\u0900-\u097F]/,  // Devanagari script
        /क्यूं|कैकर|कठै|कद|सूं|रो|री|रा|में|नै|को|का/
      ],
      dhundhari: [
        /[\u0900-\u097F]/,  // Devanagari script
        /क्यूं|कैकर|कठै|कद|सूं|रो|री|रा|में|नै|को|का/
      ]
    };

    // Common phrases in different languages for better translation
    this.commonPhrases = {
      greetings: {
        english: ['hello', 'hi', 'good morning', 'good afternoon', 'good evening'],
        hindi: ['नमस्ते', 'नमस्कार', 'हैलो', 'हाय', 'सुप्रभात', 'शुभ दोपहर', 'शुभ संध्या'],
        marathi: ['नमस्ते', 'नमस्कार', 'हॅलो', 'हाय', 'शुभ सकाळ', 'शुभ दुपार', 'शुभ संध्याकाळ'],
        marwari: ['नमस्कार', 'राम राम', 'खम्मा घणी', 'सुप्रभात'],
        mewadi: ['नमस्कार', 'राम राम', 'खम्मा घणी'],
        dhundhari: ['नमस्कार', 'राम राम', 'खम्मा घणी']
      },
      questions: {
        english: ['what', 'how', 'where', 'when', 'why', 'who'],
        hindi: ['क्या', 'कैसे', 'कहाँ', 'कब', 'क्यों', 'कौन'],
        marathi: ['काय', 'कसे', 'कुठे', 'केव्हा', 'का', 'कोण'],
        marwari: ['क्यूं', 'कैं', 'कठै', 'कद', 'कुण'],
        mewadi: ['क्यूं', 'कैकर', 'कठै', 'कद', 'कुण'],
        dhundhari: ['क्यूं', 'कैकर', 'कठै', 'कद', 'कुण']
      }
    };

    // Translation cache to avoid repeated API calls
    this.translationCache = new Map();
    this.detectionCache = new Map();
  }

  /**
   * Initialize the language service
   */
  async initialize() {
    console.log('🌍 Initializing Language Service...');
    console.log(`📋 Supported languages: ${Object.keys(this.supportedLanguages).join(', ')}`);
    console.log('✅ Language Service initialized');
  }

  /**
   * Detect language of input text
   */
  async detectLanguage(text) {
    try {
      const cleanText = text.trim().toLowerCase();
      
      // Check cache first
      const cacheKey = `detect_${cleanText}`;
      if (this.detectionCache.has(cacheKey)) {
        return this.detectionCache.get(cacheKey);
      }

      // Rule-based detection for regional languages
      const ruleBasedLanguage = this.detectLanguageByRules(cleanText);
      if (ruleBasedLanguage && ruleBasedLanguage !== 'english') {
        this.detectionCache.set(cacheKey, ruleBasedLanguage);
        return ruleBasedLanguage;
      }

      // Use Google Translate API for detection
      let detectedLanguage = 'english'; // default
      
      try {
        const detection = await translate(text, { to: 'en' });
        
        if (detection && detection.from && detection.from.language) {
          const detectedCode = detection.from.language.iso;
          
          // Map detected language code to our supported languages
          detectedLanguage = this.mapLanguageCode(detectedCode) || 'english';
        }
      } catch (apiError) {
        console.warn('⚠️ Google Translate detection failed, using rule-based detection');
        detectedLanguage = ruleBasedLanguage || 'english';
      }

      // Cache the result
      this.detectionCache.set(cacheKey, detectedLanguage);
      
      console.log(`🔍 Detected language: ${detectedLanguage} for text: "${text.substring(0, 50)}..."`);
      return detectedLanguage;

    } catch (error) {
      console.error('❌ Language detection failed:', error);
      return 'english'; // fallback
    }
  }

  /**
   * Rule-based language detection for regional languages
   */
  detectLanguageByRules(text) {
    // Check English first (Latin script)
    if (/^[a-zA-Z0-9\s.,!?'"()\-]+$/.test(text)) {
      return 'english';
    }

    // Check for Devanagari script languages
    if (/[\u0900-\u097F]/.test(text)) {
      // Check for specific language patterns
      for (const [language, patterns] of Object.entries(this.languagePatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(text)) {
            // Count matches to determine most likely language
            const matches = (text.match(pattern) || []).length;
            if (matches > 0) {
              console.log(`🎯 Rule-based detection: ${language} (${matches} matches)`);
              return language;
            }
          }
        }
      }
      
      // Default to Hindi if Devanagari script but no specific patterns
      return 'hindi';
    }

    return 'english'; // fallback
  }

  /**
   * Map language codes to our supported languages
   */
  mapLanguageCode(code) {
    const mapping = {
      'en': 'english',
      'hi': 'hindi',
      'mr': 'marathi',
      'mwr': 'marwari',
      'mtr': 'mewadi',
      'dhd': 'dhundhari'
    };
    
    return mapping[code] || null;
  }

  /**
   * Translate text between languages
   */
  async translate(text, fromLanguage, toLanguage) {
    try {
      // If languages are the same, return original text
      if (fromLanguage === toLanguage) {
        return text;
      }

      const cleanText = text.trim();
      if (!cleanText) {
        return text;
      }

      // Check cache first
      const cacheKey = `translate_${fromLanguage}_${toLanguage}_${cleanText}`;
      if (this.translationCache.has(cacheKey)) {
        return this.translationCache.get(cacheKey);
      }

      // Get language codes
      const fromCode = this.getLanguageCode(fromLanguage);
      const toCode = this.getLanguageCode(toLanguage);

      if (!fromCode || !toCode) {
        console.warn(`⚠️ Unsupported language pair: ${fromLanguage} -> ${toLanguage}`);
        return text;
      }

      let translatedText = text;

      // Handle regional languages with special processing
      if (this.isRegionalLanguage(fromLanguage) || this.isRegionalLanguage(toLanguage)) {
        translatedText = await this.translateRegionalLanguage(text, fromLanguage, toLanguage);
      } else {
        // Use Google Translate for standard languages
        try {
          const result = await translate(text, { from: fromCode, to: toCode });
          translatedText = result.text || text;
        } catch (apiError) {
          console.warn('⚠️ Google Translate API failed:', apiError.message);
          
          // Fallback: try basic word replacement for common phrases
          translatedText = this.basicPhraseTranslation(text, fromLanguage, toLanguage);
        }
      }

      // Cache the result
      this.translationCache.set(cacheKey, translatedText);
      
      console.log(`🔄 Translated (${fromLanguage} -> ${toLanguage}): "${text.substring(0, 30)}..." -> "${translatedText.substring(0, 30)}..."`);
      
      return translatedText;

    } catch (error) {
      console.error('❌ Translation failed:', error);
      return text; // Return original text on failure
    }
  }

  /**
   * Translate regional languages with special handling
   */
  async translateRegionalLanguage(text, fromLanguage, toLanguage) {
    try {
      // For regional languages, we'll use a multi-step approach:
      // 1. If from regional -> first translate to Hindi
      // 2. Then from Hindi to target language
      
      let intermediateText = text;
      
      if (this.isRegionalLanguage(fromLanguage) && fromLanguage !== 'hindi') {
        // Step 1: Regional -> Hindi
        intermediateText = await this.regionalToHindi(text, fromLanguage);
      }
      
      if (toLanguage === 'hindi') {
        return intermediateText;
      }
      
      if (toLanguage === 'english') {
        // Step 2: Hindi -> English
        const result = await translate(intermediateText, { from: 'hi', to: 'en' });
        return result.text || text;
      }
      
      if (this.isRegionalLanguage(toLanguage) && toLanguage !== 'hindi') {
        // Step 3: Hindi -> Regional
        return await this.hindiToRegional(intermediateText, toLanguage);
      }
      
      return intermediateText;

    } catch (error) {
      console.error('❌ Regional language translation failed:', error);
      return text;
    }
  }

  /**
   * Convert regional language to Hindi
   */
  async regionalToHindi(text, fromLanguage) {
    // This is a simplified implementation
    // In a production system, you'd want a more sophisticated approach
    
    const commonWordMappings = {
      marwari: {
        'क्यूं': 'क्यों',
        'कैं': 'कैसे',
        'कठै': 'कहाँ',
        'कद': 'कब',
        'सूं': 'से',
        'नै': 'को',
        'रो': 'का',
        'री': 'की',
        'रा': 'के'
      },
      mewadi: {
        'क्यूं': 'क्यों',
        'कैकर': 'कैसे',
        'कठै': 'कहाँ',
        'कद': 'कब',
        'सूं': 'से',
        'नै': 'को'
      },
      dhundhari: {
        'क्यूं': 'क्यों',
        'कैकर': 'कैसे',
        'कठै': 'कहाँ',
        'कद': 'कब',
        'सूं': 'से',
        'नै': 'को'
      }
    };

    let hindiText = text;
    const mappings = commonWordMappings[fromLanguage] || {};
    
    for (const [regional, hindi] of Object.entries(mappings)) {
      hindiText = hindiText.replace(new RegExp(regional, 'g'), hindi);
    }
    
    return hindiText;
  }

  /**
   * Convert Hindi to regional language
   */
  async hindiToRegional(text, toLanguage) {
    // Reverse mapping from Hindi to regional
    const commonWordMappings = {
      marwari: {
        'क्यों': 'क्यूं',
        'कैसे': 'कैं',
        'कहाँ': 'कठै',
        'कब': 'कद',
        'से': 'सूं',
        'को': 'नै',
        'का': 'रो',
        'की': 'री',
        'के': 'रा'
      },
      mewadi: {
        'क्यों': 'क्यूं',
        'कैसे': 'कैकर',
        'कहाँ': 'कठै',
        'कब': 'कद',
        'से': 'सूं',
        'को': 'नै'
      },
      dhundhari: {
        'क्यों': 'क्यूं',
        'कैसे': 'कैकर',
        'कहाँ': 'कठै',
        'कब': 'कद',
        'से': 'सूं',
        'को': 'नै'
      }
    };

    let regionalText = text;
    const mappings = commonWordMappings[toLanguage] || {};
    
    for (const [hindi, regional] of Object.entries(mappings)) {
      regionalText = regionalText.replace(new RegExp(hindi, 'g'), regional);
    }
    
    return regionalText;
  }

  /**
   * Basic phrase translation for fallback
   */
  basicPhraseTranslation(text, fromLanguage, toLanguage) {
    const lowerText = text.toLowerCase();
    
    // Check if text contains common phrases
    for (const [category, phrases] of Object.entries(this.commonPhrases)) {
      const fromPhrases = phrases[fromLanguage] || [];
      const toPhrases = phrases[toLanguage] || [];
      
      for (let i = 0; i < fromPhrases.length; i++) {
        if (lowerText.includes(fromPhrases[i].toLowerCase()) && toPhrases[i]) {
          return text.replace(new RegExp(fromPhrases[i], 'gi'), toPhrases[i]);
        }
      }
    }
    
    return text; // Return original if no matches
  }

  /**
   * Get language code for a language
   */
  getLanguageCode(language) {
    const langInfo = this.supportedLanguages[language];
    return langInfo ? langInfo.code : null;
  }

  /**
   * Check if language is a regional language
   */
  isRegionalLanguage(language) {
    return ['marwari', 'mewadi', 'dhundhari'].includes(language);
  }

  /**
   * Get language confidence score
   */
  getLanguageConfidence(text, detectedLanguage) {
    // Simple confidence calculation based on pattern matches
    const patterns = this.languagePatterns[detectedLanguage] || [];
    let matchCount = 0;
    
    for (const pattern of patterns) {
      const matches = (text.match(pattern) || []).length;
      matchCount += matches;
    }
    
    // Normalize confidence (0-1)
    const confidence = Math.min(matchCount / 3, 1);
    return Math.round(confidence * 100) / 100;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.translationCache.clear();
    this.detectionCache.clear();
    console.log('🗑️ Translation cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      translationCacheSize: this.translationCache.size,
      detectionCacheSize: this.detectionCache.size,
      supportedLanguages: Object.keys(this.supportedLanguages).length
    };
  }
}

module.exports = LanguageService;