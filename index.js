// Updated index.js - API only
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');


// Import routes
const authRoutes = require('./routes/auth/auth');
const jambSubjectRoutes = require('./routes/jamb/subject');
const jupebSubjectRoutes = require('./routes/jupeb/subject');
const waecSubjectRoutes = require('./routes/waec/subject');
const jupebQuizRoutes = require('./routes/jupeb/quiz');
const jupebQuestionBankRoutes = require('./routes/jupeb/questionBank'); 
const tutorialAndSkillsClassRoutes = require('./routes/tutotial_and_skills/tutorial_skill');
const nightClassRoutes = require('./routes/tutotial_and_skills/nightclass');
const pqVideoClassRoutes = require('./routes/tutotial_and_skills/pastquestionvideo');
const subscriptionRoutes = require('./routes/subscription/subscription');
const { updateSubscriptions } = require('./cron/subscriptionUpdater');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start cron jobs after database connection is established
    updateSubscriptions.start();
    console.log('Subscription update cron job started - will run daily at midnight');
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/jamb/subject', jambSubjectRoutes);
app.use('/api/jupeb/subject', jupebSubjectRoutes);
app.use('/api/waec/subject', waecSubjectRoutes);
app.use('/api/jupeb/quiz', jupebQuizRoutes);
app.use('/api/jupeb/question-bank', jupebQuestionBankRoutes); 
app.use('/api/tutorial-skill/home', tutorialAndSkillsClassRoutes);
app.use('/api/tutorial-skill/nightclass', nightClassRoutes);
app.use('/api/tutorial-skill/pastquestionvideo', pqVideoClassRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Root API route
app.get('/api', (req, res) => {
  res.send('Centratutor API is running');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Centratutor API is healthy',
    timestamp: new Date().toISOString()
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
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Initiating graceful shutdown...');
  
  // Stop all cron jobs
  console.log('Stopping cron jobs');
  updateSubscriptions.stop();
  
  // Close database connections
  console.log('Closing database connection');
  await mongoose.connection.close();
  
  // Close the server
  server.close(() => {
    console.log('HTTP server closed');
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  });
};

// Listen for termination signals
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown); // SIGTERM is commonly used in Docker/Kubernetes
process.on('SIGUSR2', gracefulShutdown); // For Nodemon restarts

module.exports = app;