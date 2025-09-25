import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-hot-toast';

// Supported languages with their details
const LANGUAGES = {
  english: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    rtl: false,
    script: 'latin'
  },
  hindi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    rtl: false,
    script: 'devanagari'
  },
  marathi: {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    rtl: false,
    script: 'devanagari'
  },
  marwari: {
    code: 'mwr',
    name: 'Marwari',
    nativeName: 'मारवाड़ी',
    rtl: false,
    script: 'devanagari'
  },
  mewadi: {
    code: 'mew',
    name: 'Mewadi',
    nativeName: 'मेवाड़ी',
    rtl: false,
    script: 'devanagari'
  },
  dhundhari: {
    code: 'dhd',
    name: 'Dhundhari',
    nativeName: 'ढुंढाड़ी',
    rtl: false,
    script: 'devanagari'
  }
};

// Initial state
const initialState = {
  currentLanguage: 'english',
  supportedLanguages: LANGUAGES,
  translations: {},
  isLoading: false,
  error: null,
  autoDetect: true,
  isTranslating: false,
};

// Action types
const LANGUAGE_TYPES = {
  SET_LANGUAGE: 'SET_LANGUAGE',
  SET_TRANSLATIONS: 'SET_TRANSLATIONS',
  TRANSLATION_START: 'TRANSLATION_START',
  TRANSLATION_END: 'TRANSLATION_END',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  TOGGLE_AUTO_DETECT: 'TOGGLE_AUTO_DETECT',
  SET_LOADING: 'SET_LOADING',
};

// Reducer function
const languageReducer = (state, action) => {
  switch (action.type) {
    case LANGUAGE_TYPES.SET_LANGUAGE:
      return {
        ...state,
        currentLanguage: action.payload,
        error: null,
      };
      
    case LANGUAGE_TYPES.SET_TRANSLATIONS:
      return {
        ...state,
        translations: {
          ...state.translations,
          [action.payload.key]: action.payload.translations,
        },
      };
      
    case LANGUAGE_TYPES.TRANSLATION_START:
      return {
        ...state,
        isTranslating: true,
        error: null,
      };
      
    case LANGUAGE_TYPES.TRANSLATION_END:
      return {
        ...state,
        isTranslating: false,
      };
      
    case LANGUAGE_TYPES.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        isTranslating: false,
      };
      
    case LANGUAGE_TYPES.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    case LANGUAGE_TYPES.TOGGLE_AUTO_DETECT:
      return {
        ...state,
        autoDetect: !state.autoDetect,
      };
      
    case LANGUAGE_TYPES.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
      
    default:
      return state;
  }
};

// Create context
const LanguageContext = createContext();

// Language provider component
export const LanguageProvider = ({ children }) => {
  const [state, dispatch] = useReducer(languageReducer, initialState);

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred_language');
    const browserLanguage = getBrowserLanguage();
    
    const initialLanguage = savedLanguage || browserLanguage || 'english';
    
    if (initialLanguage !== state.currentLanguage) {
      changeLanguage(initialLanguage);
    }
  }, []);

  // Get browser language preference
  const getBrowserLanguage = () => {
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0].toLowerCase();
    
    // Map browser language codes to our supported languages
    const langMap = {
      'en': 'english',
      'hi': 'hindi',
      'mr': 'marathi',
    };
    
    return langMap[langCode] || 'english';
  };

  // Change language
  const changeLanguage = (languageKey) => {
    if (!LANGUAGES[languageKey]) {
      toast.error(`Language ${languageKey} is not supported`);
      return;
    }

    try {
      dispatch({ type: LANGUAGE_TYPES.SET_LANGUAGE, payload: languageKey });
      localStorage.setItem('preferred_language', languageKey);
      
      toast.success(`Language changed to ${LANGUAGES[languageKey].name}`);
      
      // Update document direction for RTL languages
      document.dir = LANGUAGES[languageKey].rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = LANGUAGES[languageKey].code;
      
    } catch (error) {
      console.error('Error changing language:', error);
      dispatch({ type: LANGUAGE_TYPES.SET_ERROR, payload: 'Failed to change language' });
    }
  };

  // Detect language from text
  const detectLanguage = async (text) => {
    try {
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_START });
      
      const response = await fetch('/api/language/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Language detection failed');
      }

      const data = await response.json();
      
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_END });
      
      return data.detectedLanguage;
    } catch (error) {
      console.error('Language detection error:', error);
      dispatch({ type: LANGUAGE_TYPES.SET_ERROR, payload: 'Language detection failed' });
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_END });
      return 'english'; // Default fallback
    }
  };

  // Translate text
  const translateText = async (text, targetLanguage, sourceLanguage = null) => {
    try {
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_START });
      
      const response = await fetch('/api/language/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_END });
      
      return data.translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      dispatch({ type: LANGUAGE_TYPES.SET_ERROR, payload: 'Translation failed' });
      dispatch({ type: LANGUAGE_TYPES.TRANSLATION_END });
      return text; // Return original text on failure
    }
  };

  // Get language direction (LTR/RTL)
  const getLanguageDirection = (languageKey = null) => {
    const lang = languageKey || state.currentLanguage;
    return LANGUAGES[lang]?.rtl ? 'rtl' : 'ltr';
  };

  // Get language script type
  const getLanguageScript = (languageKey = null) => {
    const lang = languageKey || state.currentLanguage;
    return LANGUAGES[lang]?.script || 'latin';
  };

  // Format text according to language preferences
  const formatText = (text, languageKey = null) => {
    const lang = languageKey || state.currentLanguage;
    const langInfo = LANGUAGES[lang];
    
    if (!langInfo) return text;
    
    // Add any language-specific formatting here
    return text;
  };

  // Get localized language names
  const getLanguageNames = () => {
    return Object.entries(LANGUAGES).map(([key, lang]) => ({
      key,
      name: lang.name,
      nativeName: lang.nativeName,
      code: lang.code,
    }));
  };

  // Toggle auto-detect feature
  const toggleAutoDetect = () => {
    dispatch({ type: LANGUAGE_TYPES.TOGGLE_AUTO_DETECT });
    const newState = !state.autoDetect;
    localStorage.setItem('auto_detect_language', newState.toString());
    
    toast.success(`Auto-detect ${newState ? 'enabled' : 'disabled'}`);
  };

  // Get current language info
  const getCurrentLanguageInfo = () => {
    return LANGUAGES[state.currentLanguage];
  };

  // Check if language is supported
  const isLanguageSupported = (languageKey) => {
    return Boolean(LANGUAGES[languageKey]);
  };

  // Clear errors
  const clearError = () => {
    dispatch({ type: LANGUAGE_TYPES.CLEAR_ERROR });
  };

  // Get RTL class for styling
  const getRTLClass = (languageKey = null) => {
    const isRTL = getLanguageDirection(languageKey) === 'rtl';
    return isRTL ? 'rtl' : 'ltr';
  };

  // Context value
  const value = {
    ...state,
    changeLanguage,
    detectLanguage,
    translateText,
    getLanguageDirection,
    getLanguageScript,
    formatText,
    getLanguageNames,
    toggleAutoDetect,
    getCurrentLanguageInfo,
    isLanguageSupported,
    clearError,
    getRTLClass,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Custom hook to use language context
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};

// Export languages constant for external use
export { LANGUAGES };

export default LanguageContext;