// File: cron/subscriptionUpdater.js

const cron = require('node-cron');
const Subscription = require('../models/subscription/subscription');

// Cron job to cleanup expired subscriptions (runs at midnight every day)
const cleanupExpiredSubscriptions = cron.schedule('0 0 * * *', async () => {
  try {
    console.log('Running daily subscription cleanup');
    
    // Find all subscriptions that should be deactivated
    const expiredSubscriptions = await Subscription.find({ 
      active: true,
      expiresAt: { $lt: new Date() }
    });
    
    let deactivatedCount = 0;
    
    for (const subscription of expiredSubscriptions) {
      subscription.active = false;
      await subscription.save();
      deactivatedCount++;
    }
    
    console.log(`Deactivated ${deactivatedCount} expired subscriptions`);
    
    // Optional: Log subscription statistics
    const activeCount = await Subscription.countDocuments({ active: true });
    const totalCount = await Subscription.countDocuments();
    
    console.log(`Subscription stats: ${activeCount} active, ${totalCount} total`);
    
  } catch (error) {
    console.error('Error during subscription cleanup:', error);
  }
}, {
  scheduled: false, // Set to false so we can control when to start
  timezone: "Africa/Lagos" // Nigeria timezone
});


const hourlySubscriptionCheck = cron.schedule('0 * * * *', async () => {
  try {
    // Update any subscriptions that have expired in the last hour
    const result = await Subscription.updateMany(
      { 
        active: true,
        expiresAt: { $lt: new Date() }
      },
      { 
        active: false 
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Hourly check: Deactivated ${result.modifiedCount} expired subscriptions`);
    }
  } catch (error) {
    console.error('Error during hourly subscription check:', error);
  }
}, {
  scheduled: false, // Set to false so we can control when to start
  timezone: "Africa/Lagos"
});


// Create the updateSubscriptions object that your index.js expects
const updateSubscriptions = {
  start: () => {
    try {
      console.log('Starting subscription cron jobs...');
      cleanupExpiredSubscriptions.start();
      hourlySubscriptionCheck.start();
      console.log('✅ Subscription cron jobs started successfully');
    } catch (error) {
      console.error('❌ Error starting subscription cron jobs:', error);
    }
  },
  
  stop: () => {
    try {
      console.log('Stopping subscription cron jobs...');
      cleanupExpiredSubscriptions.stop();
      hourlySubscriptionCheck.stop();
      console.log('✅ Subscription cron jobs stopped successfully');
    } catch (error) {
      console.error('❌ Error stopping subscription cron jobs:', error);
    }
  },
  
  // Expose individual jobs for manual control if needed
  dailyCleanup: cleanupExpiredSubscriptions,
  hourlyCheck: hourlySubscriptionCheck
};

// Export both the object your index.js expects and individual functions
module.exports = { 
  updateSubscriptions,           // <-- This is what your index.js needs
  cleanupExpiredSubscriptions, 
  hourlySubscriptionCheck 
}; 