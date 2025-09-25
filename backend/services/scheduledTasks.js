const cron = require('node-cron');
const CollegeWebsiteScraper = require('../services/scraper');
const DocumentProcessor = require('../services/documentProcessor');

/**
 * Scheduled Tasks Service
 * Handles automated scraping and processing tasks
 */
class ScheduledTasksService {
  constructor() {
    this.isRunning = false;
    this.lastRunTime = null;
    this.scrapeSchedule = process.env.SCRAPING_SCHEDULE || '0 2 * * *'; // Daily at 2 AM
  }

  /**
   * Initialize scheduled tasks
   */
  initialize() {
    console.log('📅 Initializing scheduled tasks...');
    
    // Daily scraping task
    cron.schedule(this.scrapeSchedule, async () => {
      console.log('🕐 Running scheduled scraping task...');
      await this.runScheduledScraping();
    });

    // Weekly deep cleaning task (Sundays at 3 AM)
    cron.schedule('0 3 * * 0', async () => {
      console.log('🧹 Running weekly cleanup task...');
      await this.runWeeklyCleanup();
    });

    // Hourly document processing task
    cron.schedule('0 * * * *', async () => {
      console.log('⚙️ Running document processing task...');
      await this.processPendingDocuments();
    });

    console.log('✅ Scheduled tasks initialized');
    console.log(`📅 Scraping scheduled for: ${this.scrapeSchedule}`);
  }

  /**
   * Run scheduled scraping
   */
  async runScheduledScraping() {
    if (this.isRunning) {
      console.log('⚠️ Scraping already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();

    try {
      const scraper = new CollegeWebsiteScraper();
      const results = await scraper.runFullScrape();
      
      console.log('📊 Scheduled scraping results:', {
        mainPages: results.mainPages.length,
        faqs: results.faqs.length,
        pdfs: results.pdfs.length,
        announcements: results.announcements.length,
        total: results.mainPages.length + results.faqs.length + results.pdfs.length + results.announcements.length
      });

      // Process the scraped documents
      await this.processNewDocuments();

    } catch (error) {
      console.error('❌ Scheduled scraping failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Process pending documents
   */
  async processPendingDocuments() {
    try {
      const processor = new DocumentProcessor();
      await processor.processPendingDocuments();
    } catch (error) {
      console.error('❌ Document processing failed:', error);
    }
  }

  /**
   * Process newly scraped documents
   */
  async processNewDocuments() {
    try {
      const processor = new DocumentProcessor();
      
      // Process documents that need chunking and embedding
      await processor.processNewDocuments();
      
      console.log('✅ New documents processed successfully');
    } catch (error) {
      console.error('❌ New document processing failed:', error);
    }
  }

  /**
   * Run weekly cleanup tasks
   */
  async runWeeklyCleanup() {
    try {
      console.log('🧹 Starting weekly cleanup...');
      
      const Document = require('../models/Document');
      const Conversation = require('../models/Conversation');
      
      // Archive old conversations (older than 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const archivedConversations = await Conversation.updateMany(
        { 
          lastActivity: { $lt: thirtyDaysAgo },
          status: { $ne: 'waiting_admin' }
        },
        { status: 'closed' }
      );
      
      console.log(`📂 Archived ${archivedConversations.modifiedCount} old conversations`);
      
      // Remove failed documents (older than 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const removedDocuments = await Document.deleteMany({
        status: 'failed',
        createdAt: { $lt: sevenDaysAgo }
      });
      
      console.log(`🗑️ Removed ${removedDocuments.deletedCount} failed documents`);
      
      // Update document statistics
      await this.updateDocumentStatistics();
      
      console.log('✅ Weekly cleanup completed');
      
    } catch (error) {
      console.error('❌ Weekly cleanup failed:', error);
    }
  }

  /**
   * Update document statistics
   */
  async updateDocumentStatistics() {
    try {
      const Document = require('../models/Document');
      
      const stats = await Document.aggregate([
        {
          $group: {
            _id: null,
            totalDocuments: { $sum: 1 },
            totalWords: { $sum: '$metadata.wordCount' },
            totalChunks: { $sum: '$metadata.chunkCount' },
            averageWordsPerDocument: { $avg: '$metadata.wordCount' }
          }
        }
      ]);
      
      console.log('📊 Document Statistics:', stats[0]);
      
    } catch (error) {
      console.error('❌ Failed to update document statistics:', error);
    }
  }

  /**
   * Get task status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      scrapeSchedule: this.scrapeSchedule,
      nextRun: this.getNextRunTime()
    };
  }

  /**
   * Get next scheduled run time
   */
  getNextRunTime() {
    // This is a simplified calculation
    // In a real implementation, you'd use a proper cron parser
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Manual scraping trigger
   */
  async runManualScraping() {
    console.log('🚀 Running manual scraping...');
    await this.runScheduledScraping();
  }
}

// Create and export singleton instance
const scheduledTasks = new ScheduledTasksService();

module.exports = scheduledTasks;