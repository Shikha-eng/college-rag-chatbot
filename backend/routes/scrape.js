const express = require('express');
const router = express.Router();
const ScrapingService = require('../services/scraping');

// Initialize scraping service
const scrapingService = new ScrapingService();

/**
 * @route GET /api/scrape/status
 * @desc Get scraping service status
 * @access Public (for demo purposes)
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      enabled: process.env.SCRAPING_ENABLED === 'true',
      lastScrapeTime: scrapingService.getLastScrapeTime(),
      totalDocuments: await scrapingService.getDocumentCount(),
      queuedUrls: scrapingService.getQueuedUrlsCount(),
      isRunning: scrapingService.isRunning()
    };

    res.json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Error getting scrape status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scraping status'
    });
  }
});

/**
 * @route POST /api/scrape/start
 * @desc Start manual scraping process
 * @access Private (Admin only)
 */
router.post('/start', async (req, res) => {
  try {
    const { urls, maxDepth } = req.body || {};
    if (urls && !Array.isArray(urls)) {
      return res.status(400).json({ success: false, error: 'urls must be an array' });
    }
    if (urls && urls.some(u => typeof u !== 'string' || !/^https?:\/\//i.test(u))) {
      return res.status(400).json({ success: false, error: 'Each URL must be a valid http(s) URL string' });
    }
    if (maxDepth && (isNaN(maxDepth) || maxDepth < 1 || maxDepth > 5)) {
      return res.status(400).json({ success: false, error: 'maxDepth must be between 1 and 5' });
    }

    // Check if already running
    if (scrapingService.isRunning()) {
      return res.status(409).json({
        success: false,
        error: 'Scraping is already in progress'
      });
    }

    // Use provided URLs or default ones
    const scrapeUrls = urls || process.env.SCRAPING_URLS?.split(',') || ['https://eng.rizvi.edu.in/'];
    const depth = maxDepth || 2;

    // Start scraping (non-blocking)
    scrapingService.startScraping(scrapeUrls, { maxDepth: depth });

    res.json({
      success: true,
      message: 'Scraping started',
      urls: scrapeUrls,
      maxDepth: depth
    });

  } catch (error) {
    console.error('Error starting scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scraping'
    });
  }
});

/**
 * @route POST /api/scrape/stop
 * @desc Stop scraping process
 * @access Private (Admin only)
 */
router.post('/stop', async (req, res) => {
  try {
    await scrapingService.stopScraping();

    res.json({
      success: true,
      message: 'Scraping stopped'
    });

  } catch (error) {
    console.error('Error stopping scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scraping'
    });
  }
});

/**
 * @route GET /api/scrape/documents
 * @desc Get scraped documents
 * @access Private (Admin only)
 */
router.get('/documents', async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    
    const documents = await scrapingService.getDocuments({
      page: parseInt(page),
      limit: parseInt(limit),
      search: search
    });

    res.json({
      success: true,
      documents: documents
    });

  } catch (error) {
    console.error('Error getting documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get documents'
    });
  }
});

/**
 * @route DELETE /api/scrape/documents/:id
 * @desc Delete specific document
 * @access Private (Admin only)
 */
router.delete('/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await scrapingService.deleteDocument(id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document'
    });
  }
});

/**
 * @route POST /api/scrape/test
 * @desc Test scraping a single URL (for development)
 * @access Public (for demo)
 */
router.post('/test', async (req, res) => {
  try {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ success: false, error: 'Valid URL is required' });
    }
    
    const result = await scrapingService.testScrapeUrl(url);

    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Error testing URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test URL scraping',
      details: error.message
    });
  }
});

/**
 * Error handling middleware
 */
router.use((error, req, res, next) => {
  console.error('Scraping route error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error in scraping service'
  });
});

module.exports = router;