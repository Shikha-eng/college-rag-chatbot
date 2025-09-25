#!/usr/bin/env node

/**
 * Manual Scraper Script
 * Run this script to manually scrape the college website
 * Usage: node scripts/scraper.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const CollegeWebsiteScraper = require('../backend/services/scraper');
const DocumentProcessor = require('../backend/services/documentProcessor');

async function runManualScraping() {
  console.log('🚀 Starting manual scraping process...');
  
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/college-rag-chatbot');
    console.log('✅ Connected to MongoDB');

    // Initialize and run scraper
    const scraper = new CollegeWebsiteScraper();
    const results = await scraper.runFullScrape();

    console.log('📊 Scraping Results:');
    console.log(`- Main pages: ${results.mainPages.length}`);
    console.log(`- FAQs: ${results.faqs.length}`);
    console.log(`- PDFs: ${results.pdfs.length}`);
    console.log(`- Announcements: ${results.announcements.length}`);
    console.log(`- Total: ${results.mainPages.length + results.faqs.length + results.pdfs.length + results.announcements.length}`);

    // Process the scraped documents
    console.log('⚙️ Processing scraped documents...');
    const processor = new DocumentProcessor();
    await processor.processNewDocuments();

    console.log('✅ Manual scraping completed successfully!');

  } catch (error) {
    console.error('❌ Manual scraping failed:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'full':
    runManualScraping();
    break;
  case 'test':
    console.log('🧪 Running scraper test...');
    testScraper();
    break;
  default:
    console.log('📖 Usage:');
    console.log('  node scripts/scraper.js full    # Run full scraping');
    console.log('  node scripts/scraper.js test    # Test scraper');
    break;
}

async function testScraper() {
  try {
    const scraper = new CollegeWebsiteScraper();
    await scraper.initialize();
    
    console.log('✅ Scraper initialized successfully');
    console.log(`🌐 Base URL: ${scraper.baseUrl}`);
    
    await scraper.close();
    console.log('✅ Scraper test completed');
    
  } catch (error) {
    console.error('❌ Scraper test failed:', error);
  }
}