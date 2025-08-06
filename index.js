// index.js - Clean Scalable API System
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();

// Security and performance middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// MongoDB Connection
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Start cron jobs after database connection is established
  const { updateSubscriptions } = require('./cron/subscriptionUpdater');
  updateSubscriptions.start();
  console.log('🕐 Subscription update cron job started');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Import NEW system routes
const subCategoryRoutes = require('./routes/subCategory');
const examRoutes = require('./routes/exam');
const pastQuestionRoutes = require('./routes/questions');
const contentRoutes = require('./routes/content');


// Import REQUIRED legacy routes
const authRoutes = require('./routes/auth/auth');
const jupebQuestionBankRoutes = require('./routes/jupeb/questionBank'); 
const tutorialAndSkillsClassRoutes = require('./routes/tutotial_and_skills/tutorial_skill');
const nightClassRoutes = require('./routes/tutotial_and_skills/nightclass');
const skillupRoutes = require('./routes/tutotial_and_skills/skillup');
const pqVideoClassRoutes = require('./routes/tutotial_and_skills/pastquestionvideo');
const subscriptionRoutes = require('./routes/subscription/subscription');

// NEW SYSTEM API ROUTES
app.use('/api/subcategories', subCategoryRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', pastQuestionRoutes);
app.use('/api/content', contentRoutes);


// REQUIRED LEGACY ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/jupeb/question-bank', jupebQuestionBankRoutes); 
app.use('/api/tutorial-skill/home', tutorialAndSkillsClassRoutes);
app.use('/api/tutorial-skill/nightclass', nightClassRoutes);
app.use('/api/tutorial-skill/skillup', skillupRoutes);
app.use('/api/tutorial-skill/pastquestionvideo', pqVideoClassRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Simple API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'CentraTutor API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'CentraTutor API is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(400).json({
      message: `${field || 'Resource'} already exists`,
      error: 'Duplicate key error'
    });
  }
  
  // Handle MongoDB validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Validation error',
      errors
    });
  }
  
  // Handle MongoDB cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid ${err.path}`,
      error: 'Invalid ID format'
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      message: 'Invalid token',
      error: 'Authentication failed'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Token expired',
      error: 'Please login again'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong'
  });
});

// 404 handler for unmatched routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CentraTutor API v2.0 running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  
  server.close(async () => {
    console.log('📡 HTTP server closed');
    
    try {
      // Stop cron jobs
      const { updateSubscriptions } = require('./cron/subscriptionUpdater');
      updateSubscriptions.stop();
      console.log('⏰ Cron jobs stopped');
      
      // Close database connection
      await mongoose.connection.close();
      console.log('🗄️  Database connection closed');
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after timeout
  setTimeout(() => {
    console.error('⚠️  Force closing after timeout');
    process.exit(1);
  }, 10000);
};

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

module.exports = app;