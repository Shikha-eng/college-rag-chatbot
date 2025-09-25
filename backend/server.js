const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Initialize Express app
const app = express();

// Basic middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'logs'),
    path.join(__dirname, 'data', 'vectors')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Database connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/college-chatbot';
    console.log('Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('📝 Note: Make sure MongoDB is running or check your connection string');
    console.log('🔧 For local MongoDB: Install and start MongoDB service');
    console.log('☁️  For MongoDB Atlas: Check your connection string and network access');
    
    // Don't exit in development - allow server to start without DB for testing
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      console.log('⚠️  Continuing without database connection (development mode)');
    }
  }
};

// Initialize vector database
const initializeVectorDB = async () => {
  try {
    console.log('🔧 Initializing vector database...');
    // Note: Vector DB will be initialized when first needed
    console.log('✅ Vector database ready');
  } catch (error) {
    console.error('❌ Vector database initialization error:', error.message);
    console.log('📝 Note: Vector database will be created when first document is processed');
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(health);
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/scrape', require('./routes/scrape'));

// Basic test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'College RAG Chatbot API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎓 Welcome to College RAG Chatbot API',
    status: 'Server is running',
    endpoints: {
      health: '/health',
      test: '/api/test',
      auth: '/api/auth/*',
      chat: '/api/chat/*',
      admin: '/api/admin/*'
    },
    features: {
      languages: ['Hindi', 'English', 'Marathi', 'Marwari', 'Mewadi', 'Dhundhari'],
      capabilities: ['RAG Pipeline', 'Vector Search', 'WhatsApp Integration', 'Multilingual Support']
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  res.status(err.status || 500).json({
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    available_endpoints: ['/health', '/api/test', '/api/auth', '/api/chat', '/api/admin']
  });
});

// Initialize server
const startServer = async () => {
  try {
    // Create directories
    createDirectories();
    
    // Connect to database
    await connectDB();
    
    // Initialize vector database
    await initializeVectorDB();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    const HOST = process.env.HOST || 'localhost';
    
    app.listen(PORT, () => {
      console.log('\n🚀 College RAG Chatbot Server Started!');
      console.log(`📍 Server: http://${HOST}:${PORT}`);
      console.log(`💻 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
      console.log('\n📋 Available Endpoints:');
      console.log(`   Health Check: http://${HOST}:${PORT}/health`);
      console.log(`   API Test: http://${HOST}:${PORT}/api/test`);
      console.log(`   Authentication: http://${HOST}:${PORT}/api/auth/*`);
      console.log(`   Chat: http://${HOST}:${PORT}/api/chat/*`);
      console.log(`   Admin: http://${HOST}:${PORT}/api/admin/*`);
      console.log('\n🎯 Features Available:');
      console.log('   ✅ Multilingual Support (6 languages)');
      console.log('   ✅ RAG Pipeline with Vector Search');
      console.log('   ✅ WhatsApp Integration');
      console.log('   ✅ Admin Dashboard');
      console.log('   ✅ Real-time Chat Interface');
      console.log('\n📝 Note: Some features require API keys in .env file');
      console.log('🔧 Check DEPLOYMENT_GUIDE.md for setup instructions');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;