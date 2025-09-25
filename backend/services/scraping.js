const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { URL } = require('url');
const Document = require('../models/Document');
const VectorDatabaseService = require('./vectorDatabase');

/**
 * Web Scraping Service
 * Handles automated content extraction from college websites
 */
class ScrapingService {
  constructor() {
    this.isScrapingActive = false;
    this.lastScrapeTime = null;
    this.queuedUrls = new Set();
    this.scrapedUrls = new Set();
    this.browser = null;
    this.vectorDB = new VectorDatabaseService();
    
    // Configuration
    this.maxDepth = parseInt(process.env.MAX_SCRAPING_DEPTH) || 3;
    this.delayMs = parseInt(process.env.SCRAPING_DELAY) || 1000;
    this.maxConcurrent = 3;
    this.timeout = 30000;
    
    console.log('🕷️  Scraping Service initialized');
  }

  /**
   * Initialize the scraping service
   */
  async initialize() {
    try {
      await this.vectorDB.initialize();
      console.log('✅ Scraping Service ready');
      
      // Start scheduled scraping if enabled
      if (process.env.SCRAPING_ENABLED === 'true') {
        this.schedulePeriodicScraping();
      }
    } catch (error) {
      console.error('❌ Failed to initialize scraping service:', error);
    }
  }

  /**
   * Start scraping process
   */
  async startScraping(urls = [], options = {}) {
    if (this.isScrapingActive) {
      throw new Error('Scraping is already active');
    }

    try {
      console.log('🕷️  Starting scraping process...');
      this.isScrapingActive = true;
      
      // Use provided URLs or default from environment
      const scrapeUrls = urls.length > 0 ? urls : this.getDefaultUrls();
      const maxDepth = options.maxDepth || this.maxDepth;

      // Initialize browser
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      console.log(`📋 Scraping ${scrapeUrls.length} URLs with max depth ${maxDepth}`);

      // Process each URL
      for (const url of scrapeUrls) {
        if (!this.isScrapingActive) break;
        
        await this.scrapeUrlRecursive(url, 0, maxDepth);
        await this.delay(this.delayMs);
      }

      this.lastScrapeTime = new Date();
      console.log(`✅ Scraping completed. Processed ${this.scrapedUrls.size} pages.`);

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Scrape URL recursively
   */
  async scrapeUrlRecursive(url, currentDepth, maxDepth) {
    if (currentDepth > maxDepth || this.scrapedUrls.has(url) || !this.isScrapingActive) {
      return;
    }

    try {
      console.log(`📄 Scraping: ${url} (depth: ${currentDepth})`);
      
      this.scrapedUrls.add(url);
      
      // Create new page
      const page = await this.browser.newPage();
      
      // Set timeout and user agent
      await page.setDefaultTimeout(this.timeout);
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Get page content
      const content = await page.content();
      const title = await page.title();
      
      await page.close();

      // Process content
      const processedData = await this.processPageContent(url, title, content);
      
      if (processedData) {
        // Save to database
        const savedDocument = await this.saveDocument(processedData);
        
        // Add to vector database if save was successful
        if (savedDocument) {
          await this.addToVectorDB(savedDocument);
        }
      }

      // Find links for recursive scraping
      if (currentDepth < maxDepth) {
        const links = this.extractLinks(content, url);
        
        for (const link of links.slice(0, 10)) { // Limit links per page
          if (!this.scrapedUrls.has(link)) {
            await this.scrapeUrlRecursive(link, currentDepth + 1, maxDepth);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Failed to scrape ${url}:`, error.message);
    }
  }

  /**
   * Process page content
   */
  async processPageContent(url, title, html) {
    try {
      const $ = cheerio.load(html);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, .nav, .menu, .sidebar').remove();
      
      // Extract main content
      let content = '';
      
      // Try to find main content areas
      const contentSelectors = [
        'main', '.main', '.content', '.main-content', 
        'article', '.article', '.post', '.page-content',
        '#content', '#main', '.container'
      ];
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0 && element.text().trim().length > 100) {
          content = element.text().trim();
          break;
        }
      }
      
      // If no main content found, use body
      if (!content) {
        content = $('body').text().trim();
      }
      
      // Clean and normalize content
      content = this.cleanContent(content);
      
      if (content.length < 100) {
        console.log(`⚠️  Content too short for ${url}, skipping`);
        return null;
      }

      return {
        sourceUrl: url,
        title: title || 'Untitled',
        content: content,
        metadata: {
          wordCount: content.split(' ').length,
          scrapedAt: new Date()
        },
        contentType: 'text',
        source: 'scraped'
      };

    } catch (error) {
      console.error(`❌ Failed to process content for ${url}:`, error);
      return null;
    }
  }

  /**
   * Clean content text
   */
  cleanContent(text) {
    return text
      .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n')      // Remove empty lines
      .replace(/[^\w\s\.,!?;:()\-]/g, ' ') // Remove special characters except basic punctuation
      .trim();
  }

  /**
   * Extract links from page
   */
  extractLinks(html, baseUrl) {
    const $ = cheerio.load(html);
    const links = new Set();
    const baseUrlObj = new URL(baseUrl);
    
    $('a[href]').each((i, element) => {
      try {
        const href = $(element).attr('href');
        const absoluteUrl = new URL(href, baseUrl).href;
        const urlObj = new URL(absoluteUrl);
        
        // Only include links from same domain
        if (urlObj.hostname === baseUrlObj.hostname) {
          // Skip unwanted file types and fragments
          if (!href.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif|mp4|mp3|zip)$/i) && 
              !href.includes('#') && !href.includes('mailto:')) {
            links.add(absoluteUrl);
          }
        }
      } catch (error) {
        // Invalid URL, skip
      }
    });
    
    return Array.from(links);
  }

  /**
   * Save document to database
   */
  async saveDocument(data) {
    try {
      // Check if document already exists
      const existingDoc = await Document.findOne({ sourceUrl: data.sourceUrl });
      
      if (existingDoc) {
        // Update existing document
        existingDoc.content = data.content;
        existingDoc.title = data.title;
        existingDoc.metadata.wordCount = data.metadata.wordCount;
        existingDoc.metadata.scrapedAt = data.metadata.scrapedAt;
        existingDoc.updatedAt = new Date();
        
        await existingDoc.save();
        console.log(`📝 Updated document: ${data.title}`);
        return existingDoc;
      } else {
        // Create new document
        const doc = new Document(data);
        await doc.save();
        console.log(`💾 Saved new document: ${data.title}`);
        return doc;
      }
    } catch (error) {
      console.error('❌ Failed to save document:', error);
      return null;
    }
  }

  /**
   * Add document to vector database
   */
  async addToVectorDB(savedDocument) {
    try {
      // Use the document ID to process the document through vector database
      await this.vectorDB.processDocument(savedDocument._id);
      console.log(`🔍 Added to vector DB: ${savedDocument.title}`);
    } catch (error) {
      console.error('❌ Failed to add to vector DB:', error);
    }
  }

  /**
   * Stop scraping
   */
  async stopScraping() {
    console.log('⏹️  Stopping scraping process...');
    this.isScrapingActive = false;
    await this.cleanup();
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.isScrapingActive = false;
    
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        console.log('🧹 Browser cleanup completed');
      } catch (error) {
        console.error('❌ Browser cleanup failed:', error);
      }
    }
    
    this.scrapedUrls.clear();
    this.queuedUrls.clear();
  }

  /**
   * Schedule periodic scraping
   */
  schedulePeriodicScraping() {
    const interval = parseInt(process.env.SCRAPING_INTERVAL) || 86400000; // 24 hours
    
    console.log(`📅 Scheduled scraping every ${interval / 3600000} hours`);
    
    setInterval(async () => {
      if (!this.isScrapingActive) {
        try {
          console.log('🕐 Starting scheduled scraping...');
          await this.startScraping();
        } catch (error) {
          console.error('❌ Scheduled scraping failed:', error);
        }
      }
    }, interval);
  }

  /**
   * Get default URLs to scrape
   */
  getDefaultUrls() {
    const urlsString = process.env.SCRAPING_URLS || 'https://example.edu';
    return urlsString.split(',').map(url => url.trim()).filter(url => url);
  }

  /**
   * Test scrape a single URL
   */
  async testScrapeUrl(url) {
    try {
      console.log(`🧪 Testing scrape for: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const processed = await this.processPageContent(url, 'Test Page', response.data);
      
      return {
        success: true,
        url: url,
        title: processed?.title || 'No title',
        contentLength: processed?.content?.length || 0,
        wordCount: processed?.wordCount || 0,
        preview: processed?.content?.substring(0, 200) + '...' || 'No content'
      };

    } catch (error) {
      return {
        success: false,
        url: url,
        error: error.message
      };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isScrapingActive,
      lastScrapeTime: this.lastScrapeTime,
      scrapedUrlsCount: this.scrapedUrls.size,
      queuedUrlsCount: this.queuedUrls.size,
      maxDepth: this.maxDepth,
      delay: this.delayMs
    };
  }

  // Getter methods for route handlers
  getLastScrapeTime() {
    return this.lastScrapeTime;
  }

  async getDocumentCount() {
    try {
      return await Document.countDocuments({ source: 'scraped' });
    } catch (error) {
      return 0;
    }
  }

  getQueuedUrlsCount() {
    return this.queuedUrls.size;
  }

  isRunning() {
    return this.isScrapingActive;
  }

  async getDocuments(options = {}) {
    try {
      const { page = 1, limit = 20, search } = options;
      const skip = (page - 1) * limit;
      
      let query = { source: 'scraped' };
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }
      
      const documents = await Document.find(query)
        .select('title url scrapedAt wordCount')
        .sort({ scrapedAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Document.countDocuments(query);
      
      return {
        documents,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
      
    } catch (error) {
      console.error('Failed to get documents:', error);
      return { documents: [], total: 0, page: 1, totalPages: 0 };
    }
  }

  async deleteDocument(id) {
    try {
      await Document.findByIdAndDelete(id);
      // Also remove from vector DB if possible
      await this.vectorDB.removeDocument(id);
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = ScrapingService;