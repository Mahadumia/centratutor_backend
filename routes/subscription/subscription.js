// File: routes/subscriptionRoutes.js - COMPLETE UPDATED FILE
const express = require('express');
const router = express.Router();
const Subscription = require('../../models/subscription/subscription');
const ActivationCode = require('../../models/subscription/activation_code');
const User = require('../../models/user/user');
const auth = require('../../middleware/auth');
const adminCheck = require('../../middleware/adminCheck');
const SecureCodeGenerator = require('../../utils/SecureCodeGenerator');
const CodeBatch = require('../../models/subscription/code_batch');

// FIXED: code activation with renewal support and plan update
router.post('/activate/code', auth, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;
    
    // Normalize input code (remove hyphens, convert to uppercase)
    const normalizedCode = code.replace(/-/g, '').toUpperCase();
    
    if (normalizedCode.length !== 10) {
      return res.status(400).json({ message: 'Invalid code format' });
    }
    
    // Find the activation code
    const activationCode = await ActivationCode.findOne({ 
      code: normalizedCode 
    }).populate('batchId');
    
    if (!activationCode) {
      return res.status(400).json({ message: 'Invalid activation code' });
    }
    
    if (activationCode.isUsed) {
      return res.status(400).json({ 
        message: 'This code has already been used',
        usedAt: activationCode.usedAt,
        usedBy: activationCode.usedBy
      });
    }

    // Check if batch has expired
    if (activationCode.batchId && activationCode.batchId.expiresAt) {
      if (new Date() > activationCode.batchId.expiresAt) {
        return res.status(400).json({ 
          message: 'This activation code has expired',
          expiredAt: activationCode.batchId.expiresAt
        });
      }
    }
    
    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({ 
      user: userId,
      active: true 
    }).sort({ createdAt: -1 });
    
    // Calculate days to add based on plan
    const daysToAdd = Subscription.getPlanDays(activationCode.plan);
    let subscription;
    
    if (existingSubscription) {
      // FIXED: Update plan when extending subscription
      const currentPlan = existingSubscription.plan;
      const newPlan = activationCode.plan;
      
      console.log(`🔍 SUBSCRIPTION DEBUG: Extending subscription from ${currentPlan} to ${newPlan}`);
      
      // If upgrading from trial (3days) to a paid plan, update the plan
      if (currentPlan === '3days' && newPlan !== '3days') {
        console.log(`🔍 SUBSCRIPTION DEBUG: Upgrading from trial to ${newPlan}`);
        existingSubscription.plan = newPlan;
      }
      // If both are paid plans, keep the longer/better plan
      else if (currentPlan !== '3days' && newPlan !== '3days') {
        const planPriority = { '1year': 4, '6months': 3, '3months': 2, '3days': 1 };
        if (planPriority[newPlan] > planPriority[currentPlan]) {
          console.log(`🔍 SUBSCRIPTION DEBUG: Upgrading plan from ${currentPlan} to ${newPlan}`);
          existingSubscription.plan = newPlan;
        }
      }
      
      // Extend existing subscription using the updated extend method
      subscription = existingSubscription.extend(daysToAdd);
      await subscription.save();
      
      console.log(`🔍 SUBSCRIPTION DEBUG: Subscription extended. New plan: ${subscription.plan}, Total days: ${subscription.totalDays}`);
    } else {
      // Create new subscription with proper dates
      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt);
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);
      
      subscription = new Subscription({
        plan: activationCode.plan, // Use the plan from the activation code
        totalDays: daysToAdd,
        activationMethod: 'code',
        user: userId,
        activatedAt: activatedAt,
        expiresAt: expiresAt,
        active: true
      });
      await subscription.save();
      
      console.log(`🔍 SUBSCRIPTION DEBUG: New subscription created. Plan: ${subscription.plan}, Total days: ${subscription.totalDays}`);
    }
    
    // Mark the code as used
    activationCode.isUsed = true;
    activationCode.usedBy = userId;
    activationCode.usedAt = Date.now();
    await activationCode.save();

    // Update batch statistics
    if (activationCode.batchId) {
      await CodeBatch.findByIdAndUpdate(activationCode.batchId._id, {
        $inc: { codesUsed: 1 }
      });
    }
    
    return res.status(200).json({ 
      message: existingSubscription ? 'Subscription extended successfully' : 'Subscription activated successfully',
      subscription: {
        _id: subscription._id,
        plan: subscription.plan,
        totalDays: subscription.totalDays,
        active: subscription.active,
        activatedAt: subscription.activatedAt,
        expiresAt: subscription.expiresAt,
        daysRemaining: subscription.daysRemaining, // This will use the virtual field
        user: subscription.user,
        activationMethod: subscription.activationMethod,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      },
      codeInfo: {
        plan: activationCode.plan,
        batchName: activationCode.batchName,
        daysAdded: daysToAdd
      }
    });
  } catch (error) {
    console.error('Code activation error:', error);
    return res.status(500).json({ message: 'Internal server error during activation' });
  }
});

// FIXED: payment activation with renewal support and plan update
router.post('/activate/payment', auth, async (req, res) => {
  try {
    const { plan, paymentId } = req.body;
    const userId = req.user.id;
    
    // Here you would verify payment with your payment provider
    const paymentVerified = true; // Replace with actual verification
    
    if (!paymentVerified) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }
    
    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({ 
      user: userId,
      active: true 
    }).sort({ createdAt: -1 });
    
    // Calculate days to add based on plan
    const daysToAdd = Subscription.getPlanDays(plan);
    let subscription;
    
    if (existingSubscription) {
      // FIXED: Update plan when extending subscription
      const currentPlan = existingSubscription.plan;
      const newPlan = plan;
      
      console.log(`🔍 SUBSCRIPTION DEBUG: Extending subscription from ${currentPlan} to ${newPlan}`);
      
      // If upgrading from trial (3days) to a paid plan, update the plan
      if (currentPlan === '3days' && newPlan !== '3days') {
        console.log(`🔍 SUBSCRIPTION DEBUG: Upgrading from trial to ${newPlan}`);
        existingSubscription.plan = newPlan;
      }
      // If both are paid plans, keep the longer/better plan
      else if (currentPlan !== '3days' && newPlan !== '3days') {
        const planPriority = { '1year': 4, '6months': 3, '3months': 2, '3days': 1 };
        if (planPriority[newPlan] > planPriority[currentPlan]) {
          console.log(`🔍 SUBSCRIPTION DEBUG: Upgrading plan from ${currentPlan} to ${newPlan}`);
          existingSubscription.plan = newPlan;
        }
      }
      
      // Extend existing subscription
      subscription = existingSubscription.extend(daysToAdd);
      await subscription.save();
    } else {
      // Create new subscription
      const activatedAt = new Date();
      const expiresAt = new Date(activatedAt);
      expiresAt.setDate(expiresAt.getDate() + daysToAdd);
      
      subscription = new Subscription({
        plan, // Use the new plan from payment
        totalDays: daysToAdd,
        activationMethod: 'payment',
        user: userId,
        activatedAt: activatedAt,
        expiresAt: expiresAt,
        active: true
      });
      await subscription.save();
    }
    
    return res.status(200).json({ 
      message: existingSubscription ? 'Subscription extended successfully' : 'Subscription activated successfully',
      subscription: {
        _id: subscription._id,
        plan: subscription.plan,
        totalDays: subscription.totalDays,
        active: subscription.active,
        activatedAt: subscription.activatedAt,
        expiresAt: subscription.expiresAt,
        daysRemaining: subscription.daysRemaining,
        user: subscription.user,
        activationMethod: subscription.activationMethod,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Generate activation code
router.post('/code/generate', auth, adminCheck, async (req, res) => {
  try {
    const { plan, count = 1, batchName, description, expiresAt } = req.body;
    const adminId = req.user.id;
    
    // Validate count
    if (count <= 0 || count > 10000) {
      return res.status(400).json({ 
        message: 'Count must be between 1 and 10000' 
      });
    }

    // Initialize secure code generator
    const codeGenerator = new SecureCodeGenerator();
    
    // Calculate and check collision probability
    const collisionProbability = codeGenerator.calculateCollisionProbability(count);
    if (collisionProbability > 0.001) {
      return res.status(400).json({
        message: `Batch size too large. Collision probability (${(collisionProbability * 100).toFixed(4)}%) exceeds 0.001% threshold.`,
        suggestion: 'Consider reducing batch size or generating in smaller batches'
      });
    }

    const startTime = Date.now();
    let batch = null;
    
    // Create batch if batchName is provided
    if (batchName) {
      // Check for duplicate batch name for this admin
      const existingBatch = await CodeBatch.findOne({ 
        name: batchName, 
        createdBy: adminId 
      });
      
      if (existingBatch) {
        return res.status(400).json({ 
          message: 'Batch name already exists for this admin' 
        });
      }

      batch = new CodeBatch({
        name: batchName,
        description,
        plan,
        totalCodes: count,
        createdBy: adminId,
        expiresAt: expiresAt ? new Date(expiresAt) : null
      });
      await batch.save();
    }

    const generatedCodes = [];
    const maxAttempts = 5; // Max attempts to handle collisions
    let totalAttempts = 0;
    let collisions = 0;

    for (let i = 0; i < count; i++) {
      let codeCreated = false;
      let attempts = 0;
      
      while (!codeCreated && attempts < maxAttempts) {
        try {
          attempts++;
          totalAttempts++;
          
          // Generate secure code
          const rawCode = codeGenerator.generateSecureCode();
          
          // Verify entropy
          const entropyAnalysis = codeGenerator.verifyEntropy(rawCode);
          
          // Create activation code document
          const codeDoc = new ActivationCode({
            code: rawCode,
            plan,
            createdBy: adminId,
            batchId: batch ? batch._id : null,
            batchName: batchName || null,
            entropyAnalysis,
            generationAttempts: attempts
          });
          
          await codeDoc.save();
          
          // Add formatted version for response
          generatedCodes.push({
            _id: codeDoc._id,
            code: codeDoc.code,
            formattedCode: codeGenerator.formatCodeForDisplay(rawCode),
            plan: codeDoc.plan,
            entropyAnalysis: codeDoc.entropyAnalysis,
            createdAt: codeDoc.createdAt
          });
          
          codeCreated = true;
        } catch (err) {
          if (err.code === 11000) {
            collisions++;
            console.log(`Code collision detected, retrying (attempt ${attempts})...`);
          } else {
            throw err;
          }
        }
      }
      
      if (!codeCreated) {
        // Clean up partial batch if creation failed
        if (batch) {
          await CodeBatch.findByIdAndDelete(batch._id);
        }
        // Clean up any created codes
        await ActivationCode.deleteMany({
          _id: { $in: generatedCodes.map(c => c._id) }
        });
        
        return res.status(500).json({ 
          message: `Failed to generate unique code ${i + 1} after ${maxAttempts} attempts`,
          codesGenerated: i,
          collisions
        });
      }
    }

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // Update batch statistics
    if (batch) {
      const averageAttempts = totalAttempts / count;
      const collisionRate = collisions / totalAttempts;
      
      batch.codesGenerated = count;
      batch.generationStats = {
        averageAttempts,
        collisionRate,
        generationTimeMs: generationTime
      };
      batch.status = 'completed';
      await batch.save();
    }

    return res.status(201).json({ 
      message: `Successfully generated ${count} activation code(s)`,
      codes: generatedCodes,
      batchInfo: batch ? {
        id: batch._id,
        name: batch.name,
        totalCodes: batch.totalCodes
      } : null,
      statistics: {
        totalAttempts,
        collisions,
        collisionRate: collisions / totalAttempts,
        averageAttempts: totalAttempts / count,
        generationTimeMs: generationTime,
        codesPerSecond: count / (generationTime / 1000)
      }
    });
  } catch (error) {
    console.error('Code generation error:', error);
    return res.status(500).json({ 
      message: 'Internal server error during code generation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced subscription status endpoint with comprehensive debugging
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🔍 SUBSCRIPTION DEBUG: Getting subscription for user:', userId);
    console.log('🔍 SUBSCRIPTION DEBUG: User object from auth:', req.user);
    
    // First, let's check if any subscriptions exist for this user (active or not)
    const allUserSubscriptions = await Subscription.find({ user: userId })
      .sort({ createdAt: -1 });
    
    console.log('🔍 SUBSCRIPTION DEBUG: Total subscriptions for user:', allUserSubscriptions.length);
    
    if (allUserSubscriptions.length > 0) {
      console.log('🔍 SUBSCRIPTION DEBUG: All user subscriptions:');
      allUserSubscriptions.forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub._id}, Plan: ${sub.plan}, Active: ${sub.active}, Expires: ${sub.expiresAt}`);
      });
    }
    
    // Now look for active subscription
    const subscription = await Subscription.findOne({ 
      user: userId,
      active: true 
    }).sort({ createdAt: -1 });
    
    if (!subscription) {
      console.log('🔍 SUBSCRIPTION DEBUG: No active subscription found');
      
      // Check if there are any subscriptions at all
      if (allUserSubscriptions.length === 0) {
        console.log('🔍 SUBSCRIPTION DEBUG: User has no subscriptions at all');
      } else {
        console.log('🔍 SUBSCRIPTION DEBUG: User has subscriptions but none are active');
      }
      
      return res.status(404).json({ 
        message: 'No active subscription found',
        debug: {
          userId: userId,
          totalSubscriptions: allUserSubscriptions.length,
          subscriptions: allUserSubscriptions.map(s => ({
            id: s._id,
            plan: s.plan,
            active: s.active,
            expiresAt: s.expiresAt
          }))
        }
      });
    }
    
    console.log('🔍 SUBSCRIPTION DEBUG: Found active subscription:', {
      id: subscription._id,
      plan: subscription.plan,
      active: subscription.active,
      expiresAt: subscription.expiresAt,
      isExpired: subscription.isExpired,
      daysRemaining: subscription.daysRemaining
    });
    
    // Check if subscription has expired and update if necessary
    if (subscription.isExpired) {
      console.log('🔍 SUBSCRIPTION DEBUG: Subscription has expired, deactivating...');
      subscription.active = false;
      await subscription.save();
      return res.status(404).json({ 
        message: 'Subscription has expired',
        debug: {
          subscriptionId: subscription._id,
          expiresAt: subscription.expiresAt,
          currentTime: new Date()
        }
      });
    }
    
    // Return subscription with properly formatted dates
    const responseData = {
      _id: subscription._id,
      plan: subscription.plan,
      totalDays: subscription.totalDays,
      active: subscription.active,
      activatedAt: subscription.activatedAt ? subscription.activatedAt.toISOString() : null,
      expiresAt: subscription.expiresAt ? subscription.expiresAt.toISOString() : null,
      daysRemaining: subscription.daysRemaining, // Uses virtual field
      user: subscription.user,
      activationMethod: subscription.activationMethod,
      createdAt: subscription.createdAt ? subscription.createdAt.toISOString() : null,
      updatedAt: subscription.updatedAt ? subscription.updatedAt.toISOString() : null
    };
    
    console.log('🔍 SUBSCRIPTION DEBUG: Sending response data:', responseData);
    
    return res.status(200).json({ 
      subscription: responseData,
      debug: {
        userId: userId,
        subscriptionFound: true,
        isActive: subscription.active,
        isExpired: subscription.isExpired,
        daysRemaining: subscription.daysRemaining
      }
    });
  } catch (error) {
    console.error('🔍 SUBSCRIPTION DEBUG: Get subscription status error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      debug: {
        error: error.message,
        stack: error.stack
      }
    });
  }
});

// Get code usage details for admin
router.get('/code/usage', auth, adminCheck, async (req, res) => {
  try {
    const codes = await ActivationCode.find({ isUsed: true })
      .populate('usedBy', 'name email')
      .select('code plan usedAt usedBy');
    
    return res.status(200).json({ codes });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get all batches for admin
router.get('/batches', auth, adminCheck, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, plan } = req.query;
    const skip = (page - 1) * limit;

    const filter = { createdBy: req.user.id };
    if (status) filter.status = status;
    if (plan) filter.plan = plan;

    const batches = await CodeBatch.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'name email');

    const total = await CodeBatch.countDocuments(filter);

    return res.status(200).json({
      batches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalBatches: total,
        hasNext: skip + limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get detailed batch information
router.get('/batches/:batchId', auth, adminCheck, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await CodeBatch.findOne({
      _id: batchId,
      createdBy: req.user.id
    }).populate('createdBy', 'name email');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    // Get codes in this batch
    const codes = await ActivationCode.find({ batchId })
      .select('code isUsed usedAt usedBy entropyAnalysis createdAt')
      .populate('usedBy', 'name email')
      .sort({ createdAt: -1 });

    const codeGenerator = new SecureCodeGenerator();
    const formattedCodes = codes.map(code => ({
      ...code.toObject(),
      formattedCode: codeGenerator.formatCodeForDisplay(code.code)
    }));

    return res.status(200).json({
      batch,
      codes: formattedCodes,
      summary: {
        totalCodes: codes.length,
        usedCodes: codes.filter(c => c.isUsed).length,
        unusedCodes: codes.filter(c => !c.isUsed).length,
        usageRate: codes.length > 0 ? (codes.filter(c => c.isUsed).length / codes.length * 100).toFixed(2) : 0
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;