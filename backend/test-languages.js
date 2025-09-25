// Test regional language functionality
const LanguageService = require('./services/language.js');

async function testRegionalLanguages() {
  const languageService = new LanguageService();
  
  console.log('🧪 Testing Regional Language Functionality');
  console.log('==========================================');
  
  // Test language detection
  console.log('\n📍 Testing Language Detection:');
  console.log('English:', languageService.detectLanguage('Hello, how are you?'));
  console.log('Hindi:', languageService.detectLanguage('नमस्ते, आप कैसे हैं?'));
  console.log('Marwari:', languageService.detectLanguage('राम राम, आप क्यूं हो?'));
  console.log('Mewadi:', languageService.detectLanguage('नमस्कार, आप कैकर हो?'));
  console.log('Dhundhari:', languageService.detectLanguage('खम्मा घणी, आप कठै सूं हो?'));
  
  // Test translations
  console.log('\n🔄 Testing Translations:');
  
  try {
    // English to regional languages
    const testPhrase = 'How are you today?';
    console.log(`\nOriginal: "${testPhrase}"`);
    
    const toHindi = await languageService.translate(testPhrase, 'english', 'hindi');
    console.log(`Hindi: "${toHindi}"`);
    
    const toMarwari = await languageService.translate(testPhrase, 'english', 'marwari');
    console.log(`Marwari: "${toMarwari}"`);
    
    const toMewadi = await languageService.translate(testPhrase, 'english', 'mewadi');
    console.log(`Mewadi: "${toMewadi}"`);
    
    const toDhundhari = await languageService.translate(testPhrase, 'english', 'dhundhari');
    console.log(`Dhundhari: "${toDhundhari}"`);
    
    // Test regional to English
    console.log('\n🔄 Regional to English:');
    const marwariPhrase = 'आप कठै सूं हो?';
    console.log(`Marwari: "${marwariPhrase}"`);
    const marwariToEnglish = await languageService.translate(marwariPhrase, 'marwari', 'english');
    console.log(`English: "${marwariToEnglish}"`);
    
  } catch (error) {
    console.error('❌ Translation test failed:', error.message);
  }
  
  // Test supported languages
  console.log('\n📋 Supported Languages:');
  const supported = languageService.getSupportedLanguages();
  supported.forEach(lang => {
    console.log(`- ${lang.name} (${lang.native}) [${lang.code}]`);
  });
  
  console.log('\n✅ Regional language tests completed!');
}

// Run the test
testRegionalLanguages().catch(console.error);