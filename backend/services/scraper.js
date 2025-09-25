const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const pdf = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');
const Document = require('../backend/models/Document');

/**
 * College Website Scraper Service
 * Handles scraping of web pages, PDFs, and documents from college website
 */
class CollegeWebsiteScraper {
  constructor() {
    this.baseUrl = process.env.COLLEGE_WEBSITE_URL;
    this.scraperOptions = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    this.maxRetries = 3;
    this.delayBetweenRequests = 1000; // 1 second
  }

  /**
   * Initialize the scraper
   */
  async initialize() {
    try {
      console.log('🚀 Initializing College Website Scraper...');
      this.browser = await puppeteer.launch(this.scraperOptions);
      console.log('✅ Scraper initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize scraper:', error);
      throw error;
    }
  }

  /**
   * Close the scraper
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('🔒 Scraper closed');
    }
  }

  /**
   * Scrape main college website pages
   */
  async scrapeMainPages() {
    console.log('📄 Starting main pages scraping...');
    
    const mainPages = [
      { url: '/', title: 'Home Page', contentType: 'general' },
      { url: '/about', title: 'About Us', contentType: 'general' },
      { url: '/academics', title: 'Academics', contentType: 'academic' },
      { url: '/admissions', title: 'Admissions', contentType: 'academic' },
      { url: '/courses', title: 'Courses', contentType: 'academic' },
      { url: '/fees', title: 'Fee Structure', contentType: 'academic' },
      { url: '/hostel', title: 'Hostel Information', contentType: 'general' },
      { url: '/events', title: 'Events', contentType: 'event' },
      { url: '/announcements', title: 'Announcements', contentType: 'announcement' },
      { url: '/contact', title: 'Contact Us', contentType: 'contact' },
      { url: '/faculty', title: 'Faculty', contentType: 'general' },
      { url: '/library', title: 'Library', contentType: 'general' },
      { url: '/placement', title: 'Placements', contentType: 'academic' },
      { url: '/examination', title: 'Examinations', contentType: 'academic' },
      { url: '/results', title: 'Results', contentType: 'academic' }
    ];

    const scrapedPages = [];

    for (const pageInfo of mainPages) {
      try {
        const fullUrl = `${this.baseUrl}${pageInfo.url}`;
        console.log(`🔍 Scraping: ${pageInfo.title} - ${fullUrl}`);
        
        const content = await this.scrapePage(fullUrl);
        
        if (content && content.trim().length > 100) {
          const document = await this.saveDocument({
            title: pageInfo.title,
            content: content,
            source: 'scraped',
            sourceUrl: fullUrl,
            contentType: pageInfo.contentType,
            fileType: 'webpage'
          });
          
          scrapedPages.push(document);
          console.log(`✅ Saved: ${pageInfo.title}`);
        } else {
          console.log(`⚠️ Skipped: ${pageInfo.title} - Content too short or empty`);
        }
        
        // Delay between requests
        await this.delay(this.delayBetweenRequests);
        
      } catch (error) {
        console.error(`❌ Failed to scrape ${pageInfo.title}:`, error.message);
      }
    }

    console.log(`📊 Main pages scraping completed. Scraped ${scrapedPages.length} pages.`);
    return scrapedPages;
  }

  /**
   * Scrape a single web page
   */
  async scrapePage(url, retries = 0) {
    try {
      const page = await this.browser.newPage();
      
      // Set user agent to avoid blocking
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      // Navigate to page
      await page.goto(url, { 
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Extract text content
      const content = await page.evaluate(() => {
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style');
        scripts.forEach(el => el.remove());
        
        // Get main content areas
        const contentSelectors = [
          'main',
          '.content',
          '.main-content',
          '#content',
          '.post-content',
          '.page-content',
          'article',
          '.container'
        ];
        
        let mainContent = '';
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            mainContent = element.innerText || element.textContent || '';
            break;
          }
        }
        
        // Fallback to body if no main content found
        if (!mainContent.trim()) {
          mainContent = document.body.innerText || document.body.textContent || '';
        }
        
        // Clean up the content
        return mainContent
          .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
          .replace(/\n\s*\n/g, '\n')  // Remove empty lines
          .trim();
      });

      await page.close();
      return content;

    } catch (error) {
      if (retries < this.maxRetries) {
        console.log(`⚠️ Retrying ${url} (${retries + 1}/${this.maxRetries})`);
        await this.delay(2000);
        return this.scrapePage(url, retries + 1);
      }
      throw error;
    }
  }

  /**
   * Scrape FAQs from the website
   */
  async scrapeFAQs() {
    console.log('❓ Scraping FAQs...');
    
    const faqUrls = [
      '/faq',
      '/help',
      '/support',
      '/frequently-asked-questions'
    ];

    const faqDocuments = [];

    for (const url of faqUrls) {
      try {
        const fullUrl = `${this.baseUrl}${url}`;
        const page = await this.browser.newPage();
        await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Extract FAQ content with structure
        const faqContent = await page.evaluate(() => {
          const faqSelectors = [
            '.faq-item',
            '.qa-item',
            '.question-answer',
            '.accordion-item'
          ];
          
          let faqs = [];
          
          for (const selector of faqSelectors) {
            const items = document.querySelectorAll(selector);
            if (items.length > 0) {
              items.forEach(item => {
                const question = item.querySelector('.question, .faq-question, h3, h4')?.textContent?.trim();
                const answer = item.querySelector('.answer, .faq-answer, p')?.textContent?.trim();
                
                if (question && answer) {
                  faqs.push(`Q: ${question}\nA: ${answer}`);
                }
              });
              break;
            }
          }
          
          return faqs.join('\n\n');
        });

        await page.close();

        if (faqContent && faqContent.length > 100) {
          const document = await this.saveDocument({
            title: 'Frequently Asked Questions',
            content: faqContent,
            source: 'scraped',
            sourceUrl: fullUrl,
            contentType: 'faq',
            fileType: 'webpage'
          });
          
          faqDocuments.push(document);
          console.log(`✅ Scraped FAQs from ${url}`);
        }

      } catch (error) {
        console.log(`⚠️ No FAQs found at ${url}`);
      }
    }

    return faqDocuments;
  }

  /**
   * Find and scrape PDF documents
   */
  async scrapePDFs() {
    console.log('📄 Finding and scraping PDFs...');
    
    try {
      const page = await this.browser.newPage();
      await page.goto(this.baseUrl, { waitUntil: 'networkidle0' });

      // Find all PDF links
      const pdfLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a[href$=".pdf"]'));
        return links.map(link => ({
          url: link.href,
          title: link.textContent?.trim() || link.title || 'PDF Document'
        }));
      });

      await page.close();

      console.log(`📋 Found ${pdfLinks.length} PDF documents`);

      const pdfDocuments = [];

      for (const pdfInfo of pdfLinks.slice(0, 10)) { // Limit to 10 PDFs
        try {
          console.log(`📄 Processing PDF: ${pdfInfo.title}`);
          
          const pdfContent = await this.extractPDFContent(pdfInfo.url);
          
          if (pdfContent && pdfContent.length > 100) {
            const document = await this.saveDocument({
              title: pdfInfo.title,
              content: pdfContent,
              source: 'scraped',
              sourceUrl: pdfInfo.url,
              contentType: 'policy',
              fileType: 'pdf'
            });
            
            pdfDocuments.push(document);
            console.log(`✅ Processed PDF: ${pdfInfo.title}`);
          }

        } catch (error) {
          console.error(`❌ Failed to process PDF ${pdfInfo.title}:`, error.message);
        }
      }

      return pdfDocuments;

    } catch (error) {
      console.error('❌ PDF scraping failed:', error);
      return [];
    }
  }

  /**
   * Extract text content from PDF URL
   */
  async extractPDFContent(pdfUrl) {
    try {
      const response = await axios.get(pdfUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      const pdfBuffer = Buffer.from(response.data);
      const data = await pdf(pdfBuffer);
      
      return data.text
        .replace(/\s+/g, ' ')
        .trim();

    } catch (error) {
      console.error(`Failed to extract PDF content from ${pdfUrl}:`, error.message);
      throw error;
    }
  }

  /**
   * Scrape news and announcements
   */
  async scrapeAnnouncements() {
    console.log('📢 Scraping announcements and news...');
    
    const announcementUrls = [
      '/news',
      '/announcements',
      '/notices',
      '/updates',
      '/latest-news'
    ];

    const announcements = [];

    for (const url of announcementUrls) {
      try {
        const fullUrl = `${this.baseUrl}${url}`;
        const page = await this.browser.newPage();
        await page.goto(fullUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Extract announcement items
        const announcementItems = await page.evaluate(() => {
          const selectors = [
            '.announcement-item',
            '.news-item',
            '.notice-item',
            '.post',
            'article'
          ];
          
          let items = [];
          
          for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              elements.forEach((el, index) => {
                if (index < 20) { // Limit to 20 items
                  const title = el.querySelector('h1, h2, h3, h4, .title')?.textContent?.trim();
                  const content = el.textContent?.trim();
                  const date = el.querySelector('.date, time')?.textContent?.trim();
                  
                  if (title && content && content.length > 50) {
                    items.push({
                      title: title,
                      content: content,
                      date: date || new Date().toISOString()
                    });
                  }
                }
              });
              break;
            }
          }
          
          return items;
        });

        await page.close();

        for (const item of announcementItems) {
          const document = await this.saveDocument({
            title: item.title,
            content: item.content,
            source: 'scraped',
            sourceUrl: fullUrl,
            contentType: 'announcement',
            fileType: 'webpage'
          });
          
          announcements.push(document);
        }

        console.log(`✅ Scraped ${announcementItems.length} announcements from ${url}`);

      } catch (error) {
        console.log(`⚠️ No announcements found at ${url}`);
      }
    }

    return announcements;
  }

  /**
   * Save document to database
   */
  async saveDocument(documentData) {
    try {
      // Check if document already exists
      const existing = await Document.findOne({
        sourceUrl: documentData.sourceUrl,
        title: documentData.title
      });

      if (existing) {
        // Update existing document
        existing.content = documentData.content;
        existing.updatedAt = new Date();
        existing.metadata.lastScrapedAt = new Date();
        existing.status = 'pending';
        existing.needsReprocessing = true;
        
        await existing.save();
        return existing;
      } else {
        // Create new document
        const document = new Document({
          ...documentData,
          status: 'pending',
          metadata: {
            scrapedAt: new Date(),
            lastScrapedAt: new Date()
          }
        });
        
        await document.save();
        return document;
      }
    } catch (error) {
      console.error('Failed to save document:', error);
      throw error;
    }
  }

  /**
   * Run full scraping process
   */
  async runFullScrape() {
    console.log('🚀 Starting full college website scrape...');
    
    await this.initialize();
    
    try {
      const results = {
        mainPages: [],
        faqs: [],
        pdfs: [],
        announcements: []
      };

      // Scrape main pages
      results.mainPages = await this.scrapeMainPages();
      
      // Scrape FAQs
      results.faqs = await this.scrapeFAQs();
      
      // Scrape PDFs
      results.pdfs = await this.scrapePDFs();
      
      // Scrape announcements
      results.announcements = await this.scrapeAnnouncements();

      console.log('📊 Scraping completed successfully!');
      console.log(`Total documents scraped: ${
        results.mainPages.length + 
        results.faqs.length + 
        results.pdfs.length + 
        results.announcements.length
      }`);

      return results;

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      throw error;
    } finally {
      await this.close();
    }
  }

  /**
   * Utility function for delays
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CollegeWebsiteScraper;